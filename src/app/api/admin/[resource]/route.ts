import { NextResponse } from "next/server";
import { jsonError, requireApi } from "@/lib/api";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { recordAudit } from "@/lib/ops/audit";
import { publishOps } from "@/lib/realtime";
import type { Prisma } from "@prisma/client";

const RESOURCES = [
  "clients",
  "events",
  "locations",
  "geofences",
  "routes",
  "users",
  "operators",
  "vehicles",
  "drivers",
  "presets",
  "alerts",
] as const;

type Resource = (typeof RESOURCES)[number];

function modelFor(resource: Resource) {
  switch (resource) {
    case "clients":
      return db.client;
    case "events":
      return db.event;
    case "locations":
      return db.location;
    case "geofences":
      return db.geofence;
    case "routes":
      return db.route;
    case "users":
      return db.user;
    case "operators":
      return db.operator;
    case "vehicles":
      return db.vehicle;
    case "drivers":
      return db.driver;
    case "presets":
      return db.timingPreset;
    case "alerts":
      return db.alertConfig;
  }
}

function includeFor(resource: Resource): Prisma.ClientFindManyArgs["include"] | Record<string, unknown> {
  switch (resource) {
    case "events":
      return { client: true, alertConfig: true };
    case "locations":
      return { event: true };
    case "geofences":
      return { event: true, location: true };
    case "routes":
      return { origin: true, destination: true, event: true };
    case "users":
      return { client: true, driver: true };
    case "vehicles":
      return { operator: true, currentDriver: { include: { user: true } } };
    case "drivers":
      return { user: true, operator: true, currentVehicle: true };
    default:
      return undefined;
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ resource: string }> },
) {
  try {
    await requireApi("admin.crud");
    const { resource } = await context.params;
    if (!RESOURCES.includes(resource as Resource)) {
      return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
    }
    const url = new URL(request.url);
    const eventId = url.searchParams.get("eventId");
    const model = modelFor(resource as Resource) as { findMany: (args: unknown) => Promise<unknown> };
    const where: Record<string, unknown> = {};
    if ("deletedAt" in (await safeHasDeleted(resource as Resource))) {
      where.deletedAt = null;
    }
    if (eventId && ["events", "locations", "geofences", "routes", "vehicles"].includes(resource)) {
      if (resource === "events") where.id = eventId;
      else where.eventId = eventId;
    }
    const rows = await model.findMany({
      where,
      include: includeFor(resource as Resource),
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ rows });
  } catch (error) {
    return jsonError(error);
  }
}

async function safeHasDeleted(resource: Resource) {
  return resource === "presets" || resource === "alerts" ? {} : { deletedAt: true };
}

export async function POST(
  request: Request,
  context: { params: Promise<{ resource: string }> },
) {
  try {
    const actor = await requireApi("admin.crud");
    const { resource } = await context.params;
    if (!RESOURCES.includes(resource as Resource)) {
      return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
    }
    const body = (await request.json()) as Record<string, unknown>;
    if (resource === "users" && body.password) {
      body.passwordHash = await hashPassword(String(body.password));
      delete body.password;
    }
    if (resource === "drivers" && body.email && body.name && !body.userId) {
      const user = await db.user.create({
        data: {
          email: String(body.email).toLowerCase(),
          name: String(body.name),
          role: "DRIVER",
          phone: body.phone ? String(body.phone) : null,
          passwordHash: await hashPassword(String(body.password ?? "VentureOps!26")),
        },
      });
      body.userId = user.id;
      delete body.email;
      delete body.name;
      delete body.password;
    }
    const numeric = [
      "waitTargetMinutes",
      "radiusMeters",
      "estimatedMinutes",
      "capacity",
      "loadMinutes",
      "travelMinutes",
      "bufferMinutes",
      "waitThresholdMinutes",
      "vipWaitThresholdMinutes",
      "queueCapacityAlert",
      "lat",
      "lng",
      "centerLat",
      "centerLng",
    ];
    for (const key of numeric) {
      if (body[key] !== undefined && body[key] !== null && body[key] !== "") {
        body[key] = Number(body[key]);
      }
    }
    if (body.startsAt) body.startsAt = new Date(String(body.startsAt));
    if (body.endsAt) body.endsAt = new Date(String(body.endsAt));
    const model = modelFor(resource as Resource) as { create: (args: unknown) => Promise<{ id: string }> };
    const row = await model.create({
      data: body,
      include: includeFor(resource as Resource),
    });
    await recordAudit({
      action: `${resource}.create`,
      entityType: resource.toUpperCase(),
      entityId: row.id,
      actorId: actor.id,
      after: body,
    });
    publishOps({ type: "admin", entityType: resource, entityId: row.id });
    return NextResponse.json({ row });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ resource: string }> },
) {
  try {
    const actor = await requireApi("admin.crud");
    const { resource } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const id = String(body.id ?? "");
    delete body.id;
    if (resource === "users" && body.password) {
      body.passwordHash = await hashPassword(String(body.password));
      delete body.password;
    }
    const numeric = ["radiusMeters", "waitTargetMinutes", "capacity", "estimatedMinutes", "lat", "lng", "centerLat", "centerLng", "waitThresholdMinutes", "vipWaitThresholdMinutes", "queueCapacityAlert", "loadMinutes", "travelMinutes", "bufferMinutes"];
    for (const key of numeric) {
      if (body[key] !== undefined && body[key] !== "") body[key] = Number(body[key]);
    }
    const model = modelFor(resource as Resource) as {
      update: (args: unknown) => Promise<{ id: string }>;
    };
    const row = await model.update({
      where: { id },
      data: body,
      include: includeFor(resource as Resource),
    });
    await recordAudit({
      action: `${resource}.update`,
      entityType: resource.toUpperCase(),
      entityId: id,
      actorId: actor.id,
      after: body,
    });
    publishOps({ type: "admin", entityType: resource, entityId: id });
    return NextResponse.json({ row });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ resource: string }> },
) {
  try {
    const actor = await requireApi("admin.crud");
    const { resource } = await context.params;
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const model = modelFor(resource as Resource) as { update: (args: unknown) => Promise<unknown> };
    if (resource === "presets" || resource === "alerts") {
      await (modelFor(resource) as { delete: (args: unknown) => Promise<unknown> }).delete({
        where: { id },
      });
    } else {
      await model.update({ where: { id }, data: { deletedAt: new Date() } });
    }
    await recordAudit({
      action: `${resource}.delete`,
      entityType: resource.toUpperCase(),
      entityId: id,
      actorId: actor.id,
    });
    publishOps({ type: "admin", entityType: resource, entityId: id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
