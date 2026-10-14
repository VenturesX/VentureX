import { z } from "zod";

export const QUOTE_PROFILES = ["PLANNER", "DESTINATION_PARTNER", "GROUP"] as const;
export const QUOTE_SERVICE_TYPES = ["AIRPORT_TRANSFER", "DINE_AROUND", "SHUTTLE_LOOP", "POINT_TO_POINT", "CHARTER", "OTHER", "UNSURE"] as const;
export const QUOTE_VEHICLES = ["COACH", "MINIBUS", "SPRINTER", "SUV", "NO_PREFERENCE"] as const;
export const QUOTE_LUGGAGE = ["NONE", "CARRY_ON", "FULL"] as const;
export const QUOTE_STATUSES = ["NEW", "QUOTED", "WON", "LOST"] as const;

export type QuoteProfile = (typeof QUOTE_PROFILES)[number];
export type QuoteServiceType = (typeof QUOTE_SERVICE_TYPES)[number];
export type QuoteVehiclePreference = (typeof QUOTE_VEHICLES)[number];
export type QuoteLuggage = (typeof QUOTE_LUGGAGE)[number];
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const PROFILE_OPTIONS: { value: QuoteProfile; label: string; hint: string }[] = [
  {
    value: "PLANNER",
    label: "Planner / Company",
    hint: "Meeting planners, event planners, and companies booking a group move.",
  },
  {
    value: "DESTINATION_PARTNER",
    label: "Destination partner",
    hint: "Destination companies that send us the transportation to run.",
  },
  {
    value: "GROUP",
    label: "Group / Individual",
    hint: "A school, tour, family, or other group traveling together.",
  },
];

export const SERVICE_OPTIONS: { value: QuoteServiceType; label: string }[] = [
  { value: "AIRPORT_TRANSFER", label: "Airport transfers" },
  { value: "SHUTTLE_LOOP", label: "Shuttle loop" },
  { value: "POINT_TO_POINT", label: "Point-to-point" },
  { value: "DINE_AROUND", label: "Dine-around" },
  { value: "CHARTER", label: "Charter" },
  { value: "OTHER", label: "Other" },
  { value: "UNSURE", label: "Not sure yet" },
];

export const VEHICLE_OPTIONS: { value: QuoteVehiclePreference; label: string }[] = [
  { value: "NO_PREFERENCE", label: "No preference" },
  { value: "COACH", label: "Motorcoach" },
  { value: "MINIBUS", label: "Minicoach" },
  { value: "SPRINTER", label: "Sprinter or executive van" },
  { value: "SUV", label: "SUV" },
];

export const LUGGAGE_OPTIONS: { value: QuoteLuggage; label: string }[] = [
  { value: "NONE", label: "None" },
  { value: "CARRY_ON", label: "Carry-on" },
  { value: "FULL", label: "Full size" },
];

export const STATUS_OPTIONS: { value: QuoteStatus; label: string }[] = [
  { value: "NEW", label: "New" },
  { value: "QUOTED", label: "Quoted" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
];

export const MANIFEST_MAX_BYTES = 8 * 1024 * 1024;
export const MAX_STOPS = 8;
export const REP_PRICE_KEY = "repPriceCents";
const LOCATION_MAX = 240;

const MANIFEST_TYPES: Record<string, string[]> = {
  csv: ["text/csv", "application/csv", "text/plain", "application/vnd.ms-excel", "application/octet-stream", ""],
  xlsx: [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/octet-stream",
    "application/zip",
    "",
  ],
  pdf: ["application/pdf", "application/octet-stream", ""],
};

export const MANIFEST_MIME: Record<string, string> = {
  csv: "text/csv",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
};

export type QuoteInput = {
  profile: QuoteProfile;
  serviceType: QuoteServiceType;
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  pickup: string;
  dropoff: string;
  stops: string[];
  passengerCount: number;
  vehicleCount: number;
  vehiclePreference: QuoteVehiclePreference;
  luggage: QuoteLuggage;
  coordinatorNeeded: boolean;
  representativeCount: number;
  contactName: string;
  company?: string;
  email: string;
  phone: string;
  notes?: string;
  waitMinutes?: number;
  driveMinutes?: number;
  unsureSteps: string[];
};

const quoteSchema = z
  .object({
    profile: z.string(),
    serviceType: z.string(),
    startDate: z.string(),
    endDate: z.string().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    pickup: z.string(),
    dropoff: z.string(),
    stops: z.array(z.string()),
    passengerCount: z.string(),
    vehicleCount: z.string(),
    vehiclePreference: z.string(),
    luggage: z.string(),
    coordinatorNeeded: z.string(),
    representativeCount: z.string(),
    contactName: z.string(),
    company: z.string().optional(),
    email: z.string(),
    phone: z.string(),
    notes: z.string().optional(),
    waitMinutes: z.string().optional(),
    driveMinutes: z.string().optional(),
    unsureSteps: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.profile && !oneOf(data.profile, QUOTE_PROFILES)) {
      ctx.addIssue({ code: "custom", path: ["profile"], message: "Choose who this request is for" });
    }
    if (data.serviceType && !oneOf(data.serviceType, QUOTE_SERVICE_TYPES)) {
      ctx.addIssue({ code: "custom", path: ["serviceType"], message: "Choose a service" });
    }
    if (data.startDate) {
      if (!isIsoDate(data.startDate)) {
        ctx.addIssue({ code: "custom", path: ["startDate"], message: "Enter a start date" });
      } else if (data.startDate < orlandoToday()) {
        ctx.addIssue({ code: "custom", path: ["startDate"], message: "Start date must be today or later" });
      } else if (data.startDate > addYears(orlandoToday(), 3)) {
        ctx.addIssue({ code: "custom", path: ["startDate"], message: "Start date must be within the next 3 years" });
      }
    }
    if (data.endDate) {
      if (!isIsoDate(data.endDate)) {
        ctx.addIssue({ code: "custom", path: ["endDate"], message: "Enter a valid end date" });
      } else if (isIsoDate(data.startDate) && data.endDate < data.startDate) {
        ctx.addIssue({ code: "custom", path: ["endDate"], message: "End date must be on or after the start date" });
      }
    }
    if (data.startTime && !isTime(data.startTime)) {
      ctx.addIssue({ code: "custom", path: ["startTime"], message: "Enter a valid start time" });
    }
    if (data.endTime && !isTime(data.endTime)) {
      ctx.addIssue({ code: "custom", path: ["endTime"], message: "Enter a valid end time" });
    }
    if (data.pickup && (data.pickup.length < 2 || data.pickup.length > LOCATION_MAX)) {
      ctx.addIssue({ code: "custom", path: ["pickup"], message: data.pickup.length < 2 ? "Enter a pickup location" : "Pickup is too long" });
    }
    if (data.dropoff && (data.dropoff.length < 2 || data.dropoff.length > LOCATION_MAX)) {
      ctx.addIssue({ code: "custom", path: ["dropoff"], message: data.dropoff.length < 2 ? "Enter a drop-off location" : "Drop-off is too long" });
    }
    if (data.stops.length > MAX_STOPS) {
      ctx.addIssue({ code: "custom", path: ["stops"], message: `Add up to ${MAX_STOPS} stops` });
    }
    data.stops.forEach((stop, index) => {
      if (stop.length < 2) {
        ctx.addIssue({ code: "custom", path: ["stops"], message: `Enter stop ${index + 1}, or remove it` });
      } else if (stop.length > LOCATION_MAX) {
        ctx.addIssue({ code: "custom", path: ["stops"], message: `Stop ${index + 1} is too long` });
      }
    });
    if (data.passengerCount) {
      if (!/^\d+$/.test(data.passengerCount) || Number(data.passengerCount) < 1 || Number(data.passengerCount) > 50000) {
        ctx.addIssue({ code: "custom", path: ["passengerCount"], message: "Enter a passenger count from 1 to 50,000" });
      }
    }
    if (data.vehicleCount && (!/^\d+$/.test(data.vehicleCount) || Number(data.vehicleCount) > 200)) {
      ctx.addIssue({ code: "custom", path: ["vehicleCount"], message: "Enter a vehicle count from 0 to 200" });
    }
    if (data.vehiclePreference && !oneOf(data.vehiclePreference, QUOTE_VEHICLES)) {
      ctx.addIssue({ code: "custom", path: ["vehiclePreference"], message: "Choose a vehicle preference" });
    }
    if (data.luggage && !oneOf(data.luggage, QUOTE_LUGGAGE)) {
      ctx.addIssue({ code: "custom", path: ["luggage"], message: "Choose a luggage level" });
    }
    if (data.representativeCount && (!/^\d+$/.test(data.representativeCount) || Number(data.representativeCount) > 200)) {
      ctx.addIssue({ code: "custom", path: ["representativeCount"], message: "Enter 200 Venture Reps or fewer" });
    }
    if (data.contactName && data.contactName.length > 120) {
      ctx.addIssue({ code: "custom", path: ["contactName"], message: "Name is too long" });
    }
    if (data.company && data.company.length > 160) {
      ctx.addIssue({ code: "custom", path: ["company"], message: "Company name is too long" });
    }
    if (data.email && !z.email().safeParse(data.email).success) {
      ctx.addIssue({ code: "custom", path: ["email"], message: "Enter a valid email address" });
    }
    if (data.phone) {
      const digits = data.phone.replace(/\D/g, "");
      if (digits.length < 7 || digits.length > 15 || data.phone.length > 40) {
        ctx.addIssue({ code: "custom", path: ["phone"], message: "Enter a phone number we can call or text" });
      }
    }
    if (data.waitMinutes && !["15", "20", "30"].includes(data.waitMinutes)) {
      ctx.addIssue({ code: "custom", path: ["waitMinutes"], message: "Choose a 15, 20, or 30 minute wait" });
    }
    if (data.driveMinutes && (!/^\d+$/.test(data.driveMinutes) || Number(data.driveMinutes) < 1 || Number(data.driveMinutes) > 300)) {
      ctx.addIssue({ code: "custom", path: ["driveMinutes"], message: "Enter drive minutes from 1 to 300" });
    }
    if (data.notes && data.notes.length > 4000) {
      ctx.addIssue({ code: "custom", path: ["notes"], message: "Notes must be 4,000 characters or fewer" });
    }
  })
  .transform((data) => ({
    profile: (oneOf(data.profile, QUOTE_PROFILES) ? data.profile : "GROUP") as QuoteProfile,
    serviceType: (oneOf(data.serviceType, QUOTE_SERVICE_TYPES) ? data.serviceType : "UNSURE") as QuoteServiceType,
    startDate: data.startDate,
    endDate: data.endDate,
    startTime: data.startTime,
    endTime: data.endTime,
    pickup: data.pickup,
    dropoff: data.dropoff,
    stops: data.stops.filter((stop) => stop.length >= 2),
    passengerCount: /^\d+$/.test(data.passengerCount) ? Number(data.passengerCount) : 0,
    vehicleCount: /^\d+$/.test(data.vehicleCount) ? Number(data.vehicleCount) : 0,
    vehiclePreference: (oneOf(data.vehiclePreference, QUOTE_VEHICLES) ? data.vehiclePreference : "NO_PREFERENCE") as QuoteVehiclePreference,
    luggage: (oneOf(data.luggage, QUOTE_LUGGAGE) ? data.luggage : "NONE") as QuoteLuggage,
    coordinatorNeeded: data.coordinatorNeeded === "yes",
    representativeCount: /^\d+$/.test(data.representativeCount) ? Number(data.representativeCount) : 0,
    contactName: data.contactName,
    company: data.company,
    email: data.email ? data.email.toLowerCase() : "",
    phone: data.phone,
    notes: data.notes,
    waitMinutes: data.waitMinutes ? Number(data.waitMinutes) : undefined,
    driveMinutes: data.driveMinutes ? Number(data.driveMinutes) : undefined,
    unsureSteps: parseUnsureSteps(data.unsureSteps),
  }));

export function parseQuoteFields(form: FormData): { ok: true; data: QuoteInput } | { ok: false; fieldErrors: Record<string, string> } {
  const endDate = field(form, "endDate");
  const startTime = field(form, "startTime");
  const endTime = field(form, "endTime");
  const company = field(form, "company");
  const notes = field(form, "notes");
  const parsed = quoteSchema.safeParse({
    profile: field(form, "profile"),
    serviceType: field(form, "serviceType"),
    startDate: field(form, "startDate"),
    endDate: endDate || undefined,
    startTime: startTime || undefined,
    endTime: endTime || undefined,
    pickup: field(form, "pickup"),
    dropoff: field(form, "dropoff"),
    stops: form.getAll("stops").map((value) => String(value).trim()),
    passengerCount: field(form, "passengerCount"),
    vehicleCount: field(form, "vehicleCount"),
    vehiclePreference: field(form, "vehiclePreference"),
    luggage: field(form, "luggage"),
    coordinatorNeeded: field(form, "coordinatorNeeded"),
    representativeCount: field(form, "representativeCount"),
    contactName: field(form, "contactName"),
    company: company || undefined,
    email: field(form, "email"),
    phone: field(form, "phone"),
    notes: notes || undefined,
    waitMinutes: field(form, "waitMinutes") || undefined,
    driveMinutes: field(form, "driveMinutes") || undefined,
    unsureSteps: field(form, "unsureSteps") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: firstFieldErrors(parsed.error) };
  }
  return { ok: true, data: parsed.data };
}

export function manifestError(file: { name: string; size: number; type: string }): string | null {
  if (file.size <= 0) return null;
  if (file.size > MANIFEST_MAX_BYTES) return "Manifest must be 8 MB or smaller.";
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const allowed = MANIFEST_TYPES[ext];
  if (!allowed) return "Upload a CSV, XLSX, or PDF file.";
  if (!allowed.includes(file.type.toLowerCase())) return "That file type doesn't match a CSV, XLSX, or PDF.";
  return null;
}

export function manifestExtension(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

export function safeDownloadName(name: string) {
  const cleaned = name.replace(/[\r\n"]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return cleaned || "manifest";
}

export function labelFor<T extends string>(options: { value: T; label: string }[], value: T) {
  return options.find((option) => option.value === value)?.label ?? value;
}

export function formatQuoteDate(iso: string) {
  if (!isIsoDate(iso)) return iso;
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatQuoteTime(value?: string | null) {
  if (!value || !isTime(value)) return null;
  const [hour, minute] = value.split(":").map(Number);
  return new Date(Date.UTC(2026, 0, 1, hour, minute)).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

export function recommendedRepCount(vehicleCount: number) {
  return Math.ceil(vehicleCount / 3);
}

export function parseStops(value: string | null | undefined) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  } catch {
    return [];
  }
}

export function centsFromSetting(value: string | null | undefined) {
  if (!value || !/^\d+$/.test(value)) return null;
  const cents = Number(value);
  return cents > 0 ? cents : null;
}

export function dollarsFromCents(cents: number | null) {
  if (cents == null) return "";
  return (cents / 100).toFixed(2);
}

export function formatRepPrice(cents: number | null) {
  if (cents == null) return "quoted per representative";
  const amount = (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
  return `${amount} per representative`;
}

export function parseRepPriceInput(raw: string): { ok: true; cents: number | null } | { ok: false; error: string } {
  const trimmed = raw.trim().replace(/^\$/, "").replace(/,/g, "");
  if (!trimmed) return { ok: true, cents: null };
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return { ok: false, error: "Enter a price like 125 or 125.00, or leave it blank." };
  }
  const cents = Math.round(Number(trimmed) * 100);
  if (cents <= 0 || cents > 1_000_000) {
    return { ok: false, error: "Enter a price up to $10,000, or leave it blank." };
  }
  return { ok: true, cents };
}

export function orlandoToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function field(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function parseUnsureSteps(value: string | undefined) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string").slice(0, 12);
  } catch {
    return [];
  }
}

function oneOf<T extends string>(value: string, options: readonly T[]): value is T {
  return (options as readonly string[]).includes(value);
}

function isIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function addYears(iso: string, years: number) {
  const [year, month, day] = iso.split("-");
  return `${Number(year) + years}-${month}-${day}`;
}

function firstFieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0] != null ? String(issue.path[0]) : "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
