import { NextResponse } from "next/server";
import { jsonError, requireApi } from "@/lib/api";
import { db } from "@/lib/db";
import { loadLiveSnapshot } from "@/lib/ops/engine";

export async function GET(request: Request) {
  try {
    await requireApi("ops.read");
    const url = new URL(request.url);
    const eventId =
      url.searchParams.get("eventId") ??
      (await db.event.findFirst({ where: { deletedAt: null, status: "ACTIVE" } }))?.id;
    if (!eventId) return NextResponse.json({ error: "No active event" }, { status: 404 });
    const snapshot = await loadLiveSnapshot(eventId);
    return NextResponse.json(snapshot);
  } catch (error) {
    return jsonError(error);
  }
}
