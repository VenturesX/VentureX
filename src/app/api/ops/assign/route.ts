import { NextResponse } from "next/server";
import { jsonError, requireApi } from "@/lib/api";
import { assignGuests, reassignGuests } from "@/lib/ops/engine";

export async function POST(request: Request) {
  try {
    const actor = await requireApi("ops.assign");
    const body = await request.json();
    if (body.reassign && body.assignmentId) {
      const assignment = await reassignGuests({
        assignmentId: String(body.assignmentId),
        vehicleId: String(body.vehicleId),
        driverId: String(body.driverId),
        actor,
        reason: String(body.reason ?? ""),
      });
      return NextResponse.json({ assignment });
    }
    const guestIds: string[] = Array.isArray(body.guestIds)
      ? body.guestIds.map(String)
      : body.guestId
        ? [String(body.guestId)]
        : [];
    const assignment = await assignGuests({
      guestIds,
      vehicleId: String(body.vehicleId),
      driverId: String(body.driverId),
      actor,
      notes: body.notes,
    });
    return NextResponse.json({ assignment });
  } catch (error) {
    return jsonError(error);
  }
}
