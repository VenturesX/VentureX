import { NextResponse } from "next/server";
import { suggestPlaces } from "@/lib/places";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") ?? "";
  if (query.trim().length > 120) {
    return NextResponse.json({ places: [] });
  }
  const places = await suggestPlaces(query);
  return NextResponse.json({ places });
}
