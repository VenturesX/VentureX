import { NextResponse } from "next/server";
import { crewDenied } from "@/lib/crew-guard";
import { loadSetup, saveSetup } from "@/lib/light/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await crewDenied(["crew", "admin"]);
  if (denied) return denied;
  const code = new URL(request.url).searchParams.get("code") || "NBCU";
  const setup = await loadSetup(code);
  if (!setup) return NextResponse.json({ error: "Program not found." }, { status: 404 });
  return NextResponse.json(setup);
}

export async function POST(request: Request) {
  const denied = await crewDenied(["crew", "admin"]);
  if (denied) return denied;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Send JSON." }, { status: 400 });
  const result = await saveSetup(body);
  if ("error" in result && result.error) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}
