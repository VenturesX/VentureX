import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { crewDenied, crewSession } from "@/lib/crew-guard";
import { loadCrewReport } from "@/lib/light/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await crewDenied(["admin", "client", "lead"]);
  if (denied) return denied;
  const session = await crewSession();
  let code = new URL(request.url).searchParams.get("code") || "";
  if (session?.programId) {
    const program = await db.lightProgram.findUnique({ where: { id: session.programId } });
    if (program) code = program.code;
  }
  if (!code) {
    const first = await db.lightProgram.findFirst({ orderBy: { name: "asc" } });
    code = first?.code || "";
  }
  const report = await loadCrewReport(code);
  if (!report) return NextResponse.json({ error: "Program not found." }, { status: 404 });
  if (session?.kind === "client") {
    report.staff = [];
    report.notes = [];
    report.sheet = [];
  }
  return NextResponse.json(report);
}
