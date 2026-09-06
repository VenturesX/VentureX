import Papa from "papaparse";
import type { Priority } from "@prisma/client";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/ops/audit";

export type ManifestRow = {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  partySize?: string | number;
  partyCode?: string;
  flightNumber?: string;
  flightEta?: string;
  hotelName?: string;
  confirmationCode?: string;
  priority?: string;
  notes?: string;
  assistanceNotes?: string;
};

const PRIORITY_MAP: Record<string, Priority> = {
  normal: "NORMAL",
  vip: "VIP",
  priority: "VIP",
  "vip/priority": "VIP",
  accessibility: "ACCESSIBILITY",
  assistance: "ACCESSIBILITY",
};

export function parseManifest(csvText: string) {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });

  const errors: { row: number; message: string }[] = [];
  const rows: ManifestRow[] = [];

  parsed.data.forEach((raw, i) => {
    const rowNum = i + 2;
    const get = (...keys: string[]) => {
      for (const key of keys) {
        const found = Object.entries(raw).find(
          ([k]) => k.toLowerCase().replace(/[\s_]+/g, "") === key.toLowerCase().replace(/[\s_]+/g, ""),
        );
        if (found?.[1]) return found[1].trim();
      }
      return "";
    };
    const firstName = get("firstName", "first", "guestFirst");
    const lastName = get("lastName", "last", "guestLast");
    if (!firstName || !lastName) {
      errors.push({ row: rowNum, message: "firstName and lastName are required" });
      return;
    }
    rows.push({
      firstName,
      lastName,
      email: get("email"),
      phone: get("phone", "mobile"),
      partySize: get("partySize", "pax") || "1",
      partyCode: get("partyCode", "group", "groupCode"),
      flightNumber: get("flightNumber", "flight"),
      flightEta: get("flightEta", "eta", "arrivalTime"),
      hotelName: get("hotelName", "hotel"),
      confirmationCode: get("confirmationCode", "confirmation", "recordLocator"),
      priority: get("priority"),
      notes: get("notes"),
      assistanceNotes: get("assistanceNotes", "assistance"),
    });
  });

  return { rows, errors: [...errors, ...parsed.errors.map((e) => ({ row: (e.row ?? 0) + 1, message: e.message }))] };
}

export async function importManifest(opts: {
  eventId: string;
  movementId?: string | null;
  csvText: string;
  actorId: string;
}) {
  const { rows, errors } = parseManifest(opts.csvText);
  const created: string[] = [];
  const duplicates: { row: number; key: string }[] = [];
  const skipped = [...errors];

  const existing = await db.guest.findMany({
    where: { eventId: opts.eventId, deletedAt: null },
    select: { confirmationCode: true, firstName: true, lastName: true, flightNumber: true, email: true },
  });
  const confirmSet = new Set(
    existing.map((g) => g.confirmationCode?.toLowerCase()).filter(Boolean) as string[],
  );
  const identitySet = new Set(
    existing.map((g) => `${g.lastName}|${g.firstName}|${g.flightNumber ?? ""}|${g.email ?? ""}`.toLowerCase()),
  );

  let rowNum = 2;
  for (const row of rows) {
    const confirm = row.confirmationCode?.toLowerCase();
    const identity = `${row.lastName}|${row.firstName}|${row.flightNumber ?? ""}|${row.email ?? ""}`.toLowerCase();
    if ((confirm && confirmSet.has(confirm)) || identitySet.has(identity)) {
      duplicates.push({ row: rowNum, key: confirm || identity });
      rowNum += 1;
      continue;
    }
    const partySize = Math.max(1, Number(row.partySize || 1) || 1);
    const priority = PRIORITY_MAP[(row.priority ?? "normal").toLowerCase()] ?? "NORMAL";
    let flightEta: Date | null = null;
    if (row.flightEta) {
      const parsed = new Date(row.flightEta);
      if (!Number.isNaN(parsed.getTime())) flightEta = parsed;
    }
    const guest = await db.guest.create({
      data: {
        eventId: opts.eventId,
        movementId: opts.movementId ?? null,
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email || null,
        phone: row.phone || null,
        partySize,
        partyCode: row.partyCode || null,
        flightNumber: row.flightNumber || null,
        flightEta,
        hotelName: row.hotelName || null,
        confirmationCode: row.confirmationCode || null,
        priority,
        notes: row.notes || null,
        assistanceNotes: row.assistanceNotes || null,
      },
    });
    created.push(guest.id);
    if (confirm) confirmSet.add(confirm);
    identitySet.add(identity);
    rowNum += 1;
  }

  await recordAudit({
    action: "manifest.import",
    entityType: "EVENT",
    entityId: opts.eventId,
    actorId: opts.actorId,
    after: { created: created.length, duplicates: duplicates.length, errors: skipped.length },
    eventId: opts.eventId,
  });

  return {
    created: created.length,
    duplicates,
    errors: skipped,
    previewRemaining: Math.max(0, rows.length - created.length),
  };
}
