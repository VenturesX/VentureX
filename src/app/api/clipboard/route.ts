import { NextResponse } from "next/server";
import { jsonError, requireApi } from "@/lib/api";
import { loadClipboard, parsePrograms, replaceClipboard } from "@/lib/clipboard/persist";
import { db } from "@/lib/db";

export async function GET() {
  try {
    await requireApi("clipboard.write");
    const programs = await loadClipboard();
    return NextResponse.json({ programs });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request) {
  try {
    await requireApi("clipboard.write");
    const body = (await request.json()) as { programs?: unknown };
    const programs = parsePrograms(body.programs);
    await replaceClipboard(db, programs);
    return NextResponse.json({ ok: true, programs });
  } catch (error) {
    return jsonError(error);
  }
}
