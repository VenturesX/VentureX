import { NextResponse } from "next/server";
import { loadCrewDay, updateCrewDay } from "@/lib/light/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code") || "";
  const day = await loadCrewDay(code);
  if (!day) return NextResponse.json({ error: "That day code is not active." }, { status: 404 });
  return NextResponse.json(day);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { code?: string; postCode?: string; textAlerts?: boolean; signOut?: boolean } | null;
  if (!body?.code) return NextResponse.json({ error: "Enter your day code." }, { status: 400 });
  const result = await updateCrewDay(body.code, body);
  if ("error" in result && result.error) return NextResponse.json(result, { status: 404 });
  if (result.signedOut) return NextResponse.json(result);
  return NextResponse.json(await loadCrewDay(body.code));
}
