import { NextResponse } from "next/server";
import { crewDenied, crewSession } from "@/lib/crew-guard";
import { adminReply, loadAdmin, saveAdmin } from "@/lib/light/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await crewDenied(["crew", "admin"]);
  if (denied) return denied;
  return NextResponse.json(await loadAdmin());
}

export async function POST(request: Request) {
  const denied = await crewDenied(["crew", "admin"]);
  if (denied) return denied;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Send JSON." }, { status: 400 });
  if (body.action === "reply") {
    const result = await adminReply(String(body.programId), String(body.phone || ""), String(body.body || ""));
    if ("error" in result && result.error) return NextResponse.json(result, { status: 400 });
    return NextResponse.json(result);
  }
  const session = await crewSession();
  if (session?.kind !== "admin") return NextResponse.json({ error: "Only the owner can change that." }, { status: 403 });
  const result = await saveAdmin(String(body.programId), body);
  return NextResponse.json(result);
}
