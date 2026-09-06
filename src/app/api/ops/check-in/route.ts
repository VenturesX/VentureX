import { NextResponse } from "next/server";
import { jsonError, requireApi } from "@/lib/api";
import { checkInParty, queueParty, setGuestStatus } from "@/lib/ops/engine";
import type { GuestStatus } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const actor = await requireApi("ops.check_in");
    const body = await request.json();
    const guestId = String(body.guestId ?? "");
    const includeParty = Boolean(body.includeParty ?? true);
    const action = String(body.action ?? "check_in");

    if (action === "found") {
      const guest = await setGuestStatus({ guestId, to: "FOUND", actor });
      return NextResponse.json({ guest, guests: [guest] });
    }
    if (action === "check_in") {
      const guests = await checkInParty({ guestId, includeParty, actor });
      return NextResponse.json({ guests });
    }
    if (action === "queue") {
      const guests = await queueParty({ guestId, includeParty, actor });
      return NextResponse.json({ guests });
    }
    if (action === "no_show" || action === "assistance" || action === "cancel") {
      const to: GuestStatus =
        action === "no_show" ? "NO_SHOW" : action === "assistance" ? "NEEDS_ASSISTANCE" : "CANCELLED";
      const guest = await setGuestStatus({
        guestId,
        to,
        actor,
        reason: body.reason,
        override: true,
      });
      return NextResponse.json({ guests: [guest] });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return jsonError(error);
  }
}
