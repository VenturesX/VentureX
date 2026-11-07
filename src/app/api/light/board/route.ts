import { NextResponse } from "next/server";
import { crewDenied } from "@/lib/crew-guard";
import { applyBoardAction, loadBoard } from "@/lib/light/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await crewDenied(["crew", "admin"]);
  if (denied) return denied;
  const url = new URL(request.url);
  const code = url.searchParams.get("code") || "NBCU";
  const token = url.searchParams.get("t") || "";
  const board = await loadBoard(code, token);
  if (!board) return NextResponse.json({ error: "Program not found." }, { status: 404 });
  return NextResponse.json(board);
}

export async function POST(request: Request) {
  const denied = await crewDenied(["crew", "admin"]);
  if (denied) return denied;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Send JSON." }, { status: 400 });
  const result = await applyBoardAction(body);
  if ("error" in result && result.error) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}
