import { NextResponse } from "next/server";
import { rowsFromUpload } from "@/lib/light/files";
import { parseManifestText, type ManifestRow } from "@/lib/light/parse-manifest";
import { publishManifest } from "@/lib/light/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a file." }, { status: 400 });
    const parsed = await rowsFromUpload(file);
    return NextResponse.json(parsed);
  }
  const body = (await request.json().catch(() => null)) as { code?: string; text?: string; rows?: ManifestRow[]; publish?: boolean } | null;
  if (!body) return NextResponse.json({ error: "Send JSON." }, { status: 400 });
  if (body.publish) {
    const result = await publishManifest(body.code || "NBCU", body.rows || [], "Intake");
    if ("error" in result && result.error) return NextResponse.json(result, { status: 400 });
    return NextResponse.json(result);
  }
  return NextResponse.json({ rows: parseManifestText(body.text || ""), note: "" });
}
