import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { jsonError, requireApi } from "@/lib/api";
import { db } from "@/lib/db";

const CATEGORIES = ["PICKUP", "SCHEDULE", "LOST", "ACCESSIBILITY", "OTHER"];
const HOUR = 60 * 60 * 1000;

export async function GET() {
  try {
    await requireApi("ops.inbox");
    const event = await activeEvent();
    if (!event) return NextResponse.json({ rows: [] });
    const rows = await db.guestRequest.findMany({
      where: { eventId: event.id },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json({ eventName: event.name, rows });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  const event = await activeEvent();
  if (!event) return NextResponse.json({ error: "No active trip to attach this to." }, { status: 400 });
  let body: { category?: string; message?: string; name?: string; phone?: string };
  try {
    body = (await request.json()) as { category?: string; message?: string; name?: string; phone?: string };
  } catch {
    return NextResponse.json({ error: "Send the question as JSON." }, { status: 400 });
  }
  const category = CATEGORIES.includes(String(body.category)) ? String(body.category) : "";
  const message = String(body.message ?? "").trim();
  const name = String(body.name ?? "").trim().slice(0, 120);
  const phone = String(body.phone ?? "").trim().slice(0, 40);
  if (!category) return NextResponse.json({ error: "Choose what this is about." }, { status: 400 });
  if (message.length < 4 || message.length > 1000) {
    return NextResponse.json({ error: "Write a short question so we know how to help." }, { status: 400 });
  }
  const deviceKey = await deviceCookie();
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const since = new Date(Date.now() - HOUR);
  const [byDevice, byIp, byPhone] = await Promise.all([
    db.guestRequest.count({ where: { deviceKey, createdAt: { gt: since } } }),
    db.guestRequest.count({ where: { ip, createdAt: { gt: since } } }),
    phone ? db.guestRequest.count({ where: { phone, createdAt: { gt: since } } }) : Promise.resolve(0),
  ]);
  if (byDevice >= 3 || byPhone >= 3 || byIp >= 10) {
    return NextResponse.json(
      { error: "We've already received a few notes from this phone. Give us a little time to answer." },
      { status: 429 },
    );
  }
  const fingerprint = message.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 240);
  if (fingerprint.length >= 8) {
    const existing = await db.guestRequest.findFirst({
      where: {
        eventId: event.id,
        category,
        fingerprint,
        status: "OPEN",
        createdAt: { gt: new Date(Date.now() - 24 * HOUR) },
      },
    });
    if (existing) {
      const row = await db.guestRequest.update({
        where: { id: existing.id },
        data: { duplicateCount: { increment: 1 } },
      });
      return NextResponse.json({ ok: true, grouped: true, id: row.id, duplicateCount: row.duplicateCount });
    }
  }
  const row = await db.guestRequest.create({
    data: { eventId: event.id, category, message, name: name || null, phone: phone || null, deviceKey, ip, fingerprint },
  });
  return NextResponse.json({ ok: true, grouped: false, id: row.id });
}

export async function PATCH(request: Request) {
  try {
    await requireApi("ops.inbox");
    const body = (await request.json()) as { id?: string; status?: string };
    if (!body.id || (body.status !== "OPEN" && body.status !== "HANDLED")) {
      return NextResponse.json({ error: "Choose a request to update." }, { status: 400 });
    }
    await db.guestRequest.update({ where: { id: body.id }, data: { status: body.status } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

async function activeEvent() {
  return db.event.findFirst({
    where: { deletedAt: null, status: "ACTIVE" },
    orderBy: { startsAt: "asc" },
  });
}

async function deviceCookie() {
  const jar = await cookies();
  const existing = jar.get("vd_device")?.value;
  if (existing && /^[a-zA-Z0-9-]{16,80}$/.test(existing)) return existing;
  const created = crypto.randomUUID();
  jar.set("vd_device", created, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 180 });
  return created;
}
