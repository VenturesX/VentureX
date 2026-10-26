import { db } from "@/lib/db";
import { directLineForEvent } from "@/lib/ops-settings";
import {
  CODE_ATTEMPT_LIMIT,
  CODE_ATTEMPT_WINDOW_MS,
  GENERIC_CODE_ERROR,
  GENERIC_LINK_ERROR,
  defaultGuestExpiry,
  linkIsLive,
  makeGuestCode,
  makeGuestToken,
  normalizeGuestCode,
  pinsMatch,
  tripCookieMatches,
} from "@/lib/guest-codes";

export const TRIP_COOKIE = "vd_trip";
export const GENERIC_UNLOCK_ERROR = "That didn't match. Check the details from your planner and try again.";
const TOKEN_RE = /^[A-Za-z0-9_-]{20,80}$/;
const HOUR = 60 * 60 * 1000;
const CATEGORIES = ["PICKUP", "SCHEDULE", "LOST", "ACCESSIBILITY", "OTHER"];
const CLOSED = new Set(["COMPLETED", "CANCELLED"]);

export type GuestAccessLevel = "TOKEN" | "PIN" | "MANIFEST";

export function tripCookieOptions() {
  return { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * 14 };
}

export function clientIp(request: Request) {
  return (request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local").slice(0, 80);
}

const movementInclude = { origin: true, destination: true } as const;

const eventInclude = {
  faqs: { orderBy: { sortOrder: "asc" as const } },
  movements: {
    where: { deletedAt: null },
    include: movementInclude,
    orderBy: { scheduledAt: "asc" as const },
  },
};

type LoadedEvent = NonNullable<Awaited<ReturnType<typeof loadEvent>>>;

async function loadEvent(id: string) {
  return db.event.findFirst({
    where: { id, deletedAt: null },
    include: eventInclude,
  });
}

export type GuestScope = { event: LoadedEvent; movementId: string | null };

export async function resolveToken(token: string): Promise<GuestScope | null> {
  if (!TOKEN_RE.test(token)) return null;
  const eventHit = await db.event.findUnique({ where: { guestToken: token }, select: { id: true, deletedAt: true } });
  if (eventHit && !eventHit.deletedAt) {
    const event = await loadEvent(eventHit.id);
    if (!event || !linkIsLive(event.guestTokenExpiresAt)) return null;
    return { event, movementId: null };
  }
  const movement = await db.movement.findUnique({
    where: { guestToken: token },
    select: { id: true, eventId: true, deletedAt: true },
  });
  if (!movement || movement.deletedAt) return null;
  const event = await loadEvent(movement.eventId);
  if (!event || !linkIsLive(event.guestTokenExpiresAt)) return null;
  if (!event.movements.some((row) => row.id === movement.id)) return null;
  return { event, movementId: movement.id };
}

function asAccess(value: string): GuestAccessLevel {
  if (value === "PIN" || value === "MANIFEST") return value;
  return "TOKEN";
}

async function lookupCode(raw: string) {
  const code = normalizeGuestCode(raw);
  if (code.length !== 6) return null;
  const event = await db.event.findUnique({
    where: { guestCode: code },
    select: { id: true, deletedAt: true, guestToken: true, guestAccess: true, guestTokenExpiresAt: true },
  });
  if (event && !event.deletedAt && event.guestToken && linkIsLive(event.guestTokenExpiresAt)) {
    return { token: event.guestToken, access: asAccess(event.guestAccess) };
  }
  const movement = await db.movement.findUnique({
    where: { guestCode: code },
    select: { guestToken: true, deletedAt: true, event: { select: { deletedAt: true, guestAccess: true, guestTokenExpiresAt: true } } },
  });
  if (!movement || movement.deletedAt || !movement.guestToken || movement.event.deletedAt) return null;
  if (!linkIsLive(movement.event.guestTokenExpiresAt)) return null;
  return { token: movement.guestToken, access: asAccess(movement.event.guestAccess) };
}

export async function tooManyAttempts(ip: string, now = new Date()) {
  const since = new Date(now.getTime() - CODE_ATTEMPT_WINDOW_MS);
  const count = await db.guestAccessAttempt.count({ where: { ip, createdAt: { gte: since } } });
  return count >= CODE_ATTEMPT_LIMIT;
}

async function noteFailedAttempt(ip: string) {
  await db.guestAccessAttempt.create({ data: { ip: ip.slice(0, 80) } });
}

export async function enterGuestCode(raw: string, ip: string) {
  if (await tooManyAttempts(ip)) return { ok: false as const, status: 429, error: GENERIC_CODE_ERROR };
  const hit = await lookupCode(raw);
  if (!hit) {
    await noteFailedAttempt(ip);
    return { ok: false as const, status: 400, error: GENERIC_CODE_ERROR };
  }
  return { ok: true as const, token: hit.token, access: hit.access };
}

function movementsFor(scope: GuestScope) {
  if (!scope.movementId) return scope.event.movements;
  return scope.event.movements.filter((row) => row.id === scope.movementId);
}

function pickNext(movements: LoadedEvent["movements"]) {
  const open = movements.filter((row) => !CLOSED.has(row.status));
  const horizon = Date.now() - 30 * 60 * 1000;
  return open.find((row) => row.scheduledAt.getTime() >= horizon) ?? open[0] ?? null;
}

function publicBoard(scope: GuestScope, phone: string, tel: string) {
  const movements = movementsFor(scope);
  const pickups = [...new Set(movements.map((row) => row.origin.name))];
  const schedule = movements.map((row) => ({
    id: row.id,
    name: row.name,
    scheduledAt: row.scheduledAt.toISOString(),
    origin: row.origin.name,
    destination: row.destination.name,
    status: row.status,
  }));
  const next = pickNext(movements);
  return {
    gate: null,
    eventName: scope.event.name,
    faqs: scope.event.faqs.map((faq) => ({
      id: faq.id,
      category: faq.category,
      question: faq.question,
      answer: faq.answer,
    })),
    pickups,
    schedule,
    nextBus: next
      ? {
          name: next.name,
          scheduledAt: next.scheduledAt.toISOString(),
          origin: next.origin.name,
          destination: next.destination.name,
        }
      : null,
    phone,
    tel,
  };
}

export async function loadGuestBoard(token: string, cookie: string | undefined) {
  const scope = await resolveToken(token);
  if (!scope) return { status: 404, body: { error: GENERIC_LINK_ERROR } };
  const access = asAccess(scope.event.guestAccess);
  if (access !== "TOKEN" && !tripCookieMatches(cookie, token, access, scope.event.guestPin)) {
    return { status: 200, body: { gate: access } };
  }
  const line = scope.event.guestPhoneEnabled
    ? await directLineForEvent(scope.event.directLinePhone)
    : { phone: "", tel: "" };
  return { status: 200, body: publicBoard(scope, line.phone, line.tel) };
}

export async function unlockGuest(
  token: string,
  input: { pin?: string; lastName?: string; confirmation?: string },
  ip: string,
) {
  if (await tooManyAttempts(ip)) return { ok: false as const, status: 429, error: GENERIC_UNLOCK_ERROR };
  const scope = await resolveToken(token);
  if (!scope) return { ok: false as const, status: 404, error: GENERIC_LINK_ERROR };
  const access = asAccess(scope.event.guestAccess);
  let opened = access === "TOKEN";
  if (access === "PIN") opened = pinsMatch(scope.event.guestPin, String(input.pin ?? ""));
  if (access === "MANIFEST") {
    const lastName = String(input.lastName ?? "").trim();
    const confirmation = String(input.confirmation ?? "").trim();
    if (lastName.length >= 2 && confirmation.length >= 3) {
      const guests = await db.guest.findMany({
        where: {
          eventId: scope.event.id,
          deletedAt: null,
          ...(scope.movementId ? { movementId: scope.movementId } : {}),
        },
        select: { lastName: true, confirmationCode: true },
      });
      opened = guests.some(
        (guest) =>
          guest.lastName.toLowerCase() === lastName.toLowerCase() &&
          (guest.confirmationCode ?? "").toLowerCase() === confirmation.toLowerCase(),
      );
    }
  }
  if (!opened) {
    await noteFailedAttempt(ip);
    return { ok: false as const, status: 400, error: GENERIC_UNLOCK_ERROR };
  }
  return { ok: true as const, token, access, pin: scope.event.guestPin };
}

export async function createGuestRequest(input: {
  token: string;
  category: string;
  message: string;
  name: string;
  phone: string;
  deviceKey: string;
  ip: string;
  cookie?: string;
}) {
  const scope = await resolveToken(input.token);
  if (!scope) return { status: 404, body: { error: GENERIC_LINK_ERROR } };
  const access = asAccess(scope.event.guestAccess);
  if (access !== "TOKEN" && !tripCookieMatches(input.cookie, input.token, access, scope.event.guestPin)) {
    return { status: 401, body: { error: GENERIC_UNLOCK_ERROR } };
  }
  const category = CATEGORIES.includes(input.category) ? input.category : "";
  const message = input.message.trim();
  const name = input.name.trim().slice(0, 120);
  const phone = input.phone.trim().slice(0, 40);
  if (!category) return { status: 400, body: { error: "Choose what this is about." } };
  if (message.length < 4 || message.length > 1000) {
    return { status: 400, body: { error: "Write a short question so we know how to help." } };
  }
  const since = new Date(Date.now() - HOUR);
  const [byDevice, byIp, byPhone] = await Promise.all([
    db.guestRequest.count({ where: { deviceKey: input.deviceKey, createdAt: { gt: since } } }),
    db.guestRequest.count({ where: { ip: input.ip, createdAt: { gt: since } } }),
    phone ? db.guestRequest.count({ where: { phone, createdAt: { gt: since } } }) : Promise.resolve(0),
  ]);
  if (byDevice >= 3 || byPhone >= 3 || byIp >= 10) {
    return {
      status: 429,
      body: { error: "We've already received a few notes from this phone. Give us a little time to answer." },
    };
  }
  const fingerprint = message.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 240);
  const movementId = scope.movementId;
  if (fingerprint.length >= 8) {
    const existing = await db.guestRequest.findFirst({
      where: {
        eventId: scope.event.id,
        movementId,
        category,
        fingerprint,
        status: "OPEN",
        createdAt: { gt: new Date(Date.now() - 24 * HOUR) },
      },
    });
    if (existing) {
      const row = await db.guestRequest.update({
        where: { id: existing.id },
        data: { duplicateCount: { increment: 1 } },
      });
      return { status: 200, body: { ok: true, grouped: true, id: row.id, duplicateCount: row.duplicateCount } };
    }
  }
  const row = await db.guestRequest.create({
    data: {
      eventId: scope.event.id,
      movementId,
      category,
      message,
      name: name || null,
      phone: phone || null,
      deviceKey: input.deviceKey,
      ip: input.ip,
      fingerprint,
    },
  });
  return { status: 200, body: { ok: true, grouped: false, id: row.id } };
}

export async function listGuestRequests(eventId: string) {
  const rows = await db.guestRequest.findMany({
    where: { eventId },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { movement: { select: { name: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    category: row.category,
    message: row.message,
    name: row.name,
    phone: row.phone,
    duplicateCount: row.duplicateCount,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    movementName: row.movement?.name ?? null,
  }));
}

export async function setGuestRequestStatus(eventId: string, id: string, status: "OPEN" | "HANDLED") {
  const result = await db.guestRequest.updateMany({ where: { id, eventId }, data: { status } });
  return result.count === 1;
}

export async function activeStaffEvent() {
  return db.event.findFirst({
    where: { deletedAt: null, status: "ACTIVE" },
    orderBy: { startsAt: "asc" },
    select: { id: true, name: true },
  });
}

async function freshCode() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = makeGuestCode();
    const [eventHit, moveHit] = await Promise.all([
      db.event.findUnique({ where: { guestCode: code }, select: { id: true } }),
      db.movement.findUnique({ where: { guestCode: code }, select: { id: true } }),
    ]);
    if (!eventHit && !moveHit) return code;
  }
  throw Object.assign(new Error("Could not mint a guest code"), { status: 500 });
}

async function freshToken() {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const token = makeGuestToken();
    const [eventHit, moveHit] = await Promise.all([
      db.event.findUnique({ where: { guestToken: token }, select: { id: true } }),
      db.movement.findUnique({ where: { guestToken: token }, select: { id: true } }),
    ]);
    if (!eventHit && !moveHit) return token;
  }
  throw Object.assign(new Error("Could not mint a guest link"), { status: 500 });
}

export type GuestAccessView = {
  eventName: string;
  code: string | null;
  access: GuestAccessLevel;
  pin: string | null;
  token: string | null;
  expiresAt: string | null;
  movements: { id: string; name: string; code: string | null; token: string | null }[];
};

async function viewFor(eventId: string): Promise<GuestAccessView | null> {
  const event = await db.event.findFirst({
    where: { id: eventId, deletedAt: null },
    include: { movements: { where: { deletedAt: null }, orderBy: { scheduledAt: "asc" } } },
  });
  if (!event) return null;
  return {
    eventName: event.name,
    code: event.guestCode,
    access: asAccess(event.guestAccess),
    pin: event.guestPin,
    token: event.guestToken,
    expiresAt: event.guestTokenExpiresAt?.toISOString() ?? null,
    movements: event.movements.map((row) => ({
      id: row.id,
      name: row.name,
      code: row.guestCode,
      token: row.guestToken,
    })),
  };
}

export async function staffGuestAccess(eventId: string) {
  return viewFor(eventId);
}

export async function regenerateGuestToken(eventId: string) {
  const event = await db.event.findFirst({
    where: { id: eventId, deletedAt: null },
    include: { movements: { where: { deletedAt: null }, orderBy: { scheduledAt: "desc" }, take: 1 } },
  });
  if (!event) return null;
  const last = event.movements[0]?.scheduledAt ?? null;
  await db.event.update({
    where: { id: event.id },
    data: {
      guestToken: await freshToken(),
      guestCode: event.guestCode ?? (await freshCode()),
      guestTokenExpiresAt: event.guestTokenExpiresAt ?? defaultGuestExpiry(event.endsAt, last),
    },
  });
  return viewFor(event.id);
}

export async function revokeGuestAccess(eventId: string) {
  const event = await db.event.findFirst({ where: { id: eventId, deletedAt: null }, select: { id: true } });
  if (!event) return null;
  await db.event.update({ where: { id: event.id }, data: { guestToken: null } });
  await db.movement.updateMany({ where: { eventId: event.id }, data: { guestToken: null } });
  return viewFor(event.id);
}

export async function saveGuestAccess(
  eventId: string,
  input: { access?: string; pin?: string; expiresAt?: string },
) {
  const event = await db.event.findFirst({ where: { id: eventId, deletedAt: null } });
  if (!event) return { ok: false as const, status: 404, error: "Event not found." };
  const access = asAccess(String(input.access ?? event.guestAccess));
  const pin = String(input.pin ?? "").trim().slice(0, 32);
  if (access === "PIN" && !pin && !event.guestPin) {
    return { ok: false as const, status: 400, error: "Add a PIN for this event." };
  }
  let expiresAt = event.guestTokenExpiresAt;
  if (input.expiresAt) {
    const parsed = new Date(input.expiresAt);
    if (Number.isNaN(parsed.getTime())) return { ok: false as const, status: 400, error: "Enter a valid expiry." };
    expiresAt = parsed;
  }
  await db.event.update({
    where: { id: event.id },
    data: {
      guestAccess: access,
      guestPin: pin || event.guestPin,
      guestTokenExpiresAt: expiresAt,
    },
  });
  return { ok: true as const, view: await viewFor(event.id) };
}

export async function ensureMovementLink(eventId: string, movementId: string, rotate = false) {
  const movement = await db.movement.findFirst({
    where: { id: movementId, eventId, deletedAt: null },
  });
  if (!movement) return null;
  await db.movement.update({
    where: { id: movement.id },
    data: {
      guestToken: !movement.guestToken || rotate ? await freshToken() : movement.guestToken,
      guestCode: movement.guestCode ?? (await freshCode()),
    },
  });
  return viewFor(eventId);
}
