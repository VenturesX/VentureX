import { NextResponse } from "next/server";
import { jsonError, requireApi } from "@/lib/api";
import { db } from "@/lib/db";
import { importManifest } from "@/lib/ops/csv";

export async function POST(request: Request) {
  try {
    const actor = await requireApi("admin.crud");
    const form = await request.formData();
    const file = form.get("file");
    const eventId = String(form.get("eventId") ?? "");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "CSV file required" }, { status: 400 });
    }
    const movement = await db.movement.findFirst({ where: { eventId, deletedAt: null } });
    const csvText = await file.text();
    const result = await importManifest({
      eventId,
      movementId: movement?.id,
      csvText,
      actorId: actor.id,
    });
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
