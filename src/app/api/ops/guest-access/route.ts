import { NextResponse } from "next/server";
import { jsonError, requireApi } from "@/lib/api";
import {
  activeStaffEvent,
  ensureMovementLink,
  regenerateGuestToken,
  revokeGuestAccess,
  saveGuestAccess,
  staffGuestAccess,
} from "@/lib/guest-access";

async function eventId() {
  await requireApi("ops.guest_access");
  const event = await activeStaffEvent();
  if (!event) throw Object.assign(new Error("No active event."), { status: 404 });
  return event.id;
}

export async function GET() {
  try {
    const id = await eventId();
    const view = await staffGuestAccess(id);
    if (!view) return NextResponse.json({ error: "No active event." }, { status: 404 });
    return NextResponse.json(view);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const id = await eventId();
    const body = (await request.json()) as {
      action?: string;
      access?: string;
      pin?: string;
      expiresAt?: string;
      movementId?: string;
      rotate?: string;
    };
    if (body.action === "regenerate") {
      const view = await regenerateGuestToken(id);
      if (!view) return NextResponse.json({ error: "No active event." }, { status: 404 });
      return NextResponse.json(view);
    }
    if (body.action === "revoke") {
      const view = await revokeGuestAccess(id);
      if (!view) return NextResponse.json({ error: "No active event." }, { status: 404 });
      return NextResponse.json(view);
    }
    if (body.action === "movement") {
      const view = await ensureMovementLink(id, String(body.movementId ?? ""), body.rotate === "1");
      if (!view) return NextResponse.json({ error: "That movement is not on this event." }, { status: 404 });
      return NextResponse.json(view);
    }
    const saved = await saveGuestAccess(id, body);
    if (!saved.ok) return NextResponse.json({ error: saved.error }, { status: saved.status });
    return NextResponse.json(saved.view);
  } catch (error) {
    return jsonError(error);
  }
}
