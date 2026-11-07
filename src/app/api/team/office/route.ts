import { NextResponse } from "next/server";
import { crewDenied } from "@/lib/crew-guard";
import {
  clearClientCode,
  createProgram,
  deleteProgram,
  deleteStaff,
  officeSnapshot,
  resetDayCodes,
  saveStaff,
  setClientCode,
  updateProgram,
} from "@/lib/team-office";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const denied = await crewDenied(["admin"]);
  if (denied) return denied;
  return NextResponse.json(await officeSnapshot());
}

export async function POST(request: Request) {
  const denied = await crewDenied(["admin"]);
  if (denied) return denied;
  const body = (await request.json().catch(() => null)) as Record<string, string> | null;
  if (!body?.action) return NextResponse.json({ error: "Choose an action." }, { status: 400 });
  const result = await run(body);
  if ("error" in result && result.error) return NextResponse.json(result, { status: 400 });
  return NextResponse.json({ ...(result), ...(await officeSnapshot()) });
}

async function run(body: Record<string, string>) {
  if (body.action === "create-program") return createProgram(body);
  if (body.action === "update-program") return updateProgram(body);
  if (body.action === "delete-program") return deleteProgram(body.id || "");
  if (body.action === "set-client-code") return setClientCode(body.id || "", body.code || "");
  if (body.action === "clear-client-code") return clearClientCode(body.id || "");
  if (body.action === "reset-day-codes") return resetDayCodes(body.programId || "", body.personId || "");
  if (body.action === "save-staff") return saveStaff(body);
  if (body.action === "delete-staff") return deleteStaff(body.id || "");
  return { error: "Choose an action." };
}
