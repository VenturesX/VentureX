import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { externalPortalHref } from "@/lib/external-portals";
import { applyExtraCode, findProgramByNumber, loadVisibleTrip, noteGuestTry, openProgramSession, tooManyGuestTries } from "@/lib/guest-portal";
import { readTripToken, signTripToken, TRIP_COOKIE } from "@/lib/guest-session";
import { ownerCodeMatches } from "@/lib/crew-access";
import { setOwnerSession } from "@/lib/owner-access";
import { crewSession } from "@/lib/crew-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

function cookieOptions(request: Request) {
  const forwarded = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const secure = forwarded ? forwarded === "https" : new URL(request.url).protocol === "https:";
  return { httpOnly: true, sameSite: "lax" as const, path: "/", secure, maxAge: 60 * 60 * 18 };
}

export async function GET() {
  const store = await cookies();
  const session = await readTripToken(store.get(TRIP_COOKIE)?.value || "");
  if (!session) return NextResponse.json({ signedIn: false });
  const trip = await loadVisibleTrip(session);
  if (!trip) return NextResponse.json({ signedIn: false });
  const owner = await crewSession();
  return NextResponse.json({ signedIn: true, ...trip, ownerPreview: owner?.kind === "admin" && owner.programId === session.programId });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { step?: string; code?: string } | null;
  const step = body?.step || "";
  if (step === "out") {
    const response = NextResponse.json({ ok: true });
    response.cookies.set(TRIP_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
    return response;
  }
  const ip = clientIp(request);
  if (await tooManyGuestTries(ip)) {
    return NextResponse.json({ error: "Let's pause for a moment. Try again in a few minutes, or ask the team nearby for help." }, { status: 429 });
  }
  const store = await cookies();
  const current = await readTripToken(store.get(TRIP_COOKIE)?.value || "");

  if (step === "open") {
    const code = String(body?.code ?? "");
    if (await ownerCodeMatches(code)) {
      return setOwnerSession(NextResponse.json({ ok: true, href: "/team" }), request);
    }
    const portal = externalPortalHref(code);
    if (portal) return NextResponse.json({ ok: true, href: portal });
    const program = await findProgramByNumber(code);
    if (!program) {
      await noteGuestTry(ip);
      return NextResponse.json({ error: "That code didn't match. Check your welcome message or ask the team at your arrival area." }, { status: 401 });
    }
    const token = await signTripToken(await openProgramSession(program.id));
    const response = NextResponse.json({ ok: true, welcome: program.name });
    response.cookies.set(TRIP_COOKIE, token, cookieOptions(request));
    return response;
  }

  if (step === "code") {
    if (!current) return NextResponse.json({ error: "Enter the program number first." }, { status: 401 });
    const result = await applyExtraCode(current, String(body?.code ?? ""));
    if (!result.ok) {
      await noteGuestTry(ip);
      return NextResponse.json({ error: "That code didn't match." }, { status: 401 });
    }
    const token = await signTripToken(result.session);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(TRIP_COOKIE, token, cookieOptions(request));
    return response;
  }

  return NextResponse.json({ error: "Start again." }, { status: 400 });
}
