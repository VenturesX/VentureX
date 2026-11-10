import { NextResponse } from "next/server";
import { crewDenied } from "@/lib/crew-guard";
import { db } from "@/lib/db";
import { safeDownloadName } from "@/lib/quotes";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await crewDenied(["admin"]);
  if (denied) return denied;
  const { id } = await context.params;
  const row = await db.quoteRequest.findUnique({ where: { id }, select: { manifestBytes: true, manifestFileName: true, manifestMimeType: true } });
  if (!row?.manifestBytes) return NextResponse.json({ error: "No manifest on this request." }, { status: 404 });
  return new NextResponse(Buffer.from(row.manifestBytes), { headers: {
    "Content-Type": row.manifestMimeType || "application/octet-stream",
    "Content-Disposition": `attachment; filename="${safeDownloadName(row.manifestFileName ?? "manifest")}"`,
    "Cache-Control": "private, no-store",
  } });
}
