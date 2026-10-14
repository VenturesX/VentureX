import { NextResponse } from "next/server";
import { jsonError, requireApi } from "@/lib/api";
import { db } from "@/lib/db";

export async function GET() {
  try {
    await requireApi("quotes.read");
    const rows = await db.callbackRequest.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
    return NextResponse.json({ rows });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  let body: { name?: string; phone?: string; bestTime?: string };
  try {
    body = (await request.json()) as { name?: string; phone?: string; bestTime?: string };
  } catch {
    return NextResponse.json({ error: "Send the callback request as JSON." }, { status: 400 });
  }
  const name = String(body.name ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  const bestTime = String(body.bestTime ?? "").trim();
  if (name.length < 2 || name.length > 120) {
    return NextResponse.json({ error: "Enter your name." }, { status: 400 });
  }
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) {
    return NextResponse.json({ error: "Enter a phone number we can call." }, { status: 400 });
  }
  if (!bestTime || bestTime.length > 80) {
    return NextResponse.json({ error: "Choose the best time for a call." }, { status: 400 });
  }
  const row = await db.callbackRequest.create({ data: { name, phone, bestTime } });
  return NextResponse.json({ ok: true, id: row.id });
}

export async function PATCH(request: Request) {
  try {
    await requireApi("quotes.update");
    const body = (await request.json()) as { id?: string; status?: string };
    if (!body.id || (body.status !== "NEW" && body.status !== "CALLED")) {
      return NextResponse.json({ error: "Choose a callback to update." }, { status: 400 });
    }
    await db.callbackRequest.update({ where: { id: body.id }, data: { status: body.status } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
