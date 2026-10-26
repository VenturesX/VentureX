import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { isDatabaseUnavailable } from "@/lib/db-error";
import { loadClipboard, parsePrograms, replaceClipboard } from "@/lib/clipboard/persist";
import { buildSeedPrograms, withMonday } from "@/lib/clipboard/seed-data";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const programs = await loadClipboard();
    return NextResponse.json({ programs, persisted: true });
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return NextResponse.json({ programs: withMonday(buildSeedPrograms()).programs, persisted: false });
    }
    return jsonError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as { programs?: unknown };
    const programs = parsePrograms(body.programs);
    try {
      await replaceClipboard(db, programs);
      return NextResponse.json({ ok: true, persisted: true });
    } catch (error) {
      if (isDatabaseUnavailable(error)) return NextResponse.json({ ok: true, persisted: false });
      throw error;
    }
  } catch (error) {
    return jsonError(error);
  }
}
