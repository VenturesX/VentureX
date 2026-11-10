import { NextResponse } from "next/server";
import { crewSession } from "@/lib/crew-guard";
import { db } from "@/lib/db";
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

const LEAD_ACTIONS = new Set(["save-staff", "delete-staff", "reset-day-codes"]);

export async function GET() {
  const session = await crewSession();
  if (!session || (session.kind !== "admin" && session.kind !== "lead")) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  return NextResponse.json(await officeSnapshot(session.kind === "lead" ? session.programId : ""));
}

export async function POST(request: Request) {
  const session = await crewSession();
  if (!session || (session.kind !== "admin" && session.kind !== "lead")) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, string> | null;
  if (!body?.action) return NextResponse.json({ error: "Choose an action." }, { status: 400 });
  if (session.kind === "lead") {
    const blocked = await leadBlocked(session.programId, body);
    if (blocked) return blocked;
  }
  const result = await run(body);
  if ("error" in result && result.error) return NextResponse.json(result, { status: 400 });
  return NextResponse.json({ ...(result), ...(await officeSnapshot(session.kind === "lead" ? session.programId : "")) });
}

async function leadBlocked(programId: string, body: Record<string, string>) {
  if (!LEAD_ACTIONS.has(body.action)) {
    return NextResponse.json({ error: "That stays with the owner." }, { status: 403 });
  }
  if (body.action === "delete-staff" || (body.action === "save-staff" && body.id)) {
    const person = await db.lightRoster.findUnique({ where: { id: body.id || "" }, select: { programId: true } });
    if (!person || person.programId !== programId) {
      return NextResponse.json({ error: "That stays with the owner." }, { status: 403 });
    }
    return null;
  }
  if ((body.programId || "") !== programId) {
    return NextResponse.json({ error: "That stays with the owner." }, { status: 403 });
  }
  return null;
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
