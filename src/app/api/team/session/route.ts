import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CREW_COOKIE, PROGRAM_COOKIE, ownerIdleRemaining, ownerIsIdle, readCrewPayload, readGateToken } from "@/lib/crew-session";

export const dynamic = "force-dynamic";

export async function GET() {
  const store = await cookies();
  const payload = await readCrewPayload(store.get(CREW_COOKIE)?.value || "");
  const locked = Boolean(payload?.kind === "admin" && ownerIsIdle(payload.touched));
  const crew = payload && !locked ? payload : null;
  const gate = await readGateToken(store.get(PROGRAM_COOKIE)?.value || "");
  const program = crew?.programId ? await db.lightProgram.findUnique({ where: { id: crew.programId } }) : null;
  const openProgram = Boolean(crew && (crew.kind === "admin" || crew.kind === "lead" || (crew.kind === "crew" && !crew.personId)));
  return NextResponse.json({
    gate: gate ? { scope: gate.scope, programName: gate.programName, staff: Boolean(gate.staffOnly) } : null,
    locked,
    lockedProgramId: locked ? payload?.programId || "" : "",
    ownerIdleSec: payload?.kind === "admin" && !locked ? ownerIdleRemaining(payload.touched) : 0,
    signedIn: crew ? { kind: crew.kind, name: crew.name, programId: crew.programId, clientManagesGroups: Boolean(program?.clientManagesGroups), openProgram } : null,
  });
}
