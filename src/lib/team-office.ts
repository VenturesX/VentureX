import { db } from "@/lib/db";
import { hashAccessCodes } from "@/lib/crew-access";
import { POSITIONS, todayET } from "@/lib/light/checkin";

const CODE_PATTERN = /^[A-Z0-9]{2,12}$/;

export function rosterPhone(input: string) {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  return "";
}

function cleanCode(input: string) {
  return input.trim().toUpperCase();
}

function aliasList(input: string) {
  return input
    .split(",")
    .map((item) => cleanCode(item))
    .filter(Boolean);
}

export async function officeSnapshot() {
  const programs = await db.lightProgram.findMany({
    orderBy: { name: "asc" },
    include: { roster: { orderBy: { name: "asc" } } },
  });
  const today = todayET();
  return {
    positions: POSITIONS.map((item) => ({ code: item.code, label: item.label })),
    programs: programs.map((program) => ({
      id: program.id,
      name: program.name,
      code: program.code,
      aliases: program.aliases,
      hasClientCode: Boolean(program.clientCodeHash),
      staff: program.roster.map((person) => ({
        id: person.id,
        name: person.name,
        phone: person.phone,
        postCode: person.expectedPost || person.postCode,
        in: Boolean(person.checkedInAt && !person.checkedOutAt && person.dayCodeDate === today),
      })),
    })),
  };
}

export async function createProgram(input: { name?: string; code?: string; aliases?: string }) {
  const name = String(input.name ?? "").trim();
  const code = cleanCode(String(input.code ?? ""));
  const aliases = aliasList(String(input.aliases ?? ""));
  if (name.length < 2 || name.length > 80) return { error: "Enter a program name." };
  if (!CODE_PATTERN.test(code) || aliases.some((item) => !CODE_PATTERN.test(item))) {
    return { error: "Use 2 to 12 letters or numbers for each code." };
  }
  const accessCodeHash = await hashAccessCodes([code, ...aliases], true);
  try {
    await db.lightProgram.create({
      data: {
        name,
        code,
        aliases: aliases.join(","),
        accessCodeHash,
        timezone: "America/New_York",
        status: "LIVE",
      },
    });
  } catch {
    return { error: "That program code is already in use." };
  }
  return { ok: true as const };
}

export async function updateProgram(input: { id?: string; name?: string; code?: string; aliases?: string }) {
  const id = String(input.id ?? "");
  const name = String(input.name ?? "").trim();
  const code = cleanCode(String(input.code ?? ""));
  const aliases = aliasList(String(input.aliases ?? ""));
  if (!id) return { error: "Choose a program." };
  if (name.length < 2 || name.length > 80) return { error: "Enter a program name." };
  if (!CODE_PATTERN.test(code) || aliases.some((item) => !CODE_PATTERN.test(item))) {
    return { error: "Use 2 to 12 letters or numbers for each code." };
  }
  const accessCodeHash = await hashAccessCodes([code, ...aliases], true);
  try {
    await db.lightProgram.update({
      where: { id },
      data: { name, code, aliases: aliases.join(","), accessCodeHash },
    });
  } catch {
    return { error: "That program code is already in use." };
  }
  return { ok: true as const };
}

export async function deleteProgram(id: string) {
  if (!id) return { error: "Choose a program." };
  await db.lightProgram.delete({ where: { id } });
  return { ok: true as const };
}

export async function setClientCode(id: string, code: string) {
  const next = cleanCode(code);
  if (!id) return { error: "Choose a program." };
  if (!CODE_PATTERN.test(next)) return { error: "Use 2 to 12 letters or numbers for the client code." };
  await db.lightProgram.update({
    where: { id },
    data: { clientCodeHash: await hashAccessCodes([next], true) },
  });
  return { ok: true as const };
}

export async function clearClientCode(id: string) {
  if (!id) return { error: "Choose a program." };
  await db.lightProgram.update({ where: { id }, data: { clientCodeHash: "" } });
  return { ok: true as const };
}

export async function resetDayCodes(programId: string, personId = "") {
  if (!programId && !personId) return { error: "Choose a program." };
  await db.lightRoster.updateMany({
    where: {
      ...(programId ? { programId } : {}),
      ...(personId ? { id: personId } : {}),
    },
    data: { dayCode: "", dayCodeDate: "", checkedInAt: null, checkedOutAt: null, pending: "" },
  });
  return { ok: true as const };
}

export async function saveStaff(input: { id?: string; programId?: string; name?: string; phone?: string; postCode?: string }) {
  const name = String(input.name ?? "").trim();
  const phone = rosterPhone(String(input.phone ?? ""));
  const postCode = String(input.postCode ?? "");
  if (name.length < 2 || name.length > 80) return { error: "Enter the person's name." };
  if (!phone) return { error: "Enter a phone number." };
  if (!POSITIONS.some((item) => item.code === postCode)) return { error: "Choose a position." };
  try {
    if (input.id) {
      await db.lightRoster.update({
        where: { id: input.id },
        data: { name, phone, postCode, expectedPost: postCode },
      });
    } else {
      if (!input.programId) return { error: "Choose a program." };
      await db.lightRoster.create({
        data: { programId: input.programId, name, phone, postCode, expectedPost: postCode, role: "greeter" },
      });
    }
  } catch {
    return { error: "That phone is already on this program." };
  }
  return { ok: true as const };
}

export async function deleteStaff(id: string) {
  if (!id) return { error: "Choose a person." };
  await db.lightRoster.delete({ where: { id } });
  return { ok: true as const };
}
