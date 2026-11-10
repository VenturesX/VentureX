import { NextResponse } from "next/server";
import { crewDenied, denyOutsideProgram } from "@/lib/crew-guard";
import { loadSetup, saveSetup } from "@/lib/light/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await crewDenied(["crew", "admin", "lead"]);
  if (denied) return denied;
  const code = new URL(request.url).searchParams.get("code") || "NBCU";
  const outside = await denyOutsideProgram(code);
  if (outside) return outside;
  const setup = await loadSetup(code);
  if (!setup) return NextResponse.json({ error: "Program not found." }, { status: 404 });
  return NextResponse.json(setup);
}

export async function POST(request: Request) {
  const denied = await crewDenied(["crew", "admin", "lead"]);
  if (denied) return denied;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const outside = await denyOutsideProgram(String(body?.code || ""));
  if (outside) return outside;
  if (!body) return NextResponse.json({ error: "Send JSON." }, { status: 400 });
  const result = await saveSetup(body);
  if ("error" in result && result.error) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}
