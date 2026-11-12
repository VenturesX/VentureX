import { createHash, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { todayET } from "@/lib/light/checkin";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_TRIES = 8;

export async function hashAccessCodes(codes: string[], normalize = false) {
  const unique = [...new Set(codes.map((code) => (normalize ? code.trim().toUpperCase() : code.trim())).filter((code) => code.length >= 2))];
  const hashes = await Promise.all(unique.map((code) => bcrypt.hash(code, 10)));
  return hashes.join("|");
}

export async function matchesAccessCode(input: string, stored: string, normalize = false) {
  const code = normalize ? input.trim().toUpperCase() : input.trim();
  if (code.length < 2 || !stored) return false;
  for (const hash of stored.split("|")) {
    if (hash && (await bcrypt.compare(code, hash))) return true;
  }
  return false;
}

export function sameSecret(input: string, expected: string) {
  if (!input || !expected) return false;
  const left = createHash("sha256").update(input).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right);
}

export async function tooManyTries(ip: string) {
  const since = new Date(Date.now() - WINDOW_MS);
  const count = await db.crewLoginAttempt.count({ where: { ip, createdAt: { gte: since } } });
  return count >= MAX_TRIES;
}

export async function noteFailedTry(ip: string) {
  await db.crewLoginAttempt.create({ data: { ip } });
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await db.crewLoginAttempt.deleteMany({ where: { createdAt: { lt: cutoff } } });
}

export async function findProgramByAccessCode(code: string) {
  const programs = await db.lightProgram.findMany({
    where: { accessCodeHash: { not: "" } },
    select: { id: true, name: true, accessCodeHash: true },
  });
  for (const program of programs) {
    if (await matchesAccessCode(code, program.accessCodeHash, true)) {
      return { id: program.id, name: program.name };
    }
  }
  return null;
}

export async function findCrewByDayCode(programId: string | null, code: string) {
  const shifts = await shiftsForDayCode(code, programId);
  if (shifts.length !== 1) return null;
  return db.lightRoster.findFirst({ where: { id: shifts[0].rosterId } });
}

export type DayShift = {
  rosterId: string;
  programId: string;
  programName: string;
  name: string;
  phone: string;
  dayCode: string;
};

// A person can hold two roster rows (same phone) on the same day, each with its own day code and program.
export function collectShifts(direct: DayShift[], siblings: DayShift[]): DayShift[] {
  const phones = new Set(direct.map((row) => row.phone).filter(Boolean));
  const pool = siblings.filter((row) => phones.has(row.phone));
  const source = pool.length ? pool : direct;
  const seen = new Set<string>();
  const shifts: DayShift[] = [];
  for (const row of source) {
    if (seen.has(row.programId)) continue;
    seen.add(row.programId);
    shifts.push(row);
  }
  return shifts;
}

export async function shiftsForDayCode(code: string, programId: string | null = null): Promise<DayShift[]> {
  const dayCode = code.trim();
  if (!dayCode) return [];
  const today = todayET();
  const directRows = await db.lightRoster.findMany({
    where: {
      ...(programId ? { programId } : {}),
      dayCode,
      dayCodeDate: today,
      checkedOutAt: null,
      checkedInAt: { not: null },
    },
    include: { program: { select: { id: true, name: true } } },
  });
  const direct = directRows.map(toShift);
  if (!direct.length) return [];
  const phones = [...new Set(direct.map((row) => row.phone).filter(Boolean))];
  const siblingRows = phones.length
    ? await db.lightRoster.findMany({
        where: {
          phone: { in: phones },
          dayCodeDate: today,
          dayCode: { not: "" },
          checkedOutAt: null,
          checkedInAt: { not: null },
        },
        include: { program: { select: { id: true, name: true } } },
      })
    : [];
  return collectShifts(direct, siblingRows.map(toShift));
}

function toShift(row: { id: string; programId: string; name: string; phone: string; dayCode: string; program: { id: string; name: string } }): DayShift {
  return {
    rosterId: row.id,
    programId: row.program.id,
    programName: row.program.name,
    name: row.name,
    phone: row.phone,
    dayCode: row.dayCode,
  };
}

export async function findClientProgram(programId: string | null, code: string) {
  const programs = await db.lightProgram.findMany({
    where: programId ? { id: programId } : {},
    select: { id: true, name: true, accessCodeHash: true, clientCodeHash: true },
  });
  for (const program of programs) {
    if (program.clientCodeHash) {
      if (await matchesAccessCode(code, program.clientCodeHash, true)) return { id: program.id, name: program.name };
      continue;
    }
    if (await matchesAccessCode(code, program.accessCodeHash, true)) return { id: program.id, name: program.name };
  }
  return null;
}

export function ownerHubConfigured() {
  return Boolean(process.env.OWNER_HUB_CODE || process.env.OWNER_ACCESS_CODE);
}

export async function ownerCodeMatches(code: string) {
  const hub = process.env.OWNER_HUB_CODE || "";
  if (hub) return sameSecret(code.trim(), hub);
  const legacy = process.env.OWNER_ACCESS_CODE || "";
  if (!legacy) return false;
  return sameSecret(code.trim(), legacy);
}

export async function staffCodeMatches(code: string) {
  const envCode = process.env.STAFF_MASTER_CODE || "";
  if (!envCode) return false;
  return sameSecret(code.trim(), envCode);
}

export async function masterDayMatches(code: string) {
  const envCode = process.env.MASTER_DAY_CODE || "";
  if (!envCode) return false;
  return sameSecret(code.trim(), envCode);
}
