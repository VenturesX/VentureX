import { NextResponse } from "next/server";
import { signTripCookie } from "@/lib/guest-codes";
import { TRIP_COOKIE, clientIp, enterGuestCode, tripCookieOptions } from "@/lib/guest-access";

export async function POST(request: Request) {
  let code = "";
  try {
    const body = (await request.json()) as { code?: string };
    code = String(body.code ?? "");
  } catch {
    code = "";
  }
  const result = await enterGuestCode(code, clientIp(request));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  const response = NextResponse.json({ ok: true, token: result.token });
  if (result.access === "TOKEN") {
    response.cookies.set(TRIP_COOKIE, signTripCookie(result.token, "TOKEN", null), tripCookieOptions());
  }
  return response;
}
