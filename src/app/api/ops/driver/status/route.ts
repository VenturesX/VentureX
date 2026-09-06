import { NextResponse } from "next/server";
import { jsonError, requireApi } from "@/lib/api";
import { db } from "@/lib/db";
import { advanceDriverStatus, driverAssignmentView } from "@/lib/ops/engine";
import type { VehicleStatus } from "@prisma/client";

export async function GET() {
  try {
    const actor = await requireApi("ops.read");
    const driverId =
      actor.driverId ??
      (await db.driver.findFirst({ where: { userId: actor.id } }))?.id;
    if (!driverId) return NextResponse.json({ assignment: null });
    const view = await driverAssignmentView(driverId);
    return NextResponse.json(view ?? { assignment: null });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireApi("ops.driver_status");
    const body = await request.json();
    const driverId =
      body.driverId ??
      actor.driverId ??
      (await db.driver.findFirst({ where: { userId: actor.id } }))?.id;
    const result = await advanceDriverStatus({
      driverId,
      vehicleId: body.vehicleId,
      to: String(body.to) as VehicleStatus,
      actor,
      reason: body.reason,
      override: Boolean(body.override),
    });
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
