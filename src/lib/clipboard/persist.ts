import type { PrismaClient } from "@prisma/client";
import { db } from "../db";
import { asHeadway } from "./logic";
import { buildSeedPrograms, syncOfficialDays } from "./seed-data";
import type { BreakStatus, ClipboardDay, ClipboardProgram, DayMode, DispatchRun, HeadwayMinutes, IngressStop, RosterRow } from "./types";

type ClipClient = PrismaClient;

function clip(value: string, max: number) {
  return value.trim().slice(0, max);
}

function integer(value: unknown, fallback = 0) {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.round(number));
}

function optionalInteger(value: unknown) {
  if (value == null || value === "") return null;
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(number)) return null;
  return Math.max(0, Math.round(number));
}

function text(value: unknown, max: number, fallback = "") {
  return typeof value === "string" ? clip(value, max) : fallback;
}

export function parsePrograms(input: unknown): ClipboardProgram[] {
  if (!Array.isArray(input) || input.length < 1 || input.length > 40) {
    throw Object.assign(new Error("Clipboard needs at least one program"), { status: 400 });
  }
  return input.map((program, programIndex) => {
    const record = asRecord(program);
    const days = Array.isArray(record.days) ? record.days.slice(0, 60) : [];
    return {
      id: idOf(record.id, `program-${programIndex + 1}`),
      name: text(record.name, 120) || `Program ${programIndex + 1}`,
      days: days.map((day, dayIndex) => parseDay(day, dayIndex)),
    };
  });
}

function parseDay(input: unknown, index: number): ClipboardDay {
  const record = asRecord(input);
  const rosterIn = Array.isArray(record.roster) ? record.roster.slice(0, 80) : [];
  const runsIn = Array.isArray(record.runs) ? record.runs.slice(0, 500) : [];
  const headway = integer(record.headwayMinutes, 15);
  return {
    id: idOf(record.id, `day-${index + 1}`),
    label: text(record.label, 80) || `Day ${index + 1}`,
    notes: text(record.notes, 800),
    splitMode: Boolean(record.splitMode),
    stopAName: text(record.stopAName, 40) || "Hilton",
    stopBName: text(record.stopBName, 40) || "Element",
    headwayMinutes: (headway === 20 ? 20 : 15) as HeadwayMinutes,
    nextDispatch: text(record.nextDispatch, 40),
    activeRosterId: typeof record.activeRosterId === "string" && record.activeRosterId ? clip(record.activeRosterId, 80) : null,
    clickerA: integer(record.clickerA),
    clickerB: integer(record.clickerB),
    pendingLogged: Boolean(record.pendingLogged),
    pendingNote: text(record.pendingNote, 120),
    mode: record.mode === "special" ? "special" : "loop",
    seedRevision: text(record.seedRevision, 80),
    departureStop: text(record.departureStop, 80),
    ingress: parseIngress(record.ingress),
    overageEnabled: Boolean(record.overageEnabled),
    roster: rosterIn.map((row, rowIndex) => parseRoster(row, rowIndex)),
    runs: runsIn.map((run, runIndex) => parseRun(run, runIndex)),
  };
}

function parseRoster(input: unknown, index: number): RosterRow {
  const record = asRecord(input);
  return {
    id: idOf(record.id, `roster-${index + 1}`),
    busPuck: text(record.busPuck, 40),
    driver: text(record.driver, 80),
    phone: text(record.phone, 40),
    breakText: text(record.breakText, 80) || "--",
    siteCode: text(record.siteCode, 40),
    isFillIn: Boolean(record.isFillIn),
    breakStatus: breakStatus(record.breakStatus),
  };
}

function parseRun(input: unknown, index: number): DispatchRun {
  const record = asRecord(input);
  return {
    id: idOf(record.id, `run-${index + 1}`),
    timeLabel: text(record.timeLabel, 40),
    busPuck: text(record.busPuck, 40),
    driver: text(record.driver, 80),
    pax: integer(record.pax),
    stopAPax: optionalInteger(record.stopAPax),
    stopBPax: optionalInteger(record.stopBPax),
    siteCode: text(record.siteCode, 40),
    siteNote: text(record.siteNote, 120),
    logged: Boolean(record.logged),
    synced: record.synced !== false,
    paxUnknown: Boolean(record.paxUnknown),
    advance: Boolean(record.advance),
    stopName: text(record.stopName, 80),
    excluded: Boolean(record.excluded),
  };
}

function breakStatus(value: unknown): BreakStatus | "" {
  if (value === "back" || value === "on" || value === "need" || value === "fill-in") return value;
  return "";
}

function parseIngress(value: unknown): IngressStop[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 12).map((item, index) => {
    const record = asRecord(item);
    return {
      id: idOf(record.id, `stop-${index + 1}`),
      name: text(record.name, 80) || `Stop ${index + 1}`,
      count: integer(record.count),
      staffed: record.staffed !== false,
    };
  });
}

function ingressFromJson(value: string): IngressStop[] {
  try {
    return parseIngress(JSON.parse(value) as unknown);
  } catch {
    return [];
  }
}

function dayMode(value: string): DayMode {
  return value === "special" ? "special" : "loop";
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function idOf(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const cleaned = value.trim().replace(/[^\w:-]/g, "").slice(0, 80);
  return cleaned || fallback;
}

export async function readClipboard(client: ClipClient = db): Promise<ClipboardProgram[]> {
  const programs = await client.clipboardProgram.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      days: {
        orderBy: { sortOrder: "asc" },
        include: {
          roster: { orderBy: { sortOrder: "asc" } },
          runs: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });
  return programs.map((program) => ({
    id: program.id,
    name: program.name,
    days: program.days.map((item) => ({
      id: item.id,
      label: item.label,
      notes: item.notes,
      splitMode: item.splitMode,
      stopAName: item.stopAName,
      stopBName: item.stopBName,
      headwayMinutes: asHeadway(item.headwayMinutes),
      nextDispatch: item.nextDispatch,
      activeRosterId: item.activeRosterId,
      clickerA: item.clickerA,
      clickerB: item.clickerB,
      pendingLogged: item.pendingLogged,
      pendingNote: item.pendingNote,
      mode: dayMode(item.mode),
      seedRevision: item.seedRevision,
      departureStop: item.departureStop,
      ingress: ingressFromJson(item.ingressJson),
      overageEnabled: item.overageEnabled,
      roster: item.roster.map((row) => ({
        id: row.id,
        busPuck: row.busPuck,
        driver: row.driverName,
        phone: row.phone,
        breakText: row.breakText,
        siteCode: row.siteCode,
        isFillIn: row.isFillIn,
        breakStatus: breakStatus(row.breakStatus),
      })),
      runs: item.runs.map((runRow) => ({
        id: runRow.id,
        timeLabel: runRow.timeLabel,
        busPuck: runRow.busPuck,
        driver: runRow.driverName,
        pax: runRow.pax,
        stopAPax: runRow.stopAPax,
        stopBPax: runRow.stopBPax,
        siteCode: runRow.siteCode,
        siteNote: runRow.siteNote,
        logged: runRow.logged,
        synced: runRow.synced,
        paxUnknown: runRow.paxUnknown,
        advance: runRow.advance,
        stopName: runRow.stopName,
        excluded: runRow.excluded,
      })),
    })),
  }));
}

export async function replaceClipboard(client: ClipClient, programs: ClipboardProgram[]) {
  await client.$transaction(async (tx) => {
    await tx.clipboardRun.deleteMany();
    await tx.clipboardRoster.deleteMany();
    await tx.clipboardDay.deleteMany();
    await tx.clipboardProgram.deleteMany();
    for (const [programIndex, program] of programs.entries()) {
      await tx.clipboardProgram.create({
        data: {
          id: program.id,
          name: program.name,
          sortOrder: programIndex,
          days: {
            create: program.days.map((item, dayIndex) => ({
              id: item.id,
              label: item.label,
              notes: item.notes,
              sortOrder: dayIndex,
              splitMode: item.splitMode,
              stopAName: item.stopAName,
              stopBName: item.stopBName,
              headwayMinutes: item.headwayMinutes,
              nextDispatch: item.nextDispatch,
              activeRosterId: item.activeRosterId,
              clickerA: item.clickerA,
              clickerB: item.clickerB,
              pendingLogged: item.pendingLogged,
              pendingNote: item.pendingNote,
              mode: item.mode,
              seedRevision: item.seedRevision,
              departureStop: item.departureStop,
              ingressJson: JSON.stringify(item.ingress ?? []),
              overageEnabled: item.overageEnabled,
              roster: {
                create: item.roster.map((row, rowIndex) => ({
                  id: row.id,
                  sortOrder: rowIndex,
                  busPuck: row.busPuck,
                  driverName: row.driver,
                  phone: row.phone,
                  breakText: row.breakText || "--",
                  siteCode: row.siteCode,
                  isFillIn: row.isFillIn,
                  breakStatus: row.breakStatus,
                })),
              },
              runs: {
                create: item.runs.map((runRow, runIndex) => ({
                  id: runRow.id,
                  sortOrder: runIndex,
                  timeLabel: runRow.timeLabel,
                  busPuck: runRow.busPuck,
                  driverName: runRow.driver,
                  pax: runRow.pax,
                  stopAPax: runRow.stopAPax,
                  stopBPax: runRow.stopBPax,
                  siteCode: runRow.siteCode,
                  siteNote: runRow.siteNote,
                  logged: runRow.logged,
                  synced: runRow.synced,
                  paxUnknown: runRow.paxUnknown,
                  advance: runRow.advance,
                  stopName: runRow.stopName,
                  excluded: runRow.excluded,
                })),
              },
            })),
          },
        },
      });
    }
  });
}

export async function seedClipboard(client: ClipClient = db) {
  await replaceClipboard(client, buildSeedPrograms());
}

export async function loadClipboard() {
  const count = await db.clipboardProgram.count();
  if (count === 0) await seedClipboard(db);
  const programs = await readClipboard(db);
  const merged = syncOfficialDays(programs);
  if (merged.changed) {
    try {
      await replaceClipboard(db, merged.programs);
    } catch {
      /* The Monday sheet is still returned for this phone. */
    }
  }
  return merged.programs;
}
