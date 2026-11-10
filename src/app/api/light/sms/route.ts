import { NextResponse } from "next/server";
import { publicOrigin } from "@/lib/brand";
import { crewDenied, crewSession, programWide } from "@/lib/crew-guard";
import { handleText } from "@/lib/light/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const denied = await crewDenied(["crew", "admin", "lead"]);
  if (denied) return denied;
  const body = (await request.json().catch(() => null)) as { phone?: string; text?: string } | null;
  if (!body?.phone || !body.text) return NextResponse.json({ error: "Phone and text are required." }, { status: 400 });
  const origin = publicOrigin(request);
  const wide = programWide(await crewSession());
  const limit = wide && wide.kind !== "admin" ? wide.programId : "";
  const result = await handleText(body.phone, body.text, origin, limit);
  return NextResponse.json(result);
}
