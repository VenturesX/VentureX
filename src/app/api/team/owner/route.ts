import { NextResponse } from "next/server";
import { crewSession } from "@/lib/crew-guard";
import { db } from "@/lib/db";
import { OWNER_DESKS, setOwnerSession } from "@/lib/owner-access";
import { openProgramSession } from "@/lib/guest-portal";
import { signTripToken, TRIP_COOKIE } from "@/lib/guest-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await crewSession();
  if (session?.kind !== "admin") return NextResponse.json({ error: "Owner sign-in required." }, { status: 401 });
  const programs = await db.lightProgram.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true, status: true, _count: { select: { trips: true, roster: true } } },
  });
  return NextResponse.json({ programs, selectedProgramId: session.programId });
}

export async function POST(request: Request) {
  const session = await crewSession();
  if (session?.kind !== "admin") return NextResponse.json({ error: "Owner sign-in required." }, { status: 401 });
  const body = await request.json().catch(() => null) as { programId?: string; desk?: string } | null;
  const desk = body?.desk || "";
  if (!Object.hasOwn(OWNER_DESKS, desk)) return NextResponse.json({ error: "Choose a desk." }, { status: 400 });
  const program = await db.lightProgram.findUnique({ where: { id: body?.programId || "" }, select: { id: true } });
  // Setup can also be opened when the owner has no programs yet.
  if (!program && !(desk === "setup" && !body?.programId)) return NextResponse.json({ error: "Choose a program." }, { status: 404 });
  const response = NextResponse.json({ href: OWNER_DESKS[desk as keyof typeof OWNER_DESKS] });
  await setOwnerSession(response, request, program?.id || "");
  if (desk === "guest" && program) {
    const forwarded = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const secure = forwarded ? forwarded === "https" : new URL(request.url).protocol === "https:";
    response.cookies.set(TRIP_COOKIE, await signTripToken(await openProgramSession(program.id)), { httpOnly: true, sameSite: "lax", path: "/", secure, maxAge: 60 * 60 * 18 });
  }
  return response;
}
