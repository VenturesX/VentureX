import { NextResponse } from "next/server";
import { jsonError, requireApi } from "@/lib/api";
import { db } from "@/lib/db";
import { recordAudit, recordStatus } from "@/lib/ops/audit";
import { QUOTE_STATUSES, type QuoteStatus } from "@/lib/quotes";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireApi("quotes.update");
    const { id } = await context.params;
    const body = (await request.json()) as { status?: string };
    const status = String(body.status ?? "");
    if (!QUOTE_STATUSES.includes(status as QuoteStatus)) {
      return NextResponse.json({ error: "Choose New, Quoted, Won, or Lost." }, { status: 400 });
    }
    const nextStatus = status as QuoteStatus;
    const existing = await db.quoteRequest.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!existing) return NextResponse.json({ error: "Quote request not found" }, { status: 404 });
    const row = await db.quoteRequest.update({
      where: { id },
      data: { status: nextStatus },
      select: { id: true, reference: true, status: true },
    });
    if (existing.status !== nextStatus) {
      await recordStatus({
        entityType: "QUOTE_REQUEST",
        entityId: id,
        fromStatus: existing.status,
        toStatus: nextStatus,
        actorId: actor.id,
      });
      await recordAudit({
        action: "quote.status",
        entityType: "QUOTE_REQUEST",
        entityId: id,
        actorId: actor.id,
        before: { status: existing.status },
        after: { status: nextStatus },
      });
    }
    return NextResponse.json({ row });
  } catch (error) {
    return jsonError(error);
  }
}
