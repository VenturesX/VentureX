import { NextResponse } from "next/server";
import { handleText } from "@/lib/light/service";
import { readInboundSms } from "@/lib/providers/sms";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const inbound = await readInboundSms(request);
  if (!inbound) return NextResponse.json({ error: "No message." }, { status: 400 });
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const result = await handleText(inbound.from, inbound.text, origin);
  return NextResponse.json({ ok: true, reply: result.reply });
}
