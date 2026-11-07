import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CREW_COOKIE, PROGRAM_COOKIE, readCrewToken, readGateToken } from "@/lib/crew-session";

export const dynamic = "force-dynamic";

export async function GET() {
  const store = await cookies();
  const crew = await readCrewToken(store.get(CREW_COOKIE)?.value || "");
  const gate = await readGateToken(store.get(PROGRAM_COOKIE)?.value || "");
  const program = crew?.programId ? await db.lightProgram.findUnique({ where: { id: crew.programId } }) : null;
  return NextResponse.json({
    gate: gate ? { scope: gate.scope, programName: gate.programName } : null,
    signedIn: crew ? { kind: crew.kind, name: crew.name, programId: crew.programId, clientManagesGroups: Boolean(program?.clientManagesGroups) } : null,
  });
}
