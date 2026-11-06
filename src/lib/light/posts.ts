export const POSTS = [
  { code: "A_HIGH", label: "A High" },
  { code: "A_LOW", label: "A Low" },
  { code: "B_HIGH", label: "B High" },
  { code: "B_LOW", label: "B Low" },
  { code: "C", label: "C" },
] as const;

export const BOARD_TABS = [
  { id: "A", label: "A" },
  { id: "B_HIGH", label: "B High" },
  { id: "B_LOW", label: "B Low" },
  { id: "C", label: "C" },
  { id: "ALL", label: "All" },
] as const;

export const DEFAULT_AIRLINES = [
  { airline: "AA", postCode: "B_HIGH" },
  { airline: "DL", postCode: "B_LOW" },
  { airline: "WN", postCode: "A" },
  { airline: "B6", postCode: "C" },
];

export const DEFAULT_RULES = [
  { vehicleKind: "SUV", pickupNote: "SUVs use the tunnel." },
  { vehicleKind: "SPRINTER", pickupNote: "Sprinters use parking. B High B50-54. B Low B89-93." },
  { vehicleKind: "BUS", pickupNote: "Buses use bus slots. Dispatcher assigns." },
];

const AIRLINE_NAMES: Record<string, string> = {
  AA: "American",
  DL: "Delta",
  UA: "United",
  WN: "Southwest",
  SW: "Southwest",
  B6: "JetBlue",
  NK: "Spirit",
  F9: "Frontier",
  AS: "Alaska",
  AC: "Air Canada",
};

export function airlineCode(flight: string): string {
  const match = flight.toUpperCase().replace(/\s+/g, "").match(/^([A-Z]{1,3})\d/);
  return match?.[1] ?? "";
}

export function airlineName(code: string): string {
  return AIRLINE_NAMES[code.toUpperCase()] ?? code.toUpperCase();
}

export function normalizeFlight(value: string): string {
  const compact = value.toUpperCase().replace(/\s+/g, "");
  const match = compact.match(/^([A-Z]{1,3})(\d{1,5})$/);
  if (!match) return compact;
  const prefix = match[1] === "SW" ? "WN" : match[1];
  return `${prefix}${match[2]}`;
}

export function displayFlight(code: string): string {
  const match = code.toUpperCase().match(/^([A-Z]{1,3})(\d+)$/);
  if (!match) return code;
  const prefix = match[1] === "WN" ? "SW" : match[1];
  return `${prefix} ${match[2]}`;
}

export function postFromSide(side: string): string {
  const value = side.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (value === "B1" || value === "BHIGH") return "B_HIGH";
  if (value === "B2" || value === "BLOW") return "B_LOW";
  if (value === "A1" || value === "AHIGH") return "A_HIGH";
  if (value === "A2" || value === "ALOW") return "A_LOW";
  if (value === "A") return "A";
  if (value === "C" || value === "C1") return "C";
  return "";
}

export function postFor(side: string, flight: string, defaults: { airline: string; postCode: string }[]): string {
  const fromSide = postFromSide(side);
  if (fromSide) return fromSide;
  const airline = airlineCode(flight);
  const hit = defaults.find((row) => row.airline.toUpperCase() === airline);
  return hit?.postCode ?? "";
}

export function tripInTab(postCode: string, tab: string): boolean {
  if (tab === "ALL" || !tab) return true;
  if (tab === "A") return postCode === "A" || postCode === "A_HIGH" || postCode === "A_LOW";
  return postCode === tab;
}

export function ruleKind(vehicleLabel: string): "SUV" | "SPRINTER" | "BUS" {
  const value = vehicleLabel.toLowerCase();
  if (value.includes("bus") && !value.includes("sprinter")) return "BUS";
  if (value.includes("sprinter") || value.includes("charter")) return "SPRINTER";
  return "SUV";
}

export function roleStartPost(role: string, hinted?: string): string {
  const hintedPost = hinted ? postFromSide(hinted) || postLabelToCode(hinted) : "";
  if (hintedPost) return hintedPost;
  if (role === "greeter" || role === "loader") return "B_HIGH";
  return "ALL";
}

export function postLabelToCode(value: string): string {
  const text = value.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  if (text === "a" || text === "a side") return "A";
  if (text === "a high" || text === "ahigh") return "A_HIGH";
  if (text === "a low" || text === "alow") return "A_LOW";
  if (text === "b high" || text === "bhigh" || text === "b1") return "B_HIGH";
  if (text === "b low" || text === "blow" || text === "b2") return "B_LOW";
  if (text === "c") return "C";
  if (text === "all") return "ALL";
  return "";
}

export const FLAG_LABEL: Record<string, string> = {
  VIP: "VIP",
  TERMINAL_C: "Terminal C",
  SATELLITE: "Satellite drop",
  NO_TRANSFER: "No transfer",
  CAR_SEAT: "Car seat",
  BOOSTER: "Booster",
  STANDBY: "Standby",
};

export function flagsFromText(input: { notes: string; vehicle: string; airSide: string; carSeats: number; boosters: number }): string[] {
  const notes = `${input.notes} ${input.vehicle}`.toLowerCase();
  const flags = new Set<string>();
  if (/\bvip\b/.test(notes)) flags.add("VIP");
  if (input.airSide.toUpperCase().replace(/[^A-Z0-9]/g, "") === "C" || /terminal\s*c/.test(notes)) flags.add("TERMINAL_C");
  if (/satellite/.test(notes)) flags.add("SATELLITE");
  if (/no\s*transfer/.test(notes)) flags.add("NO_TRANSFER");
  if (input.carSeats > 0 || /car\s*seat/.test(notes)) flags.add("CAR_SEAT");
  if (input.boosters > 0 || /booster/.test(notes)) flags.add("BOOSTER");
  if (/standby/.test(notes)) flags.add("STANDBY");
  return [...flags];
}
