import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { publishOps } from "@/lib/realtime";

export async function recordStatus(opts: {
  entityType: string;
  entityId: string;
  fromStatus?: string | null;
  toStatus: string;
  actorId?: string | null;
  reason?: string | null;
  eventId?: string;
  tx?: Prisma.TransactionClient;
}) {
  const client = opts.tx ?? db;
  await client.statusHistory.create({
    data: {
      entityType: opts.entityType,
      entityId: opts.entityId,
      fromStatus: opts.fromStatus ?? null,
      toStatus: opts.toStatus,
      actorId: opts.actorId ?? null,
      reason: opts.reason ?? null,
    },
  });
  publishOps({
    type: "status",
    eventId: opts.eventId,
    entityType: opts.entityType,
    entityId: opts.entityId,
  });
}

export async function recordAudit(opts: {
  action: string;
  entityType: string;
  entityId: string;
  actorId?: string | null;
  before?: unknown;
  after?: unknown;
  reason?: string | null;
  eventId?: string;
  tx?: Prisma.TransactionClient;
}) {
  const client = opts.tx ?? db;
  await client.auditLog.create({
    data: {
      actorId: opts.actorId ?? null,
      action: opts.action,
      entityType: opts.entityType,
      entityId: opts.entityId,
      beforeJson: opts.before ? JSON.stringify(opts.before) : null,
      afterJson: opts.after ? JSON.stringify(opts.after) : null,
      reason: opts.reason ?? null,
    },
  });
  publishOps({
    type: "audit",
    eventId: opts.eventId,
    entityType: opts.entityType,
    entityId: opts.entityId,
  });
}
