import { NextResponse } from "next/server";
import { jsonError, requireApi } from "@/lib/api";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    await requireApi("ops.read");
    const url = new URL(request.url);
    const entityId = url.searchParams.get("entityId");
    const entityType = url.searchParams.get("entityType");
    const [audit, history] = await Promise.all([
      db.auditLog.findMany({
        where: {
          ...(entityId ? { entityId } : {}),
          ...(entityType ? { entityType } : {}),
        },
        include: { actor: true },
        orderBy: { createdAt: "desc" },
        take: 80,
      }),
      db.statusHistory.findMany({
        where: {
          ...(entityId ? { entityId } : {}),
          ...(entityType ? { entityType } : {}),
        },
        include: { actor: true },
        orderBy: { createdAt: "desc" },
        take: 80,
      }),
    ]);
    return NextResponse.json({ audit, history });
  } catch (error) {
    return jsonError(error);
  }
}
