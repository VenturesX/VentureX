export type FlightSnapshot = {
  flightNumber: string;
  status: "ON_TIME" | "DELAYED" | "LANDED" | "CANCELLED" | "UNKNOWN";
  eta: string | null;
  terminal: string;
  gate: string;
  baggage: string;
  source: string;
};

export interface FlightProvider {
  name: string;
  lookup(flightNumber: string, date?: string): Promise<FlightSnapshot>;
}

const EMPTY = (flightNumber: string, source: string): FlightSnapshot => ({
  flightNumber,
  status: "UNKNOWN",
  eta: null,
  terminal: "",
  gate: "",
  baggage: "",
  source,
});

export class ManualFlightProvider implements FlightProvider {
  name = "manual";

  async lookup(flightNumber: string): Promise<FlightSnapshot> {
    return EMPTY(flightNumber.replace(/\s+/g, "").toUpperCase(), this.name);
  }
}

export class AeroDataBoxProvider implements FlightProvider {
  name = "aerodatabox";

  constructor(private apiKey: string, private host = process.env.AERODATABOX_HOST || "aerodatabox.p.rapidapi.com") {}

  async lookup(flightNumber: string, date?: string): Promise<FlightSnapshot> {
    const code = flightNumber.replace(/\s+/g, "").toUpperCase();
    const day = date || new Date().toISOString().slice(0, 10);
    const response = await fetch(`https://${this.host}/flights/number/${encodeURIComponent(code)}/${day}`, {
      headers: { "X-RapidAPI-Key": this.apiKey, "X-RapidAPI-Host": this.host },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return EMPTY(code, this.name);
    const json = (await response.json()) as unknown;
    const row = Array.isArray(json) ? json[0] : json;
    return mapLoose(code, row, this.name);
  }
}

export class FlightAwareProvider implements FlightProvider {
  name = "flightaware";

  constructor(private apiKey: string) {}

  async lookup(flightNumber: string, date?: string): Promise<FlightSnapshot> {
    const code = flightNumber.replace(/\s+/g, "").toUpperCase();
    const day = date || new Date().toISOString().slice(0, 10);
    const start = `${day}T00:00:00Z`;
    const endDate = new Date(`${day}T00:00:00Z`);
    endDate.setUTCDate(endDate.getUTCDate() + 1);
    const end = endDate.toISOString().slice(0, 19) + "Z";
    const response = await fetch(
      `https://aeroapi.flightaware.com/aeroapi/flights/${encodeURIComponent(code)}?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
      { headers: { "x-apikey": this.apiKey }, signal: AbortSignal.timeout(8000) },
    );
    if (!response.ok) return EMPTY(code, this.name);
    const json = (await response.json()) as { flights?: unknown[] };
    const row = (json.flights ?? []).find((flight) => {
      const arrival = (flight as { destination?: { code?: string } }).destination?.code ?? "";
      return arrival.includes("MCO");
    }) ?? json.flights?.[0];
    return mapLoose(code, row, this.name);
  }
}

export function getFlightProvider(): FlightProvider {
  if (process.env.AERODATABOX_API_KEY) return new AeroDataBoxProvider(process.env.AERODATABOX_API_KEY);
  if (process.env.FLIGHTAWARE_API_KEY) return new FlightAwareProvider(process.env.FLIGHTAWARE_API_KEY);
  return new ManualFlightProvider();
}

function mapLoose(code: string, row: unknown, source: string): FlightSnapshot {
  if (!row || typeof row !== "object") return EMPTY(code, source);
  const record = row as Record<string, unknown>;
  const arrival = (record.arrival ?? record.destination ?? {}) as Record<string, unknown>;
  const statusText = String(record.status ?? arrival.status ?? "").toUpperCase();
  let status: FlightSnapshot["status"] = "UNKNOWN";
  if (/CANCEL/.test(statusText)) status = "CANCELLED";
  else if (/LAND|ARRIV|GATE/.test(statusText)) status = "LANDED";
  else if (/DELAY/.test(statusText)) status = "DELAYED";
  else if (statusText) status = "ON_TIME";
  const eta = stringOf(arrival.revisedTime ?? arrival.estimatedTime ?? arrival.actualTime ?? record.estimated_on ?? record.actual_on);
  return {
    flightNumber: code,
    status,
    eta,
    terminal: stringOf(arrival.terminal ?? record.terminal_destination) ?? "",
    gate: stringOf(arrival.gate ?? record.gate_destination) ?? "",
    baggage: stringOf(arrival.baggage ?? arrival.carousel ?? record.baggage_claim) ?? "",
    source,
  };
}

function stringOf(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  return null;
}
