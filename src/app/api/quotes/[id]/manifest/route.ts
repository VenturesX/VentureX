import { NextResponse } from "next/server";
import { jsonError, requireApi } from "@/lib/api";
import { db } from "@/lib/db";
import { safeDownloadName } from "@/lib/quotes";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireApi("quotes.read");
    const { id } = await context.params;
    const row = await db.quoteRequest.findUnique({
      where: { id },
      select: { manifestBytes: true, manifestFileName: true, manifestMimeType: true },
    });
    if (!row?.manifestBytes) return NextResponse.json({ error: "No manifest on this request" }, { status: 404 });
    const filename = safeDownloadName(row.manifestFileName ?? "manifest");
    return new NextResponse(Buffer.from(row.manifestBytes), {
      headers: {
        "Content-Type": row.manifestMimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
