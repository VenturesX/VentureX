import type { NextResponse } from "next/server";
import { CREW_COOKIE, PROGRAM_COOKIE, endOfShiftUnix, signCrewToken, signGateToken } from "@/lib/crew-session";

export const OWNER_DESKS = {
  admin: "/team/admin",
  director: "/team/director",
  dispatch: "/team/dispatch",
  clipboard: "/team/clipboard",
  shuttle: "/clipboard",
  driver: "/drive",
  guest: "/trip",
  setup: "/team/admin?setup=1",
} as const;

export async function setOwnerSession(response: NextResponse, request: Request, programId = "") {
  const forwarded = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const secure = forwarded ? forwarded === "https" : new URL(request.url).protocol === "https:";
  const options = { httpOnly: true, sameSite: "lax" as const, path: "/", secure, expires: new Date(endOfShiftUnix() * 1000) };
  response.cookies.set(CREW_COOKIE, await signCrewToken({ kind: "admin", programId, personId: "", name: "Owner" }), options);
  response.cookies.set(PROGRAM_COOKIE, await signGateToken({ scope: "all", programId: "", programName: "" }), options);
  return response;
}
