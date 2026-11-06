import { NextResponse } from "next/server";
import { loadHotel, receiveHotel } from "@/lib/light/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  const hotel = await loadHotel(token);
  if (!hotel) return NextResponse.json({ error: "Link not found." }, { status: 404 });
  return NextResponse.json(hotel);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { token?: string; count?: number } | null;
  if (!body?.token || body.count == null || Number.isNaN(Number(body.count))) {
    return NextResponse.json({ error: "Enter the count you received." }, { status: 400 });
  }
  const result = await receiveHotel(body.token, Number(body.count));
  if ("error" in result && result.error) return NextResponse.json(result, { status: 404 });
  return NextResponse.json(result);
}
