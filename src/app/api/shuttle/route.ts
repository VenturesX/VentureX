import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { fieldDenied } from "@/lib/crew-guard";
import { isDatabaseUnavailable } from "@/lib/db-error";
import { readDesk, recordRelay, saveDesk } from "@/lib/shuttle/store";

export async function GET() {
  const denied = await fieldDenied();
  if (denied) return denied;
  try {
    const result = await readDesk();
    return NextResponse.json(result);
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      const result = await readDesk().catch(() => null);
      if (result) return NextResponse.json({ ...result, persisted: false });
    }
    return jsonError(error);
  }
}

export async function PUT(request: Request) {
  const denied = await fieldDenied();
  if (denied) return denied;
  try {
    const body = (await request.json()) as { desk?: unknown };
    const result = await saveDesk(body.desk ?? body);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return NextResponse.json({ ok: true, persisted: false });
    }
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  const denied = await fieldDenied();
  if (denied) return denied;
  try {
    const body = (await request.json()) as {
      puckId?: string;
      stopId?: string;
      kind?: "arrive" | "depart";
      pax?: number;
      driver?: string;
      coachNumber?: string;
      shuttleNumber?: string;
    };
    if (!body.puckId || !body.stopId) {
      return NextResponse.json({ error: "Puck and stop are required" }, { status: 400 });
    }
    const result = await recordRelay({
      puckId: String(body.puckId),
      stopId: String(body.stopId),
      kind: body.kind === "arrive" ? "arrive" : "depart",
      pax: Number(body.pax) || 0,
      driver: body.driver,
      coachNumber: body.coachNumber,
      shuttleNumber: body.shuttleNumber,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return NextResponse.json({ ok: true, persisted: false });
    }
    return jsonError(error);
  }
}
