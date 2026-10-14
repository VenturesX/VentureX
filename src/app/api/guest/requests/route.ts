import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { jsonError, requireApi } from "@/lib/api";
import { TRIP_COOKIE, activeStaffEvent, clientIp, createGuestRequest, listGuestRequests, setGuestRequestStatus } from "@/lib/guest-access";

export async function GET() {
  try {
    await requireApi("ops.inbox");
    const event = await activeStaffEvent();
    if (!event) return NextResponse.json({ rows: [] });
    const rows = await listGuestRequests(event.id);
    return NextResponse.json({ eventName: event.name, rows });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  let body: { token?: string; category?: string; message?: string; name?: string; phone?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Send the question as JSON." }, { status: 400 });
  }
  const jar = await cookies();
  const result = await createGuestRequest({
    token: String(body.token ?? ""),
    category: String(body.category ?? ""),
    message: String(body.message ?? ""),
    name: String(body.name ?? ""),
    phone: String(body.phone ?? ""),
    deviceKey: await deviceCookie(),
    ip: clientIp(request),
    cookie: jar.get(TRIP_COOKIE)?.value,
  });
  return NextResponse.json(result.body, { status: result.status });
}

export async function PATCH(request: Request) {
  try {
    await requireApi("ops.inbox");
    const body = (await request.json()) as { id?: string; status?: string };
    if (!body.id || (body.status !== "OPEN" && body.status !== "HANDLED")) {
      return NextResponse.json({ error: "Choose a request to update." }, { status: 400 });
    }
    const event = await activeStaffEvent();
    if (!event) return NextResponse.json({ error: "Question not found." }, { status: 404 });
    const updated = await setGuestRequestStatus(event.id, body.id, body.status);
    if (!updated) return NextResponse.json({ error: "Question not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

async function deviceCookie() {
  const jar = await cookies();
  const existing = jar.get("vd_device")?.value;
  if (existing && /^[a-zA-Z0-9-]{16,80}$/.test(existing)) return existing;
  const created = crypto.randomUUID();
  jar.set("vd_device", created, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 180 });
  return created;
}
