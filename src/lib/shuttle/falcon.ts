import { FALCON_HOST, PUCK_IDS } from "./route3";
import type { LiveFix, ShuttleStop } from "./types";

export type FalconRead = {
  vehicles: LiveFix[];
  stops: ShuttleStop[];
  note: string;
};

export function falconUrlError(raw: string) {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return "That is not a usable EventFalcon link.";
  }
  if (url.protocol !== "https:" || url.hostname !== FALCON_HOST) {
    return `Only read-only links on https://${FALCON_HOST} are pulled. Paste a JSON feed if the view lives somewhere else.`;
  }
  if (/login|auth|logincode/i.test(`${url.pathname}${url.search}`)) {
    return "That link would touch EventFalcon sign-in. PaxCountApp allows one device at a time, so this board will not call LoginCodeAuth or send your cookie.";
  }
  return null;
}

export function parseFalconPayload(input: unknown, now = Date.now()): FalconRead {
  const root = asRecord(input);
  const vehicles = new Map<string, LiveFix>();
  const stops: ShuttleStop[] = [];

  const pois = arrayOf(root.poiRawData ?? root.POIRawData ?? root.pois);
  pois.forEach((poi, index) => {
    const record = asRecord(poi);
    const center = pair(record.centerPoint ?? record.CenterPoint ?? record.point);
    if (!center) return;
    const name = text(record.Text ?? record.text ?? record.name) || `POI ${index + 1}`;
    const code = text(record.Value ?? record.value ?? record.id) || `POI-${index + 1}`;
    stops.push({
      id: `falcon-${slug(code)}`,
      code,
      name,
      address: text(record.address),
      lat: center.lat,
      lng: center.lng,
      boarding: "Imported from EventFalcon",
      staffName: "",
      staffPhone: "",
      walkOvers: [],
      kind: "stop",
      custom: true,
    });
  });

  const vehiclesIn = [
    ...arrayOf(root.vehicleData),
    ...arrayOf(root.vehicles),
    ...arrayOf(root.GetHisData),
    ...arrayOf(root.GetLeaderHisData),
  ];
  if (root.vehicleData && !Array.isArray(root.vehicleData) && typeof root.vehicleData === "object") {
    vehiclesIn.push(root.vehicleData);
  }
  for (const item of vehiclesIn) {
    const record = asRecord(item);
    const name = text(record.vehicleName ?? record.VehicleName ?? record.name ?? record.puckId);
    const puckId = matchPuck(name) ?? matchPuck(text(record.vehicleID ?? record.VehicleID));
    if (!puckId) continue;
    const point = pair(record.centerPoint ?? record.point ?? record.location) ?? pair([record.lat ?? record.latitude, record.lng ?? record.lon ?? record.longitude]);
    if (!point) continue;
    const speed = numberOrNull(record.speed ?? record.Speed);
    vehicles.set(puckId, {
      puckId,
      lat: point.lat,
      lng: point.lng,
      heading: numberOrNull(record.heading ?? record.Heading ?? record.course),
      speedMps: speed == null ? null : speed > 80 ? speed / 2.23694 : speed,
      source: "falcon",
      stopId: null,
      at: now,
    });
  }

  return {
    vehicles: [...vehicles.values()],
    stops,
    note: vehicles.size
      ? `Read ${vehicles.size} puck position${vehicles.size === 1 ? "" : "s"} and ${stops.length} places. No EventFalcon session was opened.`
      : stops.length
        ? `Read ${stops.length} places. No vehicle positions were in this payload.`
        : "No Route 3 pucks or places were found in that payload.",
  };
}

function matchPuck(value: string) {
  const hit = PUCK_IDS.find((id) => id.toLowerCase() === value.toLowerCase());
  return hit ?? null;
}

function pair(value: unknown): { lat: number; lng: number } | null {
  if (Array.isArray(value) && value.length >= 2) {
    const first = Number(value[0]);
    const second = Number(value[1]);
    if (!Number.isFinite(first) || !Number.isFinite(second)) return null;
    if (Math.abs(first) > 90 && Math.abs(second) <= 90) return { lat: second, lng: first };
    return { lat: first, lng: second };
  }
  const record = asRecord(value);
  const lat = Number(record.lat ?? record.latitude);
  const lng = Number(record.lng ?? record.lon ?? record.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function arrayOf(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function text(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function numberOrNull(value: unknown) {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(number) ? number : null;
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "poi";
}
