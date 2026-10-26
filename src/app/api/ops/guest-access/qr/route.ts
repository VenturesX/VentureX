import { NextResponse } from "next/server";
import * as QRCode from "qrcode";
import { jsonError, requireApi } from "@/lib/api";
import { activeStaffEvent, staffGuestAccess } from "@/lib/guest-access";

export async function GET(request: Request) {
  try {
    await requireApi("ops.guest_access");
    const event = await activeStaffEvent();
    if (!event) return NextResponse.json({ error: "No active event." }, { status: 404 });
    const view = await staffGuestAccess(event.id);
    if (!view?.token) return NextResponse.json({ error: "Generate a link first." }, { status: 404 });
    const origin = publicOrigin(request);
    if (!origin) return NextResponse.json({ error: "Could not build the trip link." }, { status: 400 });
    const png = await QRCode.toBuffer(`${origin}/t/${view.token}`, {
      type: "png",
      margin: 1,
      width: 640,
      errorCorrectionLevel: "M",
      color: { dark: "#111111", light: "#ffffff" },
    });
    const download = new URL(request.url).searchParams.get("download") === "1";
    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, no-store",
        ...(download ? { "Content-Disposition": 'attachment; filename="trip-qr.png"' } : {}),
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

function publicOrigin(request: Request) {
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").split(",")[0].trim();
  if (!/^[a-zA-Z0-9.:-]+$/.test(host)) return null;
  const forwarded = request.headers.get("x-forwarded-proto")?.split(",")[0].trim();
  const proto = forwarded === "http" || forwarded === "https"
    ? forwarded
    : host.startsWith("localhost") || host.startsWith("127.")
      ? "http"
      : "https";
  return `${proto}://${host}`;
}
