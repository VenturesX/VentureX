import { NextResponse } from "next/server";
import { requireCrewDayCode } from "@/lib/crew-guard";
import { loadCrewDay, runDesk } from "@/lib/light/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { code?: string; action?: string; paxIds?: string[]; tripId?: string; count?: number; destination?: string; vehicle?: string } | null;
  const code = await requireCrewDayCode(body?.code || "");
  if (code instanceof NextResponse) return code;
  const result = await runDesk(code, body ?? {});
  if ("error" in result && result.error) return NextResponse.json(result, { status: 404 });
  return NextResponse.json(await loadCrewDay(code));
}
