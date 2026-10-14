import { NextResponse } from "next/server";
import { jsonError, requireApi } from "@/lib/api";
import { db } from "@/lib/db";

const CATEGORIES = ["PICKUP", "SCHEDULE", "LOST", "ACCESSIBILITY", "OTHER"];

async function activeEvent() {
  return db.event.findFirst({
    where: { deletedAt: null, status: "ACTIVE" },
    orderBy: { startsAt: "asc" },
  });
}

export async function POST(request: Request) {
  try {
    await requireApi("quotes.settings");
    const event = await activeEvent();
    if (!event) return NextResponse.json({ error: "No active event." }, { status: 400 });
    const body = (await request.json()) as { category?: string; question?: string; answer?: string };
    const category = CATEGORIES.includes(String(body.category)) ? String(body.category) : "";
    const question = String(body.question ?? "").trim();
    const answer = String(body.answer ?? "").trim();
    if (!category || question.length < 4 || answer.length < 4) {
      return NextResponse.json({ error: "Add a category, a question, and an answer." }, { status: 400 });
    }
    const row = await db.eventFaq.create({
      data: { eventId: event.id, category, question: question.slice(0, 200), answer: answer.slice(0, 2000) },
    });
    return NextResponse.json({ ok: true, faq: row });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireApi("quotes.settings");
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing question." }, { status: 400 });
    await db.eventFaq.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
