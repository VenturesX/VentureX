import { NextResponse } from "next/server";
import { CREW_COOKIE } from "@/lib/crew-session";
import { requireCrewDayCode } from "@/lib/crew-guard";
import { loadCrewDay, updateCrewDay } from "@/lib/light/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const code = await requireCrewDayCode(new URL(request.url).searchParams.get("code") || "");
  if (code instanceof NextResponse) return code;
  const day = await loadCrewDay(code);
  if (!day) return NextResponse.json({ error: "That day code is not active." }, { status: 404 });
  return NextResponse.json(day);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { code?: string; postCode?: string; textAlerts?: boolean; signOut?: boolean } | null;
  const code = await requireCrewDayCode(body?.code || "");
  if (code instanceof NextResponse) return code;
  const result = await updateCrewDay(code, body ?? {});
  if ("error" in result && result.error) return NextResponse.json(result, { status: 404 });
  if (result.signedOut) {
    const response = NextResponse.json(result);
    response.cookies.set(CREW_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
    return response;
  }
  return NextResponse.json(await loadCrewDay(code));
}
