import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  findClientProgram,
  findCrewByDayCode,
  findProgramByAccessCode,
  noteFailedTry,
  ownerCodeMatches,
  tooManyTries,
} from "@/lib/crew-access";
import {
  CREW_COOKIE,
  PROGRAM_COOKIE,
  endOfShiftUnix,
  readGateToken,
  signCrewToken,
  signGateToken,
} from "@/lib/crew-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PORTALS = {
  director: "/team/director",
  driver: "/drive",
  clipboard: "/clipboard",
  dispatch: "/team/dispatch",
  admin: "/team/admin",
  client: "/team/admin",
} as const;

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
  const body = (await request.json().catch(() => null)) as { step?: string; code?: string; portal?: string } | null;
  const step = body?.step || "";
  const code = String(body?.code ?? "");
  if (step === "out") {
    const response = NextResponse.json({ ok: true });
    response.cookies.set(CREW_COOKIE, "", expiredCookie(request));
    response.cookies.set(PROGRAM_COOKIE, "", expiredCookie(request));
    return response;
  }

  const ip = clientIp(request);
  if (await tooManyTries(ip)) {
    return NextResponse.json({ error: "Too many tries. Wait a few minutes." }, { status: 429 });
  }

  if (step === "gate") {
    if (await ownerCodeMatches(code)) {
      const token = await signGateToken({ scope: "all", programId: "", programName: "" });
      const response = NextResponse.json({ ok: true, scope: "all", programName: "" });
      response.cookies.set(PROGRAM_COOKIE, token, cookieOptions(request, new Date(endOfShiftUnix() * 1000)));
      return response;
    }
    const program = await findProgramByAccessCode(code);
    if (!program) {
      await noteFailedTry(ip);
      return NextResponse.json({ error: "That code didn't match." }, { status: 401 });
    }
    const token = await signGateToken({ scope: "program", programId: program.id, programName: program.name });
    const response = NextResponse.json({ ok: true, scope: "program", programName: program.name });
    response.cookies.set(PROGRAM_COOKIE, token, cookieOptions(request, new Date(endOfShiftUnix() * 1000)));
    return response;
  }

  if (step !== "portal") return NextResponse.json({ error: "Start again." }, { status: 400 });
  const portal = body?.portal || "";
  if (!(portal in PORTALS)) return NextResponse.json({ error: "Choose a desk." }, { status: 400 });
  const store = await cookies();
  const gate = await readGateToken(store.get(PROGRAM_COOKIE)?.value || "");
  if (!gate) return NextResponse.json({ error: "Start again." }, { status: 401 });
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
    kind: "crew",
    programId: person.programId,
    personId: person.id,
    name: person.name,
  });
  const response = NextResponse.json({ ok: true, href });
  response.cookies.set(CREW_COOKIE, token, expires);
  return response;
}
