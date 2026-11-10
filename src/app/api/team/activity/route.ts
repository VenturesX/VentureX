import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { CREW_COOKIE, endOfShiftUnix, ownerIsIdle, readCrewPayload, signCrewToken } from "@/lib/crew-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const store = await cookies();
  const payload = await readCrewPayload(store.get(CREW_COOKIE)?.value || "");
  if (!payload || payload.kind !== "admin" || ownerIsIdle(payload.touched)) {
    return NextResponse.json({ locked: true, error: "Sign in required." }, { status: 401 });
  }
  const forwarded = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const secure = forwarded ? forwarded === "https" : new URL(request.url).protocol === "https:";
  const token = await signCrewToken({ ...payload, touched: Math.floor(Date.now() / 1000) }, endOfShiftUnix());
  const response = NextResponse.json({ ok: true });
  response.cookies.set(CREW_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure,
    expires: new Date(endOfShiftUnix() * 1000),
  });
  return response;
}
