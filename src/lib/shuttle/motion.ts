import type { LiveFix, RouteLeg, RouteMode, ShuttleDesk, ShuttleStop } from "./types";

export type Point = { lat: number; lng: number };

export function activeOrder(desk: ShuttleDesk) {
  return desk.mode === "chiefs" ? desk.nightOrder : desk.loopOrder;
}

export function activeLegs(desk: ShuttleDesk) {
  return desk.mode === "chiefs" ? desk.nightLegs : desk.loopLegs;
}

export function stopById(stops: ShuttleStop[], id: string) {
  return stops.find((stop) => stop.id === id) ?? null;
}

export function loopMinutes(legs: RouteLeg[]) {
  return legs.reduce((sum, leg) => sum + leg.minutes, 0) || 1;
}

export function haversineKm(a: Point, b: Point) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const lat1 = a.lat * rad;
  const lat2 = b.lat * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function bearing(a: Point, b: Point) {
  const rad = Math.PI / 180;
  const y = Math.sin((b.lng - a.lng) * rad) * Math.cos(b.lat * rad);
  const x =
    Math.cos(a.lat * rad) * Math.sin(b.lat * rad) -
    Math.sin(a.lat * rad) * Math.cos(b.lat * rad) * Math.cos((b.lng - a.lng) * rad);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

export function pointAlong(stops: ShuttleStop[], legs: RouteLeg[], progress: number): Point & { heading: number; legIndex: number } {
  const total = loopMinutes(legs);
  let remaining = ((progress % 1) + 1) % 1 * total;
  for (let index = 0; index < legs.length; index += 1) {
    const leg = legs[index];
    const from = stopById(stops, leg.from);
    const to = stopById(stops, leg.to);
    if (!from || !to) continue;
    if (remaining <= leg.minutes || index === legs.length - 1) {
      const t = leg.minutes === 0 ? 0 : Math.min(1, remaining / leg.minutes);
      return {
        lat: from.lat + (to.lat - from.lat) * t,
        lng: from.lng + (to.lng - from.lng) * t,
        heading: bearing(from, to),
        legIndex: index,
      };
    }
    remaining -= leg.minutes;
  }
  const first = stopById(stops, legs[0]?.from ?? "");
  return { lat: first?.lat ?? 0, lng: first?.lng ?? 0, heading: 0, legIndex: 0 };
}

export function etasFromProgress(stops: ShuttleStop[], legs: RouteLeg[], progress: number) {
  const total = loopMinutes(legs);
  let into = (((progress % 1) + 1) % 1) * total;
  const etas: { stopId: string; minutes: number }[] = [];
  for (let index = 0; index < legs.length; index += 1) {
    const leg = legs[index];
    if (!stopById(stops, leg.from) || !stopById(stops, leg.to)) continue;
    if (into <= leg.minutes || index === legs.length - 1) {
      let minutes = Math.max(1, Math.round(leg.minutes - Math.min(into, leg.minutes)));
      etas.push({ stopId: leg.to, minutes });
      for (let step = 1; step < legs.length && etas.length < 3; step += 1) {
        const next = legs[(index + step) % legs.length];
        minutes += next.minutes;
        etas.push({ stopId: next.to, minutes });
      }
      return etas;
    }
    into -= leg.minutes;
  }
  return etas;
}

export function downstreamEtas(stops: ShuttleStop[], legs: RouteLeg[], fromStopId: string) {
  const start = legs.findIndex((leg) => leg.from === fromStopId);
  if (start < 0) return [];
  const etas: { stopId: string; minutes: number }[] = [];
  let minutes = 0;
  for (let step = 0; step < legs.length; step += 1) {
    const leg = legs[(start + step) % legs.length];
    minutes += leg.minutes;
    etas.push({ stopId: leg.to, minutes });
    if (leg.to === fromStopId) break;
  }
  return etas;
}

export function simulatedFix(puckId: string, index: number, count: number, desk: ShuttleDesk, now = Date.now()): LiveFix {
  const legs = activeLegs(desk);
  const progress = (now / 60000 / loopMinutes(legs) + index / Math.max(1, count)) % 1;
  const point = pointAlong(desk.stops, legs, progress);
  const leg = legs[point.legIndex];
  const from = leg ? stopById(desk.stops, leg.from) : null;
  const to = leg ? stopById(desk.stops, leg.to) : null;
  const speedMps = from && to && leg ? (haversineKm(from, to) * 1000) / (leg.minutes * 60) : null;
  return {
    puckId,
    lat: point.lat,
    lng: point.lng,
    heading: point.heading,
    speedMps,
    source: "sim",
    stopId: null,
    at: now,
  };
}

export function resolvedFix(desk: ShuttleDesk, puckId: string, index: number, count: number, now = Date.now()): LiveFix {
  const live = desk.fixes
    .filter((fix) => fix.puckId === puckId)
    .sort((a, b) => b.at - a.at)[0];
  if (live && live.source !== "sim") {
    const age = now - live.at;
    const freshBeacon = (live.source === "beacon" || live.source === "falcon") && age < 90_000;
    const heldCheckin = live.source === "checkin" && age < 30 * 60_000;
    if (freshBeacon || heldCheckin) return live;
  }
  if (puckId.startsWith("Stealth")) {
    const depot = stopById(desk.stops, "depot");
    return {
      puckId,
      lat: depot?.lat ?? 28.428664,
      lng: depot?.lng ?? -81.470196,
      heading: null,
      speedMps: 0,
      source: "sim",
      stopId: "depot",
      at: now,
    };
  }
  return simulatedFix(puckId, index, count, desk, now);
}

export function modeLegs(mode: RouteMode, desk: ShuttleDesk) {
  return mode === "chiefs" ? desk.nightLegs : desk.loopLegs;
}

export function mph(speedMps: number | null) {
  if (speedMps == null || !Number.isFinite(speedMps)) return null;
  return Math.max(0, Math.round(speedMps * 2.23694));
}
