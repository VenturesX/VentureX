import { db } from "../db";
import { isDatabaseUnavailable } from "../db-error";
import { downstreamEtas, stopById } from "./motion";
import { PUCK_IDS, defaultDesk } from "./route3";
import type { LiveFix, PuckLink, Relay, RouteLeg, ShuttleDesk, ShuttleStop } from "./types";

const DESK_ID = "route3";
let memory: ShuttleDesk | null = null;

export async function readDesk(): Promise<{ desk: ShuttleDesk; persisted: boolean }> {
  try {
    const row = await db.shuttleDesk.findUnique({ where: { id: DESK_ID } });
    const stored = row ? safeParse(row.payload) : null;
    const desk = mergeDesk(stored, memory);
    memory = desk;
    if (!row) {
      const persisted = await writeDesk(desk);
      return { desk, persisted };
    }
    return { desk, persisted: true };
  } catch (error) {
    if (!isDatabaseUnavailable(error)) throw error;
    const desk = mergeDesk(null, memory);
    memory = desk;
    return { desk, persisted: false };
  }
}

export async function saveDesk(input: unknown): Promise<{ desk: ShuttleDesk; persisted: boolean }> {
  const current = memory ?? (await readDesk()).desk;
  const incoming = sanitizeDesk(input);
  const desk = mergeDesk(incoming, current);
  memory = desk;
  const persisted = await writeDesk(desk);
  return { desk, persisted };
}

export async function recordFix(fix: LiveFix): Promise<{ desk: ShuttleDesk; persisted: boolean }> {
  const { desk } = await readDesk();
  const fixes = [fix, ...desk.fixes.filter((item) => item.puckId !== fix.puckId)].slice(0, 40);
  return saveDesk({ ...desk, fixes });
}

export async function recordRelay(input: {
  puckId: string;
  stopId: string;
  kind: "arrive" | "depart";
  pax: number;
  driver?: string;
  coachNumber?: string;
  shuttleNumber?: string;
}): Promise<{ desk: ShuttleDesk; persisted: boolean; relay: Relay }> {
  const { desk } = await readDesk();
  const link = desk.links.find((item) => item.puckId === input.puckId && item.shift === (desk.mode === "chiefs" ? "night" : "morning"));
  const relay = makeRelay(desk, {
    puckId: input.puckId,
    stopId: input.stopId,
    kind: input.kind,
    pax: input.pax,
    driver: input.driver || link?.driver || "",
    coachNumber: input.coachNumber || link?.coachNumber || "",
    shuttleNumber: input.shuttleNumber || link?.shuttleNumber || "",
  });
  const stop = stopById(desk.stops, input.stopId);
  const fix: LiveFix | null = stop
    ? {
        puckId: input.puckId,
        lat: stop.lat,
        lng: stop.lng,
        heading: null,
        speedMps: input.kind === "depart" ? null : 0,
        source: "checkin",
        stopId: input.stopId,
        at: relay.at,
      }
    : null;
  const saved = await saveDesk({
    ...desk,
    relays: [relay, ...desk.relays].slice(0, 40),
    fixes: fix ? [fix, ...desk.fixes.filter((item) => item.puckId !== fix.puckId)].slice(0, 40) : desk.fixes,
  });
  return { ...saved, relay };
}

async function writeDesk(desk: ShuttleDesk) {
  try {
    await db.shuttleDesk.upsert({
      where: { id: DESK_ID },
      create: { id: DESK_ID, payload: JSON.stringify(desk) },
      update: { payload: JSON.stringify(desk) },
    });
    return true;
  } catch (error) {
    if (isDatabaseUnavailable(error)) return false;
    throw error;
  }
}

function mergeDesk(preferred: ShuttleDesk | null, fallback: ShuttleDesk | null): ShuttleDesk {
  const base = preferred ?? fallback ?? defaultDesk();
  const other = preferred && fallback ? fallback : null;
  const fixes = newestByPuck([...(other?.fixes ?? []), ...base.fixes]);
  const relays = [...base.relays, ...(other?.relays ?? [])]
    .filter((relay, index, all) => all.findIndex((item) => item.id === relay.id) === index)
    .sort((a, b) => b.at - a.at)
    .slice(0, 40);
  return sanitizeDesk({ ...base, fixes, relays });
}

function newestByPuck(fixes: LiveFix[]) {
  const map = new Map<string, LiveFix>();
  for (const fix of fixes) {
    const current = map.get(fix.puckId);
    if (!current || fix.at > current.at) map.set(fix.puckId, fix);
  }
  return [...map.values()];
}

export function sanitizeDesk(input: unknown): ShuttleDesk {
  const fallback = defaultDesk();
  const record = asRecord(input);
  const stops = Array.isArray(record.stops) ? record.stops.map(sanitizeStop).filter((stop): stop is ShuttleStop => Boolean(stop)) : [];
  const links = Array.isArray(record.links) ? record.links.map(sanitizeLink).filter((link): link is PuckLink => Boolean(link)) : [];
  return {
    mode: record.mode === "chiefs" ? "chiefs" : "loop",
    eventCode: text(record.eventCode, 20) || fallback.eventCode,
    stops: stops.length ? mergeOfficialStops(stops) : fallback.stops,
    loopOrder: idList(record.loopOrder, fallback.loopOrder),
    nightOrder: idList(record.nightOrder, fallback.nightOrder),
    loopLegs: legs(record.loopLegs, fallback.loopLegs),
    nightLegs: legs(record.nightLegs, fallback.nightLegs),
    links: links.length ? links : fallback.links,
    fixes: Array.isArray(record.fixes) ? record.fixes.map(sanitizeFix).filter((fix): fix is LiveFix => Boolean(fix)).slice(0, 40) : [],
    relays: Array.isArray(record.relays) ? record.relays.map(sanitizeRelay).filter((relay): relay is Relay => Boolean(relay)).slice(0, 40) : [],
  };
}

function mergeOfficialStops(stops: ShuttleStop[]) {
  const official = defaultDesk().stops;
  const byId = new Map(stops.map((stop) => [stop.id, stop]));
  const merged = official.map((stop) => byId.get(stop.id) ?? stop);
  for (const stop of stops) {
    if (!merged.some((item) => item.id === stop.id)) merged.push(stop);
  }
  return merged;
}

function sanitizeStop(input: unknown): ShuttleStop | null {
  const record = asRecord(input);
  const lat = Number(record.lat);
  const lng = Number(record.lng);
  const id = text(record.id, 40);
  const name = text(record.name, 120);
  if (!id || !name || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const kind = record.kind === "hub" || record.kind === "event" || record.kind === "depot" || record.kind === "stop" ? record.kind : "stop";
  const walkOvers = Array.isArray(record.walkOvers)
    ? record.walkOvers.slice(0, 8).map((item) => {
        const walk = asRecord(item);
        const walkLat = Number(walk.lat);
        const walkLng = Number(walk.lng);
        return {
          name: text(walk.name, 120),
          address: text(walk.address, 160),
          lat: Number.isFinite(walkLat) ? walkLat : undefined,
          lng: Number.isFinite(walkLng) ? walkLng : undefined,
        };
      }).filter((item) => item.name)
    : [];
  return {
    id,
    code: text(record.code, 20) || id.toUpperCase(),
    name,
    address: text(record.address, 180),
    lat,
    lng,
    boarding: text(record.boarding, 220),
    staffName: text(record.staffName, 80),
    staffPhone: text(record.staffPhone, 30),
    walkOvers,
    kind,
    custom: Boolean(record.custom),
  };
}

function sanitizeLink(input: unknown): PuckLink | null {
  const record = asRecord(input);
  const puckId = text(record.puckId, 20);
  if (!puckId) return null;
  return {
    puckId,
    shift: record.shift === "night" ? "night" : "morning",
    shuttleNumber: text(record.shuttleNumber, 20),
    carrier: text(record.carrier, 60),
    coachNumber: text(record.coachNumber, 20),
    driver: text(record.driver, 80),
    phone: text(record.phone, 30),
    checkIn: text(record.checkIn, 20),
    release: text(record.release, 20),
    breakText: text(record.breakText, 80),
  };
}

function sanitizeFix(input: unknown): LiveFix | null {
  const record = asRecord(input);
  const puckId = text(record.puckId, 20);
  const lat = Number(record.lat);
  const lng = Number(record.lng);
  if (!puckId || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const source = record.source === "beacon" || record.source === "falcon" || record.source === "checkin" ? record.source : "sim";
  return {
    puckId,
    lat,
    lng,
    heading: finite(record.heading),
    speedMps: finite(record.speedMps),
    source,
    stopId: text(record.stopId, 40) || null,
    at: finite(record.at) ?? Date.now(),
  };
}

function sanitizeRelay(input: unknown): Relay | null {
  const record = asRecord(input);
  const id = text(record.id, 40);
  const textValue = text(record.text, 400);
  if (!id || !textValue) return null;
  return {
    id,
    at: finite(record.at) ?? Date.now(),
    puckId: text(record.puckId, 20),
    stopId: text(record.stopId, 40),
    kind: record.kind === "arrive" ? "arrive" : "depart",
    pax: Math.max(0, Math.round(finite(record.pax) ?? 0)),
    text: textValue,
  };
}

export function makeRelay(desk: ShuttleDesk, input: {
  puckId: string;
  stopId: string;
  kind: "arrive" | "depart";
  pax: number;
  driver: string;
  coachNumber: string;
  shuttleNumber: string;
}): Relay {
  const order = desk.mode === "chiefs" ? desk.nightOrder : desk.loopOrder;
  const legs = desk.mode === "chiefs" ? desk.nightLegs : desk.loopLegs;
  const stop = stopById(desk.stops, input.stopId);
  const etas = downstreamEtas(desk.stops, legs, input.stopId).slice(0, 3);
  const shuttle = input.shuttleNumber || input.puckId;
  const parts = [input.puckId, input.driver, input.coachNumber ? `Coach #${input.coachNumber}` : ""].filter(Boolean);
  const orderForLabels = desk.loopOrder.length ? desk.loopOrder : order;
  const place = stop ? placeLabel(stop, orderForLabels) : input.stopId;
  const verb = input.kind === "depart" ? "departed" : "arrived at";
  const chainParts = etas.flatMap((eta) => {
    const target = stopById(desk.stops, eta.stopId);
    return target ? [`${placeLabel(target, orderForLabels)}: ~${eta.minutes} mins`] : [];
  });
  const chain = chainParts.length ? `ETA to ${chainParts.join(" · ")}` : "on the loop";
  return {
    id: `relay-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    at: Date.now(),
    puckId: input.puckId,
    stopId: input.stopId,
    kind: input.kind,
    pax: Math.max(0, Math.round(input.pax)),
    text: `Bus ${shuttle} (${parts.join(" • ")}) ${verb} ${place} with ${Math.max(0, Math.round(input.pax))} pax — ${chain}`,
  };
}

function placeLabel(stop: ShuttleStop, loopOrder: string[]) {
  const short = SHORT_NAME[stop.id] ?? firstWords(stop.name);
  if (stop.kind === "event") return `Chief's Night (${short})`;
  const index = loopOrder.indexOf(stop.id);
  if (stop.kind === "hub" || index === 0) return `Hub (${short})`;
  if (index > 0) return `Stop ${index} (${short})`;
  return short;
}

const SHORT_NAME: Record<string, string> = {
  occw: "OCCC West",
  depot: "Depot",
  "r3-s1": "Residence Inn",
  "r3-s2": "Hilton Grand Vacations",
  "r3-s3": "Element",
  "r3-s4": "SpringHill",
  uioa: "Islands of Adventure",
};

function firstWords(name: string) {
  return name.split(" ").slice(0, 3).join(" ");
}

function idList(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  const ids = value.map((item) => text(item, 40)).filter(Boolean);
  return ids.length ? ids : fallback;
}

function legs(value: unknown, fallback: RouteLeg[]) {
  if (!Array.isArray(value)) return fallback;
  const parsed = value
    .map((item) => {
      const record = asRecord(item);
      const from = text(record.from, 40);
      const to = text(record.to, 40);
      const minutes = Math.max(1, Math.round(finite(record.minutes) ?? 0));
      if (!from || !to) return null;
      return { from, to, minutes };
    })
    .filter((item): item is RouteLeg => Boolean(item));
  return parsed.length ? parsed : fallback;
}

function safeParse(payload: string) {
  try {
    return sanitizeDesk(JSON.parse(payload));
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function text(value: unknown, max: number) {
  return typeof value === "string" || typeof value === "number" ? String(value).trim().slice(0, max) : "";
}

function finite(value: unknown) {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(number) ? number : null;
}

export function knownPuck(puckId: string) {
  return PUCK_IDS.some((id) => id === puckId) || /^[A-Za-z0-9-]{2,20}$/.test(puckId);
}
