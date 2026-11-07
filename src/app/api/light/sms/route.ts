import { NextResponse } from "next/server";
import { publicOrigin } from "@/lib/brand";
import { crewDenied } from "@/lib/crew-guard";
import { handleText } from "@/lib/light/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const denied = await crewDenied(["crew", "admin"]);
  if (denied) return denied;
  const body = (await request.json().catch(() => null)) as { phone?: string; text?: string } | null;
  if (!body?.phone || !body.text) return NextResponse.json({ error: "Phone and text are required." }, { status: 400 });
  const origin = publicOrigin(request);
  const result = await handleText(body.phone, body.text, origin);
  return NextResponse.json(result);
}
