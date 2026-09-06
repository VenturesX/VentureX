import { NextResponse } from "next/server";
import { jsonError, requireApi } from "@/lib/api";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/ops/audit";
import { publishOps } from "@/lib/realtime";

export async function POST(request: Request) {
  try {
    const actor = await requireApi("ops.exception");
    const body = await request.json();
    const id = String(body.id ?? "");
    const status = String(body.status ?? "ACK");
    const row = await db.exception.update({
      where: { id },
      data: {
        status,
        resolvedAt: status === "RESOLVED" ? new Date() : null,
      },
    });
    await recordAudit({
      action: "exception.update",
      entityType: "EXCEPTION",
      entityId: id,
      actorId: actor.id,
      after: { status },
      eventId: row.eventId,
    });
    publishOps({ type: "exception", eventId: row.eventId, entityType: "EXCEPTION", entityId: id });
    return NextResponse.json({ exception: row });
  } catch (error) {
    return jsonError(error);
  }
}
