import { NextResponse } from "next/server";
import { planQuote } from "@/lib/drive-time";
import { loadGuidance } from "@/lib/ops-settings";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Send the trip details as JSON." }, { status: 400 });
  }
  const guidance = await loadGuidance();
  const stops = Array.isArray(body.stops) ? body.stops.map((stop) => String(stop)).filter((stop) => stop.trim().length >= 2) : [];
  const plan = await planQuote(
    {
      serviceType: String(body.serviceType ?? ""),
      passengerCount: Number(body.passengerCount) || 0,
      pickup: String(body.pickup ?? ""),
      dropoff: String(body.dropoff ?? ""),
      stops,
      waitMinutes: Number(body.waitMinutes) || undefined,
      driveMinutes: Number(body.driveMinutes) || undefined,
      vehiclePreference: String(body.vehiclePreference ?? ""),
      email: String(body.email ?? ""),
      phone: String(body.phone ?? ""),
      startDate: String(body.startDate ?? ""),
      unsureSteps: Array.isArray(body.unsureSteps) ? body.unsureSteps.map(String) : [],
    },
    guidance.fleet,
    guidance.timing,
    guidance.driveTable,
  );
  return NextResponse.json(plan);
}
