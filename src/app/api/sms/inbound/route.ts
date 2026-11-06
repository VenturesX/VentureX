import { NextResponse } from "next/server";
import { publicOrigin } from "@/lib/brand";
import { handleText } from "@/lib/light/service";
import { readInboundSms } from "@/lib/providers/sms";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const inbound = await readInboundSms(request);
  if (!inbound) return NextResponse.json({ error: "No message." }, { status: 400 });
  const origin = publicOrigin(request);
  const result = await handleText(inbound.from, inbound.text, origin);
  return NextResponse.json({ ok: true, reply: result.reply });
}
