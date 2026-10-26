import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { isDatabaseUnavailable } from "@/lib/db-error";
import { knownPuck, recordFix } from "@/lib/shuttle/store";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      puckId?: string;
      lat?: number;
      lng?: number;
      heading?: number | null;
      speedMps?: number | null;
    };
    const puckId = String(body.puckId ?? "");
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    if (!knownPuck(puckId) || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return NextResponse.json({ error: "A known puck and a real GPS point are required" }, { status: 400 });
    }
    const result = await recordFix({
      puckId,
      lat,
      lng,
      heading: Number.isFinite(Number(body.heading)) ? Number(body.heading) : null,
      speedMps: Number.isFinite(Number(body.speedMps)) ? Number(body.speedMps) : null,
      source: "beacon",
      stopId: null,
      at: Date.now(),
    });
    return NextResponse.json({ ok: true, persisted: result.persisted });
  } catch (error) {
    if (isDatabaseUnavailable(error)) return NextResponse.json({ ok: true, persisted: false });
    return jsonError(error);
  }
}
