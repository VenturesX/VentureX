import { NextResponse } from "next/server";
import { crewSession, programWide, requireCrewDayCode } from "@/lib/crew-guard";
import { loadCrewDay, runDesk } from "@/lib/light/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { code?: string; action?: string; paxIds?: string[]; tripId?: string; count?: number; destination?: string; vehicle?: string } | null;
  const owner = await crewSession();
  const wide = programWide(owner);
  if (wide) {
    if (!wide.programId) return NextResponse.json({ error: "Choose a program in the owner hub." }, { status: 409 });
    const result = await runDesk("", body ?? {}, wide.programId);
    if ("error" in result) return NextResponse.json(result, { status: 400 });
    const asOwner = wide.kind === "admin";
    return NextResponse.json(await loadCrewDay("", wide.programId, asOwner ? "Owner" : wide.name || "Staff", asOwner));
  }
  const code = await requireCrewDayCode(body?.code || "");
  if (code instanceof NextResponse) return code;
  const result = await runDesk(code, body ?? {});
  if ("error" in result && result.error) return NextResponse.json(result, { status: 404 });
  return NextResponse.json(await loadCrewDay(code));
}
