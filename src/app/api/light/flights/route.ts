import { NextResponse } from "next/server";
import { refreshFlights } from "@/lib/light/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { code?: string; force?: boolean };
  const result = await refreshFlights(body.code || "NBCU", Boolean(body.force));
  if ("error" in result && result.error) return NextResponse.json(result, { status: 404 });
  return NextResponse.json(result);
}
