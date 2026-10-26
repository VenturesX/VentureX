import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { TRIP_COOKIE, loadGuestBoard } from "@/lib/guest-access";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const jar = await cookies();
  const result = await loadGuestBoard(token, jar.get(TRIP_COOKIE)?.value);
  return NextResponse.json(result.body, { status: result.status });
}
