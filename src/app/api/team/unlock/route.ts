import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { setOwnerSession } from "@/lib/owner-access";
import { TRIP_COOKIE } from "@/lib/guest-session";
import { db } from "@/lib/db";
import {
  findClientProgram,
  findCrewByDayCode,
  noteFailedTry,
  ownerCodeMatches,
  staffCodeMatches,
  tooManyTries,
  masterDayMatches,
} from "@/lib/crew-access";
import {
  CREW_COOKIE,
  PROGRAM_COOKIE,
  endOfShiftUnix,
  readCrewPayload,
  readGateToken,
  signCrewToken,
  signGateToken,
} from "@/lib/crew-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PORTALS = {
  lead: "/team/admin?setup=1",
  director: "/team/director",
  driver: "/drive",
  clipboard: "/clipboard",
  dispatch: "/team/dispatch",
  admin: "/team/admin",
  client: "/team/admin",
} as const;
const STAFF_PORTALS = ["lead", "director", "dispatch", "driver"];

function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

function cookieOptions(request: Request, expires: Date) {
  const forwarded = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const secure = forwarded ? forwarded === "https" : new URL(request.url).protocol === "https:";
  return { httpOnly: true, sameSite: "lax" as const, path: "/", secure, expires };
}

function expiredCookie(request: Request) {
  return cookieOptions(request, new Date(0));
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { step?: string; code?: string; portal?: string; programId?: string } | null;
  const step = body?.step || "";
  const code = String(body?.code ?? "");
  if (step === "out") {
    const response = NextResponse.json({ ok: true });
    response.cookies.set(CREW_COOKIE, "", expiredCookie(request));
    response.cookies.set(PROGRAM_COOKIE, "", expiredCookie(request));
    response.cookies.set(TRIP_COOKIE, "", expiredCookie(request));
    return response;
  }

  const ip = clientIp(request);
  if (await tooManyTries(ip)) {
    return NextResponse.json({ error: "Too many tries. Wait a few minutes." }, { status: 429 });
  }

  if (step === "resume") {
    const store = await cookies();
    const payload = await readCrewPayload(store.get(CREW_COOKIE)?.value || "");
    if (!payload || payload.kind !== "admin") return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    if (!(await ownerCodeMatches(code))) {
      await noteFailedTry(ip);
      return NextResponse.json({ error: "That code didn't match." }, { status: 401 });
    }
    const response = NextResponse.json({ ok: true, owner: true });
    return setOwnerSession(response, request, payload.programId);
  }

  if (step === "gate") {
    if (await ownerCodeMatches(code)) {
      const response = NextResponse.json({ ok: true, scope: "all", programName: "", owner: true });
      return setOwnerSession(response, request);
    }
    if (await staffCodeMatches(code)) {
      const token = await signGateToken({ scope: "all", programId: "", programName: "", staffOnly: true });
      const response = NextResponse.json({ ok: true, scope: "all", programName: "", staff: true });
      response.cookies.set(PROGRAM_COOKIE, token, cookieOptions(request, new Date(endOfShiftUnix() * 1000)));
      response.cookies.set(CREW_COOKIE, "", expiredCookie(request));
      response.cookies.set(TRIP_COOKIE, "", expiredCookie(request));
      return response;
    }
    await noteFailedTry(ip);
    return NextResponse.json({ error: "That code didn't match." }, { status: 401 });
  }

  if (step === "client") {
    const program = await findClientProgram(null, code);
    if (!program) {
      await noteFailedTry(ip);
      return NextResponse.json({ error: "That code didn't match." }, { status: 401 });
    }
    const token = await signCrewToken({ kind: "client", programId: program.id, personId: "", name: program.name });
    const response = NextResponse.json({ ok: true, href: PORTALS.client });
    response.cookies.set(CREW_COOKIE, token, cookieOptions(request, new Date(endOfShiftUnix() * 1000)));
    return response;
  }

  if (step === "program") {
    const store = await cookies();
    const gate = await readGateToken(store.get(PROGRAM_COOKIE)?.value || "");
    const portal = body?.portal || "";
    if (!gate) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    if (!(await masterDayMatches(code))) {
      await noteFailedTry(ip);
      return NextResponse.json({ error: "That code didn't match." }, { status: 401 });
    }
    if (gate.staffOnly && !STAFF_PORTALS.includes(portal)) return NextResponse.json({ error: "That desk is not on the staff side." }, { status: 403 });
    const program = await db.lightProgram.findUnique({ where: { id: body?.programId || "" }, select: { id: true, name: true } });
    if (!program) return NextResponse.json({ error: "Choose a program." }, { status: 404 });
    const token = await signCrewToken({
      kind: portal === "lead" ? "lead" : "crew",
      programId: program.id,
      personId: "",
      name: portal === "lead" ? "Program lead" : "Staff",
    });
    const response = NextResponse.json({ ok: true, href: PORTALS[portal as keyof typeof PORTALS] });
    response.cookies.set(CREW_COOKIE, token, cookieOptions(request, new Date(endOfShiftUnix() * 1000)));
    return response;
  }

  if (step !== "portal") return NextResponse.json({ error: "Start again." }, { status: 400 });
  const portal = body?.portal || "";
  if (!(portal in PORTALS)) return NextResponse.json({ error: "Choose a desk." }, { status: 400 });
  const store = await cookies();
  const gate = await readGateToken(store.get(PROGRAM_COOKIE)?.value || "");
  if (!gate) return NextResponse.json({ error: "Start again." }, { status: 401 });
  if (gate.staffOnly && !STAFF_PORTALS.includes(portal)) {
    return NextResponse.json({ error: "That desk is not on the staff side." }, { status: 403 });
  }
  if (await masterDayMatches(code)) {
    const programs = await db.lightProgram.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
    return NextResponse.json({ ok: true, chooseProgram: true, programs });
  }
  const programLimit = gate.scope === "program" ? gate.programId : null;
  const href = PORTALS[portal as keyof typeof PORTALS];
  const expires = cookieOptions(request, new Date(endOfShiftUnix() * 1000));

  if (portal === "admin") {
    if (!(await ownerCodeMatches(code))) {
      await noteFailedTry(ip);
      return NextResponse.json({ error: "That code didn't match." }, { status: 401 });
    }
    const token = await signCrewToken({ kind: "admin", programId: gate.programId, personId: "", name: "Owner" });
    const response = NextResponse.json({ ok: true, href });
    response.cookies.set(CREW_COOKIE, token, expires);
    return response;
  }

  if (portal === "client") {
    const program = await findClientProgram(programLimit, code);
    if (!program) {
      await noteFailedTry(ip);
      return NextResponse.json({ error: "That code didn't match." }, { status: 401 });
    }
    const token = await signCrewToken({ kind: "client", programId: program.id, personId: "", name: program.name });
    const response = NextResponse.json({ ok: true, href });
    response.cookies.set(CREW_COOKIE, token, expires);
    return response;
  }

  const person = await findCrewByDayCode(programLimit, code);
  if (!person) {
    await noteFailedTry(ip);
    return NextResponse.json({ error: "That code didn't match." }, { status: 401 });
  }
  const token = await signCrewToken({
    kind: portal === "lead" ? "lead" : "crew",
    programId: person.programId,
    personId: person.id,
    name: person.name,
  });
  const response = NextResponse.json({ ok: true, href });
  response.cookies.set(CREW_COOKIE, token, expires);
  return response;
}
