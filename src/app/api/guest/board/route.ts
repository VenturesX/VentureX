import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { directLineForEvent } from "@/lib/ops-settings";

export async function GET() {
  const device = await ensureDevice();
  const event = await db.event.findFirst({
    where: { deletedAt: null, status: "ACTIVE" },
    orderBy: { startsAt: "asc" },
    include: { faqs: { orderBy: { sortOrder: "asc" } } },
  });
  if (!event) return NextResponse.json({ eventName: "", faqs: [], phone: "", tel: "", device });
  const line = event.guestPhoneEnabled ? await directLineForEvent(event.directLinePhone) : { phone: "", tel: "" };
  return NextResponse.json({
    eventName: event.name,
    faqs: event.faqs.map((faq) => ({
      id: faq.id,
      category: faq.category,
      question: faq.question,
      answer: faq.answer,
    })),
    phone: line.phone,
    tel: line.tel,
    device,
  });
}

async function ensureDevice() {
  const jar = await cookies();
  const existing = jar.get("vd_device")?.value;
  if (existing && /^[a-zA-Z0-9-]{16,80}$/.test(existing)) return existing;
  const created = crypto.randomUUID();
  jar.set("vd_device", created, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 180 });
  return created;
}
