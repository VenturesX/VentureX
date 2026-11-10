import { NextResponse } from "next/server";
import { crewDenied, denyOutsideProgram } from "@/lib/crew-guard";
import { loadClient } from "@/lib/light/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await crewDenied(["crew", "admin", "lead"]);
  if (denied) return denied;
  const code = new URL(request.url).searchParams.get("code") || "NBCU";
  const outside = await denyOutsideProgram(code);
  if (outside) return outside;
  const client = await loadClient(code);
  if (!client) return NextResponse.json({ error: "Program not found." }, { status: 404 });
  return NextResponse.json(client);
}
