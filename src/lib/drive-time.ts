import { matchDrivePair, recommendQuote, type DrivePair, type FleetVehicle, type QuotePlan, type QuotePlanInput, type TimingSettings } from "@/lib/guidance";

type Leg = { drive: number; source: "manual" | "table" | "maps" };

export async function planQuote(input: QuotePlanInput, fleet: FleetVehicle[], timing: TimingSettings, table: DrivePair[]): Promise<QuotePlan> {
  const legs = input.serviceType === "SHUTTLE_LOOP" ? await resolveLegs(input, table) : null;
  return recommendQuote(input, fleet, timing, legs);
}

async function resolveLegs(input: QuotePlanInput, table: DrivePair[]): Promise<Leg[] | null> {
  const points = [input.pickup, ...input.stops, input.dropoff].map((point) => point.trim()).filter((point) => point.length >= 2);
  if (points.length < 2) return null;
  if (input.driveMinutes && input.driveMinutes > 0) {
    return [
      { drive: input.driveMinutes, source: "manual" },
      { drive: input.driveMinutes, source: "manual" },
    ];
  }
  const pairs: Array<[string, string]> = [];
  for (let index = 0; index < points.length - 1; index += 1) pairs.push([points[index], points[index + 1]]);
  pairs.push([points[points.length - 1], points[0]]);
  const legs: Leg[] = [];
  for (const [from, to] of pairs) {
    const mapped = await lookupDriveMinutes(from, to);
    if (mapped != null) {
      legs.push({ drive: mapped, source: "maps" });
      continue;
    }
    const row = matchDrivePair(from, to, table);
    if (!row) return null;
    legs.push({ drive: row.minutes, source: "table" });
  }
  return legs;
}

export async function lookupDriveMinutes(from: string, to: string): Promise<number | null> {
  const googleKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (googleKey) {
    try {
      const minutes = await googleDriveMinutes(from, to, googleKey);
      if (minutes != null) return minutes;
    } catch (error) {
      console.error("Google drive-time lookup failed; using the drive-minutes table.");
      if (process.env.NODE_ENV === "development") console.error(error);
    }
  }
  const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN?.trim();
  if (mapboxToken) {
    try {
      return await mapboxDriveMinutes(from, to, mapboxToken);
    } catch (error) {
      console.error("Mapbox drive-time lookup failed; using the drive-minutes table.");
      if (process.env.NODE_ENV === "development") console.error(error);
    }
  }
  return null;
}

async function googleDriveMinutes(from: string, to: string, key: string) {
  const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
  url.searchParams.set("origins", from);
  url.searchParams.set("destinations", to);
  url.searchParams.set("mode", "driving");
  url.searchParams.set("units", "imperial");
  url.searchParams.set("key", key);
  const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
  if (!response.ok) return null;
  const json = (await response.json()) as {
    rows?: Array<{ elements?: Array<{ status?: string; duration?: { value?: number } }> }>;
  };
  const element = json.rows?.[0]?.elements?.[0];
  if (element?.status !== "OK" || !element.duration?.value) return null;
  return Math.max(1, Math.round(element.duration.value / 60));
}

async function mapboxDriveMinutes(from: string, to: string, token: string) {
  const origin = await mapboxPoint(from, token);
  const destination = await mapboxPoint(to, token);
  if (!origin || !destination) return null;
  const path = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const url = new URL(`https://api.mapbox.com/directions/v5/mapbox/driving/${path}`);
  url.searchParams.set("access_token", token);
  url.searchParams.set("overview", "false");
  const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
  if (!response.ok) return null;
  const json = (await response.json()) as { routes?: Array<{ duration?: number }> };
  const duration = json.routes?.[0]?.duration;
  if (!duration) return null;
  return Math.max(1, Math.round(duration / 60));
}

async function mapboxPoint(query: string, token: string) {
  const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`);
  url.searchParams.set("access_token", token);
  url.searchParams.set("limit", "1");
  url.searchParams.set("country", "us");
  url.searchParams.set("proximity", "-81.47,28.45");
  const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
  if (!response.ok) return null;
  const json = (await response.json()) as { features?: Array<{ center?: [number, number] }> };
  const center = json.features?.[0]?.center;
  if (!center) return null;
  return { lng: center[0], lat: center[1] };
}
