import type { Prisma } from "@prisma/client";
import { LUGGAGE_OPTIONS, PROFILE_OPTIONS, SERVICE_OPTIONS, STATUS_OPTIONS, VEHICLE_OPTIONS, parseStops } from "@/lib/quotes";

// Deliberately exclude uploaded file bytes from the inbox response.
export const quoteDetailsSelect = {
  id: true, reference: true, profile: true, serviceType: true,
  contactName: true, company: true, email: true, phone: true,
  market: true, marketCity: true, pickup: true, dropoff: true, stops: true,
  startDate: true, endDate: true, startTime: true, endTime: true,
  passengerCount: true, vehicleCount: true, vehiclePreference: true, luggage: true,
  coordinatorNeeded: true, representativeCount: true, needsExpertCall: true,
  waitMinutes: true, waitVaries: true, driveMinutes: true, unsureSteps: true,
  recommendation: true, notes: true, manifestFileName: true, status: true, createdAt: true,
} satisfies Prisma.QuoteRequestSelect;

export type QuoteDetails = Prisma.QuoteRequestGetPayload<{ select: typeof quoteDetailsSelect }>;
type DetailQuote = Omit<QuoteDetails, "createdAt">;
export type QuoteDetailSection = { title: string; rows: [string, string][] };

function label(options: { value: string; label: string }[], value: string) {
  return options.find((option) => option.value === value)?.label ?? value;
}

export function quoteDetailSections(quote: DetailQuote): QuoteDetailSection[] {
  const stops = parseStops(quote.stops);
  const unsure = parseStops(quote.unsureSteps);
  return [
    { title: "Contact & request", rows: [
      ["Reference", quote.reference], ["Status", label(STATUS_OPTIONS, quote.status)],
      ["Name", quote.contactName], ["Company / group", quote.company || "Not provided"],
      ["Email", quote.email], ["Phone", quote.phone],
      ["Booking for", label(PROFILE_OPTIONS, quote.profile)],
      ["Service", label(SERVICE_OPTIONS, quote.serviceType)],
      ["Market", [quote.market, quote.marketCity].filter(Boolean).join(" · ")],
    ] },
    { title: "Schedule & route", rows: [
      ["Start date", quote.startDate], ["Start time", quote.startTime || "Not provided"],
      ["End date", quote.endDate || "Not provided"], ["End time", quote.endTime || "Not provided"],
      ["Pickup", quote.pickup],
      ...stops.map((stop, index): [string, string] => [`Stop ${index + 1}`, stop]),
      ["Drop-off", quote.dropoff],
      ["Wait time", quote.waitVaries ? "Varies" : quote.waitMinutes == null ? "Not provided" : `${quote.waitMinutes} minutes`],
      ["Drive time supplied", quote.driveMinutes == null ? "Not provided" : `${quote.driveMinutes} minutes`],
    ] },
    { title: "Group & transportation", rows: [
      ["Guests", String(quote.passengerCount)],
      ["Vehicle preference", label(VEHICLE_OPTIONS, quote.vehiclePreference)],
      ["Planned vehicles", String(quote.vehicleCount)],
      ["Luggage", label(LUGGAGE_OPTIONS, quote.luggage)],
      ["Coordinator included in plan", quote.coordinatorNeeded ? "Yes" : "No"],
      ["Planned Venture Reps", String(quote.representativeCount)],
      ["Follow-up needed", quote.needsExpertCall ? "Yes" : "No"],
      ["Items marked unsure", unsure.length ? unsure.join(", ") : "None"],
    ] },
    { title: "Notes & supporting information", rows: [
      ["Client notes", quote.notes || "None provided"],
      ["System recommendation", quote.recommendation || "None"],
      ["Uploaded manifest", quote.manifestFileName || "None uploaded"],
    ] },
  ];
}

export function quoteEmailText(quote: DetailQuote) {
  return quoteDetailSections(quote).map((section) => `${section.title}\n${section.rows.map(([key, value]) => `${key}: ${value}`).join("\n")}`).join("\n\n");
}

export type QuoteAlert = { state: "accepted" | "failed" | "not_configured"; detail: string; attemptedAt: string };
export const quoteAlertKey = (id: string) => `quoteAlert:${id}`;
export const QUOTE_TEST_ALERT_KEY = "quoteAlertTest";
