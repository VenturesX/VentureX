import { NextResponse } from "next/server";
import { signTripCookie } from "@/lib/guest-codes";
import { TRIP_COOKIE, clientIp, tripCookieOptions, unlockGuest } from "@/lib/guest-access";

export async function POST(request: Request) {
  let body: { token?: string; pin?: string; lastName?: string; confirmation?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }
  const result = await unlockGuest(String(body.token ?? ""), body, clientIp(request));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(TRIP_COOKIE, signTripCookie(result.token, result.access, result.pin), tripCookieOptions());
  return response;
}
