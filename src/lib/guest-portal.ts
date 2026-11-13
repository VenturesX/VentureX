import type { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { openCode, sealCode } from "@/lib/guest-seal";
import { itemVisible, type TripSession } from "@/lib/guest-session";
import { todayET } from "@/lib/light/checkin";
import { displayFlight } from "@/lib/light/posts";
import { buildGuestCard } from "@/lib/guest-card";
import { COMPANY_PHONE } from "@/lib/brand";
import { DEMO_GUEST_PASSES, DEMO_MANAGER_CODE, DEMO_VIP_CODE } from "@/lib/light/demo-portal";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_TRIES = 8;

export function freshCode(digits = false) {
  if (digits) return String(Math.floor(100000 + Math.random() * 900000));
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

export async function tooManyGuestTries(ip: string) {
  const since = new Date(Date.now() - WINDOW_MS);
  const count = await db.guestPortalAttempt.count({ where: { ip, createdAt: { gte: since } } });
  return count >= MAX_TRIES;
}

export async function noteGuestTry(ip: string) {
  await db.guestPortalAttempt.create({ data: { ip } });
  await db.guestPortalAttempt.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } });
}

export async function findProgramByNumber(code: string) {
  const value = code.trim().toUpperCase();
  if (value.length < 2) return null;
  const programs = await db.lightProgram.findMany({ select: { id: true, name: true, code: true, aliases: true } });
  return programs.find((program) => program.code.toUpperCase() === value || program.aliases.split(",").some((alias) => alias.trim().toUpperCase() === value)) ?? null;
}

export async function everyoneGroupId(programId: string) {
  const group = await db.lightGroup.findFirst({ where: { programId, kind: "EVERYONE" } });
  return group?.id ?? "";
}

async function hashCode(code: string) {
  return bcrypt.hash(code.trim().toUpperCase(), 10);
}

export async function openProgramSession(programId: string): Promise<TripSession> {
  const everyone = await everyoneGroupId(programId);
  return { programId, paxId: "", groupIds: everyone ? [everyone] : [], name: "" };
}

export async function applyExtraCode(session: TripSession, code: string) {
  const value = code.trim().toUpperCase();
  const people = await db.lightPax.findMany({
    where: { passHash: { not: "" }, passDate: todayET(), trip: { programId: session.programId } },
    include: { groups: true, trip: true },
  });
  for (const person of people) {
    if (await bcrypt.compare(value, person.passHash)) {
      const groupIds = new Set(session.groupIds);
      person.groups.forEach((row) => groupIds.add(row.groupId));
      const everyone = await everyoneGroupId(session.programId);
      if (everyone) groupIds.add(everyone);
      return {
        ok: true as const,
        session: {
          programId: session.programId,
          paxId: person.id,
          groupIds: [...groupIds],
          name: `${person.firstName} ${person.lastName}`.trim(),
        },
      };
    }
  }
  const groups = await db.lightGroup.findMany({ where: { programId: session.programId, codeHash: { not: "" } } });
  for (const group of groups) {
    if (await bcrypt.compare(value, group.codeHash)) {
      const groupIds = new Set(session.groupIds);
      groupIds.add(group.id);
      return { ok: true as const, session: { ...session, groupIds: [...groupIds] } };
    }
  }
  return { ok: false as const };
}

function flightWord(status: string, gate: string) {
  if (status === "LANDED" && gate) return `At gate ${gate}`;
  if (status === "LANDED") return "Landed";
  if (status === "DELAYED") return "Delayed";
  if (status === "ON_TIME") return "On time";
  if (status === "CANCELLED") return "Canceled";
  return "Scheduled";
}

export async function loadVisibleTrip(session: TripSession) {
  const [program, items, flights, person] = await Promise.all([
    db.lightProgram.findUnique({ where: { id: session.programId } }),
    db.lightScheduleItem.findMany({ where: { programId: session.programId }, include: { groups: { include: { group: true } } }, orderBy: { sortKey: "asc" } }),
    db.lightFlight.findMany({ where: { programId: session.programId } }),
    session.paxId ? db.lightPax.findUnique({ where: { id: session.paxId }, include: { trip: true } }) : Promise.resolve(null),
  ]);
  if (!program) return null;
  const card = buildGuestCard({
    now: new Date(),
    timeZone: program.timezone,
    serviceDate: program.serviceDate,
    windowClose: program.windowClose,
    contact: COMPANY_PHONE,
    moves: items.filter((item) => !item.paxId && (item.groups.length === 0 || item.groups.some((row) => row.group.kind === "EVERYONE"))).map((item) => ({
      kind: item.kind,
      timeLabel: item.timeLabel,
      sortKey: item.sortKey,
      spot: item.spot,
      title: item.title,
      frequency: item.frequency,
      guestVisible: item.guestVisible,
    })),
  });
  const visible = items.filter((item) => item.guestVisible !== false).filter((item) => itemVisible(
    {
      paxId: item.paxId,
      everyone: item.groups.some((row) => row.group.kind === "EVERYONE"),
      groupIds: item.groups.map((row) => row.groupId),
    },
    session,
  ));
  return {
    program: { name: program.name, timezone: program.timezone },
    card,
    updatedAt: new Date().toISOString(),
    guest: person ? `${person.firstName} ${person.lastName}`.trim() : "",
    mine: person ? {
      flight: displayFlight(person.trip.flightCode),
      time: person.trip.scheduledTime,
      vehicle: person.trip.vehicleLabel,
      spot: visible.find((item) => item.paxId === person.id)?.spot || "",
      status: flightWord(flights.find((flight) => flight.flightCode === person.trip.flightCode)?.status || "", flights.find((flight) => flight.flightCode === person.trip.flightCode)?.gate || ""),
    } : null,
    items: visible.map((item) => {
      const flight = flights.find((row) => row.flightCode === item.flightCode);
      return {
        id: item.id,
        title: item.title,
        kind: item.kind,
        timeLabel: item.timeLabel,
        summary: item.summary,
        detail: item.detail,
        spot: item.spot,
        route: item.route,
        frequency: item.frequency,
        flight: item.flightCode ? displayFlight(item.flightCode) : "",
        status: flight ? flightWord(flight.status, flight.gate) : "",
        personal: Boolean(item.paxId),
      };
    }),
  };
}

export async function issuePass(paxId: string, code = freshCode(true)) {
  const today = todayET();
  await db.lightPax.update({
    where: { id: paxId },
    data: { passHash: await hashCode(code), passDate: today, passSeal: sealCode(code) },
  });
  return code;
}

export async function issueGroupCode(groupId: string, code = freshCode(false)) {
  await db.lightGroup.update({
    where: { id: groupId },
    data: { codeHash: await hashCode(code), codeSeal: sealCode(code) },
  });
  return code;
}

export async function guestOffice(programId: string) {
  const [program, groups, items, guests] = await Promise.all([
    db.lightProgram.findUnique({ where: { id: programId } }),
    db.lightGroup.findMany({ where: { programId }, include: { members: true }, orderBy: { sortOrder: "asc" } }),
    db.lightScheduleItem.findMany({ where: { programId }, include: { groups: true }, orderBy: { sortKey: "asc" } }),
    db.lightPax.findMany({ where: { trip: { programId } }, include: { trip: true }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }] }),
  ]);
  if (!program) return null;
  return {
    clientManagesGroups: program.clientManagesGroups,
    groups: groups.map((group) => ({
      id: group.id,
      name: group.name,
      kind: group.kind,
      memberIds: group.members.map((row) => row.paxId),
      code: openCode(group.codeSeal),
    })),
    items: items.map((item) => ({
      id: item.id,
      title: item.title,
      kind: item.kind,
      timeLabel: item.timeLabel,
      summary: item.summary,
      detail: item.detail,
      spot: item.spot,
      route: item.route,
      frequency: item.frequency,
      flightCode: item.flightCode,
      paxId: item.paxId,
      groupIds: item.groups.map((row) => row.groupId),
      guestVisible: item.guestVisible,
    })),
    guests: guests.map((guest) => ({
      id: guest.id,
      name: `${guest.firstName} ${guest.lastName}`.trim(),
      flight: displayFlight(guest.trip.flightCode),
      code: guest.passDate === todayET() ? openCode(guest.passSeal) : "",
    })),
  };
}

export async function ensureGuestPortal(dbClient: PrismaClient) {
  const program = await dbClient.lightProgram.findUnique({ where: { code: "NBCU" } });
  if (!program) return;
  const count = await dbClient.lightGroup.count({ where: { programId: program.id } });
  if (count === 0) {
    const everyone = await dbClient.lightGroup.create({ data: { programId: program.id, name: "Everyone", kind: "EVERYONE", sortOrder: 0 } });
    const vip = await dbClient.lightGroup.create({
      data: { programId: program.id, name: "VIP", kind: "NAMED", sortOrder: 1, codeHash: await hashCode(DEMO_VIP_CODE), codeSeal: sealCode(DEMO_VIP_CODE) },
    });
    const managers = await dbClient.lightGroup.create({
      data: { programId: program.id, name: "Managers", kind: "NAMED", sortOrder: 2, codeHash: await hashCode(DEMO_MANAGER_CODE), codeSeal: sealCode(DEMO_MANAGER_CODE) },
    });
    const trips = await dbClient.lightTrip.findMany({ where: { programId: program.id }, orderBy: { scheduledTime: "asc" } });
    const seen = new Set<string>();
    for (const trip of trips) {
      if (seen.has(trip.flightCode)) continue;
      seen.add(trip.flightCode);
      if (seen.size > 6) break;
      const item = await dbClient.lightScheduleItem.create({
        data: {
          programId: program.id,
          title: `${displayFlight(trip.flightCode)} from ${trip.origin}`,
          kind: "ARRIVAL",
          timeLabel: clockish(trip.scheduledTime),
          sortKey: trip.scheduledTime,
          summary: "Meet at the gate. A director is on the post.",
          detail: trip.notes || "General arrival. Your own ride stays on My Trip.",
          flightCode: trip.flightCode,
        },
      });
      await dbClient.lightItemGroup.create({ data: { itemId: item.id, groupId: everyone.id } });
    }
    const loop = await dbClient.lightScheduleItem.create({
      data: {
        programId: program.id,
        title: "Resort loop",
        kind: "SHUTTLE",
        timeLabel: "All day",
        sortKey: "00:10",
        summary: "About every 20 minutes.",
        detail: "Stay at the marked stop. The next coach is the one you board.",
        route: "Airport · Convention · Resort",
        frequency: "Every 20 minutes",
        spot: "X marks the spot at the signed stop.",
      },
    });
    await dbClient.lightItemGroup.create({ data: { itemId: loop.id, groupId: everyone.id } });
    const dinner = await dbClient.lightScheduleItem.create({
      data: {
        programId: program.id,
        title: "VIP dinner transfer",
        kind: "EVENT",
        timeLabel: "7:00 PM",
        sortKey: "19:00",
        summary: "Cars for the hosted dinner only.",
        detail: "Be in the lobby 10 minutes early. This ride is not on the general schedule.",
        route: "Resort to dinner and back",
        spot: "Lobby, under the X.",
      },
    });
    await dbClient.lightItemGroup.create({ data: { itemId: dinner.id, groupId: vip.id } });
    const huddle = await dbClient.lightScheduleItem.create({
      data: {
        programId: program.id,
        title: "Managers huddle",
        kind: "EVENT",
        timeLabel: "8:00 AM",
        sortKey: "08:00",
        summary: "Closed briefing before the arrivals peak.",
        detail: "Managers only. The general arrival list stays on the main schedule.",
        spot: "Crew room.",
      },
    });
    await dbClient.lightItemGroup.create({ data: { itemId: huddle.id, groupId: managers.id } });
    const people = await dbClient.lightPax.findMany({ where: { trip: { programId: program.id } }, include: { trip: true } });
    for (const demo of DEMO_GUEST_PASSES) {
      const person = people.find((row) => row.firstName === demo.first && row.lastName === demo.last);
      if (!person) continue;
      const group = demo.group === "VIP" ? vip : managers;
      await dbClient.lightGroupMember.create({ data: { groupId: group.id, paxId: person.id } });
      await dbClient.lightPax.update({
        where: { id: person.id },
        data: { passHash: await hashCode(demo.code), passDate: todayET(), passSeal: sealCode(demo.code) },
      });
      await dbClient.lightScheduleItem.create({
        data: {
          programId: program.id,
          title: "Your transfer",
          kind: "TRANSFER",
          timeLabel: clockish(person.trip.scheduledTime),
          sortKey: person.trip.scheduledTime,
          summary: `${person.trip.vehicleLabel || "Vehicle"} for your party.`,
          detail: person.trip.notes || "Your director confirms the headcount before you roll.",
          spot: "X marks the spot. Wait at the signed column your text named.",
          route: `${displayFlight(person.trip.flightCode)} to the resort`,
          flightCode: person.trip.flightCode,
          paxId: person.id,
        },
      });
    }
  }
}

function clockish(value: string) {
  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match) return value;
  const hour = Number(match[1]);
  const suffix = hour >= 12 ? "PM" : "AM";
  const shown = hour % 12 || 12;
  return `${shown}:${match[2]} ${suffix}`;
}
