export const DEFAULT_EXPERT_PHONE = "(407) 476-8727";
export const DEFAULT_EXPERT_TEL = "+14074768727";

export const SETTINGS_KEYS = {
  expertPhone: "expertPhone",
  officeHours: "officeHours",
  defaultDirectLine: "defaultDirectLine",
  fleet: "fleetDefaults",
  driveTable: "driveTable",
  loopTiming: "loopTiming",
} as const;

export type FleetId = "COACH" | "MINIBUS" | "SPRINTER" | "SUV";

export type FleetVehicle = {
  id: FleetId;
  label: string;
  seats: number;
  usable: number;
  isDefault: boolean;
};

export type DrivePair = {
  id: string;
  from: string;
  to: string;
  minutes: number;
  isDefault: boolean;
};

export type TimingSettings = {
  curbBufferMinutes: number;
  loadMinutes: number;
  unloadMinutes: number;
  bufferIsDefault: boolean;
  loadIsDefault: boolean;
  unloadIsDefault: boolean;
};

export type OfficeHours = {
  configured: boolean;
  start: string;
  end: string;
  days: number[];
  timezone: "America/New_York";
};

export const DEFAULT_FLEET: FleetVehicle[] = [
  { id: "COACH", label: "Motorcoach", seats: 56, usable: 50, isDefault: true },
  { id: "MINIBUS", label: "Minicoach", seats: 28, usable: 24, isDefault: true },
  { id: "SPRINTER", label: "Sprinter", seats: 14, usable: 12, isDefault: true },
  { id: "SUV", label: "SUV", seats: 6, usable: 5, isDefault: true },
];

export const DEFAULT_TIMING: TimingSettings = {
  curbBufferMinutes: 4,
  loadMinutes: 5,
  unloadMinutes: 5,
  bufferIsDefault: true,
  loadIsDefault: true,
  unloadIsDefault: true,
};

/** Typical drive minutes for common Orlando pairs. Admin can replace any row. */
export const DEFAULT_DRIVE_TABLE: DrivePair[] = [
  { id: "mco-idrive", from: "MCO", to: "International Drive", minutes: 25, isDefault: true },
  { id: "mco-occc", from: "MCO", to: "Orange County Convention Center", minutes: 20, isDefault: true },
  { id: "mco-universal", from: "MCO", to: "Universal Orlando", minutes: 25, isDefault: true },
  { id: "mco-lbv", from: "MCO", to: "Lake Buena Vista", minutes: 30, isDefault: true },
  { id: "idrive-occc", from: "International Drive", to: "Orange County Convention Center", minutes: 8, isDefault: true },
  { id: "idrive-universal", from: "International Drive", to: "Universal Orlando", minutes: 12, isDefault: true },
  { id: "lbv-springs", from: "Lake Buena Vista", to: "Disney Springs", minutes: 10, isDefault: true },
  { id: "springs-epcot", from: "Disney Springs", to: "EPCOT", minutes: 12, isDefault: true },
  { id: "springs-mk", from: "Disney Springs", to: "Magic Kingdom", minutes: 18, isDefault: true },
];

export const OWNER_OFFICE_HOURS: OfficeHours = {
  configured: true,
  start: "06:00",
  end: "18:00",
  days: [1, 2, 3, 4, 5],
  timezone: "America/New_York",
};

const ALIASES: Record<string, string[]> = {
  mco: ["mco", "orlando international", "airport"],
  "international drive": ["international drive", "i-drive", "idrive", "international dr"],
  "orange county convention center": ["orange county convention", "occc", "convention center"],
  "universal orlando": ["universal"],
  "lake buena vista": ["lake buena vista", "buena vista", "hotel plaza"],
  "disney springs": ["disney springs"],
  "magic kingdom": ["magic kingdom"],
  epcot: ["epcot"],
};

export type QuotePlanInput = {
  serviceType: string;
  passengerCount: number;
  pickup: string;
  dropoff: string;
  stops: string[];
  waitMinutes?: number;
  driveMinutes?: number;
  vehiclePreference: string;
  email: string;
  phone: string;
  startDate: string;
  unsureSteps: string[];
};

export type QuotePlan = {
  headline: string;
  math: string | null;
  detail: string;
  recommendation: string;
  vehicleCount: number;
  vehicleLabel: string;
  usableSeats: number | null;
  repCount: number;
  cycleMinutes: number | null;
  driveSource: "manual" | "table" | "maps" | "missing" | "none";
  needsExpert: boolean;
};

type DriveLeg = { drive: number; source: "manual" | "table" | "maps" };

export function phoneToTel(display: string) {
  const digits = display.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

export function formatPhoneDisplay(raw: string) {
  const digits = raw.replace(/\D/g, "");
  const local = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (local.length === 10) return `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
  return raw.trim();
}

/** Missing row uses the owner number. A blank value means an admin cleared it. */
export function resolvePhone(stored: string | null | undefined) {
  if (stored == null) return DEFAULT_EXPERT_PHONE;
  const trimmed = stored.trim();
  if (!trimmed) return "";
  return formatPhoneDisplay(trimmed);
}

export function resolveHours(stored: string | null | undefined): OfficeHours | null {
  if (stored == null) return OWNER_OFFICE_HOURS;
  const trimmed = stored.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed) as Partial<OfficeHours>;
    if (parsed.configured === false) return null;
    const start = typeof parsed.start === "string" && isHm(parsed.start) ? parsed.start : OWNER_OFFICE_HOURS.start;
    const end = typeof parsed.end === "string" && isHm(parsed.end) ? parsed.end : OWNER_OFFICE_HOURS.end;
    const days = Array.isArray(parsed.days)
      ? parsed.days.filter((day): day is number => typeof day === "number" && day >= 0 && day <= 6)
      : OWNER_OFFICE_HOURS.days;
    if (!days.length || toMinutes(start) >= toMinutes(end)) return null;
    return { configured: true, start, end, days, timezone: "America/New_York" };
  } catch {
    return OWNER_OFFICE_HOURS;
  }
}

export function formatOfficeHours(hours: OfficeHours) {
  return `${formatDayList(hours.days)} ${formatClock(hours.start)}-${formatClock(hours.end)} ET`;
}

/** null means hours are not configured, so the call button and callback stay together. */
export function isLiveLineOpen(hours: OfficeHours | null, now = new Date()): boolean | null {
  if (!hours?.configured) return null;
  const parts = easternParts(now);
  if (!hours.days.includes(parts.day)) return false;
  const start = toMinutes(hours.start);
  const end = toMinutes(hours.end);
  return parts.minutes >= start && parts.minutes < end;
}

export function easternParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "Sun";
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { day: dayMap[weekday] ?? 0, minutes: ((hour === 24 ? 0 : hour) * 60) + minute };
}

export function parseFleet(stored: string | null | undefined): FleetVehicle[] {
  if (!stored) return DEFAULT_FLEET.map((row) => ({ ...row }));
  try {
    const parsed = JSON.parse(stored) as FleetVehicle[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_FLEET.map((row) => ({ ...row }));
    return DEFAULT_FLEET.map((fallback) => {
      const row = parsed.find((item) => item.id === fallback.id);
      if (!row) return { ...fallback };
      const seats = clampInt(row.seats, 1, 80, fallback.seats);
      const usable = clampInt(row.usable, 1, seats, Math.min(fallback.usable, seats));
      const same = seats === fallback.seats && usable === fallback.usable;
      return { id: fallback.id, label: fallback.label, seats, usable, isDefault: same && row.isDefault !== false };
    });
  } catch {
    return DEFAULT_FLEET.map((row) => ({ ...row }));
  }
}

export function parseDriveTable(stored: string | null | undefined): DrivePair[] {
  if (!stored) return DEFAULT_DRIVE_TABLE.map((row) => ({ ...row }));
  try {
    const parsed = JSON.parse(stored) as DrivePair[];
    if (!Array.isArray(parsed)) return DEFAULT_DRIVE_TABLE.map((row) => ({ ...row }));
    return parsed
      .map((row, index) => ({
        id: String(row.id || `pair-${index}`),
        from: String(row.from || "").trim().slice(0, 80),
        to: String(row.to || "").trim().slice(0, 80),
        minutes: clampInt(row.minutes, 1, 300, 0),
        isDefault: Boolean(row.isDefault),
      }))
      .filter((row) => row.from && row.to && row.minutes > 0)
      .slice(0, 40);
  } catch {
    return DEFAULT_DRIVE_TABLE.map((row) => ({ ...row }));
  }
}

export function parseTiming(stored: string | null | undefined): TimingSettings {
  if (!stored) return { ...DEFAULT_TIMING };
  try {
    const parsed = JSON.parse(stored) as Partial<TimingSettings>;
    const curbBufferMinutes = clampInt(parsed.curbBufferMinutes, 0, 30, DEFAULT_TIMING.curbBufferMinutes);
    const loadMinutes = clampInt(parsed.loadMinutes, 0, 60, DEFAULT_TIMING.loadMinutes);
    const unloadMinutes = clampInt(parsed.unloadMinutes, 0, 60, DEFAULT_TIMING.unloadMinutes);
    return {
      curbBufferMinutes,
      loadMinutes,
      unloadMinutes,
      bufferIsDefault: curbBufferMinutes === DEFAULT_TIMING.curbBufferMinutes,
      loadIsDefault: loadMinutes === DEFAULT_TIMING.loadMinutes,
      unloadIsDefault: unloadMinutes === DEFAULT_TIMING.unloadMinutes,
    };
  } catch {
    return { ...DEFAULT_TIMING };
  }
}

export function matchDrivePair(from: string, to: string, table: DrivePair[]) {
  let best: DrivePair | null = null;
  let bestScore = 0;
  for (const pair of table) {
    const forward = hitScore(from, pair.from) + hitScore(to, pair.to);
    const back = hitScore(from, pair.to) + hitScore(to, pair.from);
    const score = Math.max(forward, back);
    if (score > bestScore) {
      best = pair;
      bestScore = score;
    }
  }
  return bestScore > 0 ? best : null;
}

export function recommendQuote(input: QuotePlanInput, fleet: FleetVehicle[], timing: TimingSettings, legs: DriveLeg[] | null): QuotePlan {
  const vehicle = chooseVehicle(input.vehiclePreference, input.passengerCount, fleet);
  const blanks = requestHasBlanks(input);
  if (input.serviceType === "SHUTTLE_LOOP") {
    return recommendLoop(input, vehicle, timing, legs, blanks);
  }
  return recommendPoint(input, vehicle, blanks);
}

export function requestHasBlanks(input: QuotePlanInput) {
  if (!input.serviceType || input.serviceType === "UNSURE") return true;
  if (!input.passengerCount) return true;
  if (input.pickup.trim().length < 2 || input.dropoff.trim().length < 2) return true;
  if (!input.startDate) return true;
  if (!input.email && !input.phone) return true;
  if (input.serviceType === "SHUTTLE_LOOP" && !input.waitMinutes) return true;
  return false;
}

function recommendPoint(input: QuotePlanInput, vehicle: FleetVehicle, blanks: boolean): QuotePlan {
  if (!input.passengerCount) {
    const text = "Tell us about how many guests, and we can suggest a vehicle. This is a recommendation, not a confirmed plan.";
    return planShell(text, null, vehicle, 0, 0, null, "none", blanks || input.unsureSteps.length > 0);
  }
  const count = Math.max(1, Math.ceil(input.passengerCount / vehicle.usable));
  const noun = vehicleNoun(vehicle.label, count);
  const headline = `We suggest ${count} ${noun} for ${input.passengerCount} guests.`;
  const detail = `We plan on ${vehicle.usable} usable seats out of ${vehicle.seats}. This is a recommendation, not a confirmed plan.`;
  return finishPlan(headline, null, detail, count, vehicle, null, "none", blanks || input.unsureSteps.length > 0);
}

function recommendLoop(input: QuotePlanInput, vehicle: FleetVehicle, timing: TimingSettings, legs: DriveLeg[] | null, blanks: boolean): QuotePlan {
  const stopCount = 2 + input.stops.filter((stop) => stop.trim().length >= 2).length;
  const dwell = timing.loadMinutes + timing.unloadMinutes;
  if (!legs || legs.length < 2) {
    const text = "Add the drive minutes each way, or send this to a Venture Expert. We won't guess a loop time.";
    return planShell(text, null, vehicle, 0, 0, null, "missing", true);
  }
  const source = legs.every((leg) => leg.source === legs[0].source) ? legs[0].source : "table";
  const cycle = legs.reduce((sum, leg) => sum + leg.drive + timing.curbBufferMinutes, 0) + stopCount * dwell;
  const math = formatLoopMath(legs, timing, stopCount);
  const byHeadway = input.waitMinutes ? Math.ceil(cycle / input.waitMinutes) : 0;
  const byCapacity = input.passengerCount ? Math.ceil(input.passengerCount / vehicle.usable) : 0;
  const count = Math.max(byHeadway, byCapacity);
  if (!count) {
    const headline = `Full loop about ${cycle} min.`;
    const detail = "Share a guest count and a wait of 15, 20, or 30 minutes and we can suggest vehicles. This is a recommendation, not a confirmed plan.";
    return finishPlan(headline, math, detail, 0, vehicle, cycle, source, true);
  }
  const noun = vehicleNoun(vehicle.label, count);
  const headline = `We suggest ${count} ${noun}.`;
  const bits = [`Full loop about ${cycle} min.`];
  if (byHeadway && input.waitMinutes) bits.push(`A ${input.waitMinutes}-minute wait needs ${byHeadway}.`);
  if (byCapacity && input.passengerCount) bits.push(`${input.passengerCount} guests need room on ${byCapacity} at ${vehicle.usable} usable seats.`);
  bits.push("This is a recommendation, not a confirmed plan.");
  if (source === "table") bits.push("Drive time is the default for this route pair.");
  if (source === "manual") bits.push("Drive time is the number you entered.");
  if (source === "maps") bits.push("Drive time is from live driving directions.");
  return finishPlan(headline, math, bits.join(" "), count, vehicle, cycle, source, blanks || input.unsureSteps.length > 0);
}

function formatLoopMath(legs: DriveLeg[], timing: TimingSettings, stopCount: number) {
  const dwell = timing.loadMinutes + timing.unloadMinutes;
  const buffer = timing.curbBufferMinutes;
  const same = legs.every((leg) => leg.drive === legs[0].drive);
  const extras = Math.max(0, stopCount - 2);
  if (same && legs.length === 2) {
    const extra = extras ? `, plus ${dwell} min load/unload at ${extras} extra stop${extras === 1 ? "" : "s"}` : "";
    return `${legs[0].drive} min drive + ${buffer} buffer + ${dwell} load/unload each way${extra}`;
  }
  const rendered = legs.map((leg, index) => {
    const label = index === legs.length - 1 ? "Back" : `Leg ${index + 1}`;
    return `${label}: ${leg.drive} min drive + ${buffer} buffer`;
  });
  return `${rendered.join(". ")}. ${dwell} min load/unload at each of ${stopCount} stops`;
}

function finishPlan(
  headline: string,
  math: string | null,
  detail: string,
  vehicleCount: number,
  vehicle: FleetVehicle,
  cycleMinutes: number | null,
  driveSource: QuotePlan["driveSource"],
  needsExpert: boolean,
): QuotePlan {
  const repCount = vehicleCount > 0 ? Math.ceil(vehicleCount / 3) : 0;
  const repLine = repCount
    ? ` We suggest ${repCount} Venture Rep${repCount === 1 ? "" : "s"} on site (1 per 1 to 3 vehicles).`
    : "";
  const recommendation = [headline, math, detail].filter(Boolean).join(" ") + repLine;
  return {
    headline,
    math,
    detail: detail + repLine,
    recommendation,
    vehicleCount,
    vehicleLabel: vehicle.label,
    usableSeats: vehicle.usable,
    repCount,
    cycleMinutes,
    driveSource,
    needsExpert,
  };
}

function planShell(
  text: string,
  math: string | null,
  vehicle: FleetVehicle,
  vehicleCount: number,
  repCount: number,
  cycleMinutes: number | null,
  driveSource: QuotePlan["driveSource"],
  needsExpert: boolean,
): QuotePlan {
  return {
    headline: text,
    math,
    detail: text,
    recommendation: text,
    vehicleCount,
    vehicleLabel: vehicle.label,
    usableSeats: vehicle.usable,
    repCount,
    cycleMinutes,
    driveSource,
    needsExpert,
  };
}

function chooseVehicle(preference: string, guests: number, fleet: FleetVehicle[]) {
  const chosen = fleet.find((row) => row.id === preference);
  if (chosen) return chosen;
  if (!guests) return fleet.find((row) => row.id === "COACH") ?? fleet[0];
  const ordered = [...fleet].sort((a, b) => a.usable - b.usable);
  return ordered.find((row) => row.usable >= guests) ?? ordered[ordered.length - 1];
}

function vehicleNoun(label: string, count: number) {
  if (count === 1) return label.toLowerCase();
  if (label === "Motorcoach") return "motorcoaches";
  if (label === "Minicoach") return "minicoaches";
  if (label === "SUV") return "SUVs";
  return `${label.toLowerCase()}s`;
}

function hitScore(place: string, canonical: string) {
  const hay = place.toLowerCase();
  const key = canonical.toLowerCase();
  if (!hay.trim() || !key) return 0;
  if (hay.includes(key)) return key.length + 20;
  const aliases = ALIASES[key] ?? [];
  const matched = aliases.find((alias) => hay.includes(alias));
  return matched ? matched.length : 0;
}

function formatDayList(days: number[]) {
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  if (sorted.join(",") === "1,2,3,4,5") return "Mon-Fri";
  return sorted.map((day) => names[day]).join(", ");
}

function formatClock(value: string) {
  const [hourRaw, minuteRaw] = value.split(":").map(Number);
  const suffix = hourRaw >= 12 ? "pm" : "am";
  const hour = hourRaw % 12 || 12;
  if (!minuteRaw) return `${hour}${suffix}`;
  return `${hour}:${String(minuteRaw).padStart(2, "0")}${suffix}`;
}

function toMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function isHm(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}
