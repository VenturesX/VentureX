import { NextResponse } from "next/server";
import { jsonError, requireApi } from "@/lib/api";
import { advanceDriverStatus, setGuestStatus } from "@/lib/ops/engine";
import type { GuestStatus, VehicleStatus } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const actor = await requireApi("ops.correct");
    const body = await request.json();
    const reason = String(body.reason ?? "").trim();
    if (!reason) return NextResponse.json({ error: "Reason is required" }, { status: 400 });

    if (body.entityType === "GUEST") {
      const guest = await setGuestStatus({
        guestId: String(body.entityId),
        to: String(body.to) as GuestStatus,
        actor,
        reason,
        override: true,
      });
      return NextResponse.json({ guest });
    }
    if (body.entityType === "VEHICLE" || body.entityType === "DRIVER") {
      const result = await advanceDriverStatus({
        vehicleId: body.entityType === "VEHICLE" ? String(body.entityId) : body.vehicleId,
        driverId: body.entityType === "DRIVER" ? String(body.entityId) : body.driverId,
        to: String(body.to) as VehicleStatus,
        actor,
        reason,
        override: true,
      });
      return NextResponse.json(result);
    }
    return NextResponse.json({ error: "Unsupported entity" }, { status: 400 });
  } catch (error) {
    return jsonError(error);
  }
}
