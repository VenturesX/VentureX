import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { falconUrlError, parseFalconPayload } from "@/lib/shuttle/falcon";
import { readDesk, saveDesk } from "@/lib/shuttle/store";
import type { ShuttleStop } from "@/lib/shuttle/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: string; payload?: unknown; eventCode?: string };
    let payload = body.payload;
    if (typeof body.url === "string" && body.url.trim()) {
      const blocked = falconUrlError(body.url);
      if (blocked) return NextResponse.json({ error: blocked }, { status: 400 });
      payload = await pullFalcon(body.url.trim());
    }
    if (payload == null) {
      return NextResponse.json({ error: "Paste an EventFalcon JSON feed or a read-only view link." }, { status: 400 });
    }
    const parsed = parseFalconPayload(payload);
    const { desk } = await readDesk();
    const stops = mergeStops(desk.stops, parsed.stops);
    const fixes = [...parsed.vehicles, ...desk.fixes.filter((fix) => !parsed.vehicles.some((item) => item.puckId === fix.puckId))].slice(0, 40);
    const saved = await saveDesk({
      ...desk,
      eventCode: body.eventCode?.trim() || desk.eventCode,
      stops,
      fixes,
    });
    return NextResponse.json({ ok: true, note: parsed.note, ...saved });
  } catch (error) {
    return jsonError(error);
  }
}

async function pullFalcon(raw: string) {
  let response: Response;
  try {
    response = await fetch(raw, {
      redirect: "manual",
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw Object.assign(new Error("EventFalcon did not answer. Paste the JSON feed instead."), { status: 400 });
  }
  if (response.status >= 300 && response.status < 400) {
    throw Object.assign(new Error("EventFalcon redirected this link. Paste the JSON feed instead so the board does not follow you into a sign-in."), { status: 400 });
  }
  const text = await response.text();
  if (!response.ok) {
    throw Object.assign(new Error("EventFalcon did not return a data feed. Paste the JSON export instead."), { status: 400 });
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw Object.assign(
      new Error("That view is a map page, not JSON. Export the feed and paste it here. This board will not open a PaxCountApp session."),
      { status: 400 },
    );
  }
}

function mergeStops(current: ShuttleStop[], imported: ShuttleStop[]) {
  const next = [...current];
  for (const stop of imported) {
    if (!next.some((item) => item.code === stop.code || item.id === stop.id)) next.push(stop);
  }
  return next;
}
