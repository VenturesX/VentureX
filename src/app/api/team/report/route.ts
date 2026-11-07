import { NextResponse } from "next/server";
import { loadCrewReport } from "@/lib/light/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code") || "NBCU";
  const report = await loadCrewReport(code);
  if (!report) return NextResponse.json({ error: "Program not found." }, { status: 404 });
  return NextResponse.json(report);
}
