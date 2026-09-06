export type FlightSnapshot = {
  flightNumber: string;
  status: "ON_TIME" | "DELAYED" | "LANDED" | "CANCELLED" | "UNKNOWN";
  eta: string | null;
  terminal: string;
  gate: string;
  source: string;
};

export interface FlightProvider {
  name: string;
  lookup(flightNumber: string): Promise<FlightSnapshot>;
}

export class MockFlightProvider implements FlightProvider {
  name = "mock-flight";

  async lookup(flightNumber: string): Promise<FlightSnapshot> {
    const code = flightNumber.replace(/\s+/g, "").toUpperCase();
    const seed = [...code].reduce((n, c) => n + c.charCodeAt(0), 0);
    const statuses: FlightSnapshot["status"][] = ["ON_TIME", "ON_TIME", "LANDED", "DELAYED", "ON_TIME"];
    const status = statuses[seed % statuses.length];
    const eta = new Date(Date.now() + ((seed % 40) - 10) * 60_000).toISOString();
    return {
      flightNumber: code,
      status,
      eta,
      terminal: "C",
      gate: `C${12 + (seed % 18)}`,
      source: this.name,
    };
  }
}

export function getFlightProvider(): FlightProvider {
  return new MockFlightProvider();
}
