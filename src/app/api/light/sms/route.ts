import { NextResponse } from "next/server";
import { handleText } from "@/lib/light/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { phone?: string; text?: string } | null;
  if (!body?.phone || !body.text) return NextResponse.json({ error: "Phone and text are required." }, { status: 400 });
  const origin = new URL(request.url).origin;
  const result = await handleText(body.phone, body.text, origin);
  return NextResponse.json(result);
}
