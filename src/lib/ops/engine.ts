import type { GuestStatus, Prisma, VehicleStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { recordAudit, recordStatus } from "@/lib/ops/audit";
import {
  canTransitionGuest,
  canTransitionMovement,
  canTransitionVehicle,
  guestTimestampField,
} from "@/lib/ops/status";
import { getMapsProvider } from "@/lib/providers/maps";
import { getSmsProvider } from "@/lib/providers/sms";
import { publishOps } from "@/lib/realtime";
import { minutesBetween } from "@/lib/utils";

type Actor = { id: string; role: string };

async function assertGuestTransition(
  from: GuestStatus,
  to: GuestStatus,
  override: boolean,
  reason?: string,
) {
  if (!canTransitionGuest(from, to, override)) {
    throw Object.assign(new Error(`Guest cannot move from ${from} to ${to}`), { status: 409 });
  }
  if (override && from !== to && !reason) {
    throw Object.assign(new Error("Status corrections require a reason"), { status: 400 });
  }
}

export async function setGuestStatus(opts: {
  guestId: string;
  to: GuestStatus;
  actor: Actor;
  reason?: string;
  override?: boolean;
  extra?: Prisma.GuestUpdateInput;
}) {
  const guest = await db.guest.findUnique({ where: { id: opts.guestId } });
  if (!guest || guest.deletedAt) throw Object.assign(new Error("Guest not found"), { status: 404 });
  await assertGuestTransition(guest.status, opts.to, Boolean(opts.override), opts.reason);
  const stamp = guestTimestampField(opts.to);
  const data: Prisma.GuestUpdateInput = {
    status: opts.to,
    ...opts.extra,
  };
  if (stamp && !guest[stamp as keyof typeof guest]) {
    (data as Record<string, unknown>)[stamp] = new Date();
  }
  const updated = await db.guest.update({ where: { id: guest.id }, data });
  await recordStatus({
    entityType: "GUEST",
    entityId: guest.id,
    fromStatus: guest.status,
    toStatus: opts.to,
    actorId: opts.actor.id,
    reason: opts.reason,
    eventId: guest.eventId,
  });
  await recordAudit({
    action: opts.override ? "guest.status_override" : "guest.status",
    entityType: "GUEST",
    entityId: guest.id,
    actorId: opts.actor.id,
    before: { status: guest.status },
    after: { status: opts.to },
    reason: opts.reason,
    eventId: guest.eventId,
  });
  publishOps({ type: "guest", eventId: guest.eventId, entityType: "GUEST", entityId: guest.id });
  return updated;
}

export async function checkInParty(opts: {
  guestId: string;
  includeParty: boolean;
  actor: Actor;
}) {
  const guest = await db.guest.findUnique({ where: { id: opts.guestId } });
  if (!guest) throw Object.assign(new Error("Guest not found"), { status: 404 });
  const members = opts.includeParty && guest.partyCode
    ? await db.guest.findMany({
        where: {
          eventId: guest.eventId,
          partyCode: guest.partyCode,
          deletedAt: null,
          status: { in: ["EXPECTED", "ARRIVED", "FOUND", "CHECKED_IN", "QUEUED"] },
        },
      })
    : [guest];
  const checkInMembers = members.length ? members : [guest];

  const results = [];
  for (const member of checkInMembers) {
    if (member.status === "EXPECTED" || member.status === "ARRIVED") {
      await setGuestStatus({ guestId: member.id, to: "FOUND", actor: opts.actor });
    }
    const current = await db.guest.findUniqueOrThrow({ where: { id: member.id } });
    if (current.status === "FOUND") {
      results.push(await setGuestStatus({ guestId: member.id, to: "CHECKED_IN", actor: opts.actor }));
    } else {
      results.push(current);
    }
  }
  return results;
}

export async function queueParty(opts: {
  guestId: string;
  includeParty: boolean;
  actor: Actor;
}) {
  const guest = await db.guest.findUnique({ where: { id: opts.guestId } });
  if (!guest) throw Object.assign(new Error("Guest not found"), { status: 404 });
  const members = opts.includeParty && guest.partyCode
    ? await db.guest.findMany({
        where: {
          eventId: guest.eventId,
          partyCode: guest.partyCode,
          deletedAt: null,
          status: { in: ["EXPECTED", "ARRIVED", "FOUND", "CHECKED_IN", "QUEUED"] },
        },
      })
    : [guest];
  const queueMembers = members.length ? members : [guest];

  const results = [];
  for (const member of queueMembers) {
    if (["EXPECTED", "ARRIVED"].includes(member.status)) {
      await setGuestStatus({ guestId: member.id, to: "FOUND", actor: opts.actor });
    }
    const mid = await db.guest.findUniqueOrThrow({ where: { id: member.id } });
    if (mid.status === "FOUND") {
      await setGuestStatus({ guestId: mid.id, to: "CHECKED_IN", actor: opts.actor });
    }
    const ready = await db.guest.findUniqueOrThrow({ where: { id: member.id } });
    if (ready.status === "CHECKED_IN") {
      results.push(await setGuestStatus({ guestId: ready.id, to: "QUEUED", actor: opts.actor }));
    } else {
      results.push(ready);
    }
  }

  const movementId = guest.movementId;
  if (movementId) {
    const movement = await db.movement.findUnique({ where: { id: movementId } });
    if (movement && (movement.status === "PLANNED" || movement.status === "COMPLETED")) {
      await db.movement.update({ where: { id: movementId }, data: { status: "OPEN" } });
      await recordStatus({
        entityType: "MOVEMENT",
        entityId: movementId,
        fromStatus: movement.status,
        toStatus: "OPEN",
        actorId: opts.actor.id,
        eventId: guest.eventId,
      });
    }
  }
  return results;
}

export async function assignGuests(opts: {
  guestIds: string[];
  vehicleId: string;
  driverId: string;
  actor: Actor;
  notes?: string;
}) {
  if (!opts.guestIds.length) {
    throw Object.assign(new Error("Select at least one guest"), { status: 400 });
  }
  const guests = await db.guest.findMany({
    where: { id: { in: opts.guestIds }, deletedAt: null },
  });
  if (guests.length !== opts.guestIds.length) {
    throw Object.assign(new Error("One or more guests were not found"), { status: 404 });
  }
  const vehicle = await db.vehicle.findUnique({ where: { id: opts.vehicleId } });
  const driver = await db.driver.findUnique({
    where: { id: opts.driverId },
    include: { user: true },
  });
  if (!vehicle || vehicle.deletedAt) throw Object.assign(new Error("Vehicle not found"), { status: 404 });
  if (!driver || driver.deletedAt) throw Object.assign(new Error("Driver not found"), { status: 404 });
  if (!["AVAILABLE", "COMPLETED"].includes(vehicle.status)) {
    throw Object.assign(new Error(`Vehicle ${vehicle.fleetNumber} is ${vehicle.status}`), { status: 409 });
  }
  if (!["AVAILABLE", "COMPLETED"].includes(driver.status)) {
    throw Object.assign(new Error(`Driver is ${driver.status}`), { status: 409 });
  }

  const partySize = guests.reduce((n, g) => n + g.partySize, 0);
  if (partySize > vehicle.capacity) {
    throw Object.assign(
      new Error(`Party of ${partySize} exceeds ${vehicle.fleetNumber} capacity ${vehicle.capacity}`),
      { status: 409 },
    );
  }

  const movementId = guests[0].movementId;
  if (!movementId) throw Object.assign(new Error("Guests are not on a movement"), { status: 409 });

  const assignment = await db.$transaction(async (tx) => {
    const created = await tx.assignment.create({
      data: {
        movementId,
        vehicleId: vehicle.id,
        driverId: driver.id,
        assignedById: opts.actor.id,
        notes: opts.notes,
        guests: { create: guests.map((g) => ({ guestId: g.id })) },
      },
    });
    await tx.vehicle.update({
      where: { id: vehicle.id },
      data: { status: "ASSIGNED" },
    });
    await tx.driver.update({
      where: { id: driver.id },
      data: { status: "ASSIGNED", currentVehicleId: vehicle.id },
    });
    const movement = await tx.movement.findUniqueOrThrow({ where: { id: movementId } });
    if (canTransitionMovement(movement.status, "ASSIGNED") || movement.status === "COMPLETED") {
      await tx.movement.update({ where: { id: movementId }, data: { status: "ASSIGNED" } });
      await recordStatus({
        tx,
        entityType: "MOVEMENT",
        entityId: movementId,
        fromStatus: movement.status,
        toStatus: "ASSIGNED",
        actorId: opts.actor.id,
        eventId: guests[0].eventId,
      });
    }
    for (const guest of guests) {
      await tx.guest.update({
        where: { id: guest.id },
        data: { status: "ASSIGNED", assignedAt: guest.assignedAt ?? new Date() },
      });
      await recordStatus({
        tx,
        entityType: "GUEST",
        entityId: guest.id,
        fromStatus: guest.status,
        toStatus: "ASSIGNED",
        actorId: opts.actor.id,
        eventId: guest.eventId,
      });
    }
    await recordStatus({
      tx,
      entityType: "VEHICLE",
      entityId: vehicle.id,
      fromStatus: vehicle.status,
      toStatus: "ASSIGNED",
      actorId: opts.actor.id,
      eventId: guests[0].eventId,
    });
    await recordStatus({
      tx,
      entityType: "DRIVER",
      entityId: driver.id,
      fromStatus: driver.status,
      toStatus: "ASSIGNED",
      actorId: opts.actor.id,
      eventId: guests[0].eventId,
    });
    await recordAudit({
      tx,
      action: "assignment.create",
      entityType: "ASSIGNMENT",
      entityId: created.id,
      actorId: opts.actor.id,
      after: {
        vehicleId: vehicle.id,
        driverId: driver.id,
        guestIds: guests.map((g) => g.id),
      },
      eventId: guests[0].eventId,
    });
    return created;
  });

  const movement = await db.movement.findUnique({
    where: { id: movementId },
    include: { destination: true, origin: true },
  });
  if (driver.phone && movement) {
    await getSmsProvider().send(
      driver.phone,
      `Venture Directors: assigned ${vehicle.fleetNumber} — ${guests.length} guest(s), ${partySize} pax. Pickup ${movement.origin.name} → ${movement.destination.name}.`,
    );
  }

  publishOps({
    type: "assignment",
    eventId: guests[0].eventId,
    entityType: "ASSIGNMENT",
    entityId: assignment.id,
  });
  return assignment;
}

export async function reassignGuests(opts: {
  assignmentId: string;
  vehicleId: string;
  driverId: string;
  actor: Actor;
  reason: string;
}) {
  if (!opts.reason.trim()) {
    throw Object.assign(new Error("Reassignment requires a reason"), { status: 400 });
  }
  const existing = await db.assignment.findUnique({
    where: { id: opts.assignmentId },
    include: { guests: true },
  });
  if (!existing) throw Object.assign(new Error("Assignment not found"), { status: 404 });
  await db.assignment.update({
    where: { id: existing.id },
    data: { status: "REASSIGNED", completedAt: new Date() },
  });
  const oldVehicle = await db.vehicle.findUnique({ where: { id: existing.vehicleId } });
  const oldDriver = await db.driver.findUnique({ where: { id: existing.driverId } });
  if (oldVehicle) {
    await db.vehicle.update({ where: { id: oldVehicle.id }, data: { status: "AVAILABLE" } });
  }
  if (oldDriver) {
    await db.driver.update({
      where: { id: oldDriver.id },
      data: { status: "AVAILABLE", currentVehicleId: null },
    });
  }
  await recordAudit({
    action: "assignment.reassign",
    entityType: "ASSIGNMENT",
    entityId: existing.id,
    actorId: opts.actor.id,
    before: { vehicleId: existing.vehicleId, driverId: existing.driverId },
    after: { vehicleId: opts.vehicleId, driverId: opts.driverId },
    reason: opts.reason,
  });
  return assignGuests({
    guestIds: existing.guests.map((g) => g.guestId),
    vehicleId: opts.vehicleId,
    driverId: opts.driverId,
    actor: opts.actor,
    notes: `Reassigned: ${opts.reason}`,
  });
}

function guestStatusForVehicle(status: VehicleStatus): GuestStatus | null {
  switch (status) {
    case "LOADING":
      return "BOARDED";
    case "IN_SERVICE":
      return "DEPARTED";
    case "COMPLETED":
      return "COMPLETED";
    default:
      return null;
  }
}

function movementStatusForVehicle(status: VehicleStatus) {
  switch (status) {
    case "EN_ROUTE":
    case "STAGED":
    case "ARRIVED":
    case "LOADING":
    case "IN_SERVICE":
      return "ACTIVE" as const;
    case "COMPLETED":
      return "COMPLETED" as const;
    default:
      return null;
  }
}

export async function advanceDriverStatus(opts: {
  driverId?: string;
  vehicleId?: string;
  to: VehicleStatus;
  actor: Actor;
  reason?: string;
  override?: boolean;
}) {
  const driver = opts.driverId
    ? await db.driver.findUnique({ where: { id: opts.driverId }, include: { currentVehicle: true } })
    : await db.driver.findFirst({
        where: { currentVehicleId: opts.vehicleId ?? undefined },
        include: { currentVehicle: true },
      });
  if (!driver) throw Object.assign(new Error("Driver not found"), { status: 404 });
  const vehicle = driver.currentVehicle ?? (opts.vehicleId
    ? await db.vehicle.findUnique({ where: { id: opts.vehicleId } })
    : null);
  if (!vehicle) throw Object.assign(new Error("No vehicle on this driver"), { status: 409 });

  if (!canTransitionVehicle(vehicle.status, opts.to, Boolean(opts.override))) {
    throw Object.assign(new Error(`Vehicle cannot move from ${vehicle.status} to ${opts.to}`), {
      status: 409,
    });
  }
  if (opts.override && !opts.reason) {
    throw Object.assign(new Error("Status corrections require a reason"), { status: 400 });
  }

  const assignment = await db.assignment.findFirst({
    where: { vehicleId: vehicle.id, driverId: driver.id, status: "ACTIVE" },
    include: { guests: { include: { guest: true } }, movement: true },
    orderBy: { assignedAt: "desc" },
  });

  await db.$transaction(async (tx) => {
    await tx.vehicle.update({ where: { id: vehicle.id }, data: { status: opts.to } });
    const driverStatus = opts.to === "COMPLETED" ? "AVAILABLE" : opts.to;
    await tx.driver.update({
      where: { id: driver.id },
      data: {
        status: driverStatus,
        currentVehicleId: opts.to === "COMPLETED" ? null : vehicle.id,
      },
    });
    await recordStatus({
      tx,
      entityType: "VEHICLE",
      entityId: vehicle.id,
      fromStatus: vehicle.status,
      toStatus: opts.to,
      actorId: opts.actor.id,
      reason: opts.reason,
      eventId: assignment?.movement.eventId,
    });
    await recordStatus({
      tx,
      entityType: "DRIVER",
      entityId: driver.id,
      fromStatus: driver.status,
      toStatus: driverStatus,
      actorId: opts.actor.id,
      reason: opts.reason,
      eventId: assignment?.movement.eventId,
    });

    const guestTo = guestStatusForVehicle(opts.to);
    if (assignment && guestTo) {
      for (const link of assignment.guests) {
        const stamp = guestTimestampField(guestTo);
        await tx.guest.update({
          where: { id: link.guestId },
          data: {
            status: guestTo,
            ...(stamp ? { [stamp]: new Date() } : {}),
          },
        });
        await recordStatus({
          tx,
          entityType: "GUEST",
          entityId: link.guestId,
          fromStatus: link.guest.status,
          toStatus: guestTo,
          actorId: opts.actor.id,
          eventId: assignment.movement.eventId,
        });
      }
    }

    const moveTo = assignment ? movementStatusForVehicle(opts.to) : null;
    if (assignment && moveTo && canTransitionMovement(assignment.movement.status, moveTo, true)) {
      await tx.movement.update({ where: { id: assignment.movementId }, data: { status: moveTo } });
      await recordStatus({
        tx,
        entityType: "MOVEMENT",
        entityId: assignment.movementId,
        fromStatus: assignment.movement.status,
        toStatus: moveTo,
        actorId: opts.actor.id,
        eventId: assignment.movement.eventId,
      });
    }

    if (opts.to === "COMPLETED" && assignment) {
      await tx.assignment.update({
        where: { id: assignment.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
      await tx.vehicle.update({ where: { id: vehicle.id }, data: { status: "AVAILABLE" } });
    }

    await recordAudit({
      tx,
      action: opts.override ? "driver.status_override" : "driver.status",
      entityType: "VEHICLE",
      entityId: vehicle.id,
      actorId: opts.actor.id,
      before: { status: vehicle.status },
      after: { status: opts.to },
      reason: opts.reason,
      eventId: assignment?.movement.eventId,
    });
  });

  publishOps({
    type: "driver",
    eventId: assignment?.movement.eventId,
    entityType: "VEHICLE",
    entityId: vehicle.id,
  });
  return { vehicleId: vehicle.id, status: opts.to };
}

export async function refreshExceptions(eventId: string) {
  const event = await db.event.findUnique({
    where: { id: eventId },
    include: { alertConfig: true, guests: { where: { deletedAt: null, status: "QUEUED" } } },
  });
  if (!event || !event.alertConfig?.enabled) return [];

  const alerts = event.alertConfig;
  const now = new Date();
  const created: string[] = [];

  if (event.guests.length >= alerts.queueCapacityAlert) {
    created.push(
      await upsertException(eventId, {
        type: "QUEUE_CAPACITY",
        severity: "WARNING",
        title: `Queue at ${event.guests.length} guests`,
        detail: `Capacity alert threshold is ${alerts.queueCapacityAlert}.`,
      }),
    );
  }

  for (const guest of event.guests) {
    if (!guest.queuedAt) continue;
    const wait = minutesBetween(guest.queuedAt, now);
    const limit = guest.priority === "VIP" ? alerts.vipWaitThresholdMinutes : alerts.waitThresholdMinutes;
    if (wait >= limit) {
      created.push(
        await upsertException(eventId, {
          type: guest.priority === "VIP" ? "VIP_WAIT" : "WAIT_TARGET",
          severity: guest.priority === "VIP" ? "CRITICAL" : "WARNING",
          title: `${guest.firstName} ${guest.lastName} waiting ${wait}m`,
          detail: `Wait target ${limit} minutes exceeded.`,
          guestId: guest.id,
        }),
      );
    }
  }
  return created;
}

async function upsertException(
  eventId: string,
  data: { type: string; severity: string; title: string; detail: string; guestId?: string },
) {
  const existing = await db.exception.findFirst({
    where: {
      eventId,
      type: data.type,
      guestId: data.guestId ?? null,
      status: "OPEN",
    },
  });
  if (existing) return existing.id;
  const row = await db.exception.create({ data: { eventId, ...data } });
  publishOps({ type: "exception", eventId, entityType: "EXCEPTION", entityId: row.id });
  return row.id;
}

export async function loadLiveSnapshot(eventId: string) {
  await refreshExceptions(eventId);
  const event = await db.event.findUnique({
    where: { id: eventId },
    include: {
      client: true,
      alertConfig: true,
      timingPresets: true,
      geofences: { where: { deletedAt: null } },
      locations: { where: { deletedAt: null } },
    },
  });
  if (!event) throw Object.assign(new Error("Event not found"), { status: 404 });

  const [guests, vehicles, drivers, movements, exceptions, audit, assignments] = await Promise.all([
    db.guest.findMany({
      where: { eventId, deletedAt: null },
      orderBy: [{ priority: "asc" }, { queuedAt: "asc" }, { lastName: "asc" }],
    }),
    db.vehicle.findMany({
      where: { eventId, deletedAt: null },
      include: { currentDriver: { include: { user: true } }, operator: true },
      orderBy: { fleetNumber: "asc" },
    }),
    db.driver.findMany({
      where: { deletedAt: null, OR: [{ currentVehicle: { eventId } }, { user: { role: "DRIVER" } }] },
      include: { user: true, currentVehicle: true, operator: true },
    }),
    db.movement.findMany({
      where: { eventId, deletedAt: null },
      include: { origin: true, destination: true, route: true },
    }),
    db.exception.findMany({
      where: { eventId, status: { in: ["OPEN", "ACK"] } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.auditLog.findMany({
      include: { actor: true },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    db.assignment.findMany({
      where: { movement: { eventId }, status: { in: ["ACTIVE", "COMPLETED"] } },
      include: {
        vehicle: true,
        driver: { include: { user: true } },
        guests: { include: { guest: true } },
        assignedBy: true,
        movement: { include: { origin: true, destination: true } },
      },
      orderBy: { assignedAt: "desc" },
      take: 40,
    }),
  ]);

  const queued = guests.filter((g) => g.status === "QUEUED");
  const waits = queued
    .map((g) => (g.queuedAt ? minutesBetween(g.queuedAt) : 0))
    .sort((a, b) => b - a);
  const queue = {
    count: queued.length,
    pax: queued.reduce((n, g) => n + g.partySize, 0),
    longestWait: waits[0] ?? 0,
    avgWait: waits.length ? Math.round(waits.reduce((a, b) => a + b, 0) / waits.length) : 0,
    vipCount: queued.filter((g) => g.priority === "VIP").length,
    assistanceCount: queued.filter((g) => g.priority === "ACCESSIBILITY" || g.status === "NEEDS_ASSISTANCE").length,
    waitTargetMinutes: event.waitTargetMinutes,
  };

  const maps = getMapsProvider();
  const movement = movements[0] ?? null;
  const nav = movement
    ? maps.navigationLinks(
        { lat: movement.origin.lat, lng: movement.origin.lng, label: movement.origin.name },
        { lat: movement.destination.lat, lng: movement.destination.lng, label: movement.destination.name },
      )
    : null;

  return {
    event,
    queue,
    queued,
    guests,
    vehicles,
    drivers,
    movements,
    exceptions,
    audit,
    assignments,
    nav,
    generatedAt: new Date().toISOString(),
  };
}

export async function driverAssignmentView(driverId: string) {
  const assignment = await db.assignment.findFirst({
    where: { driverId, status: "ACTIVE" },
    include: {
      vehicle: true,
      driver: { include: { user: true } },
      guests: { include: { guest: true } },
      movement: { include: { origin: true, destination: true, event: true } },
    },
    orderBy: { assignedAt: "desc" },
  });
  if (!assignment) return null;
  const maps = getMapsProvider();
  const nav = maps.navigationLinks(
    { lat: assignment.movement.origin.lat, lng: assignment.movement.origin.lng, label: assignment.movement.origin.name },
    {
      lat: assignment.movement.destination.lat,
      lng: assignment.movement.destination.lng,
      label: assignment.movement.destination.name,
    },
  );
  return { assignment, nav };
}
