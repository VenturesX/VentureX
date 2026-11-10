import { SignJWT, jwtVerify } from "jose";
import { dateAtEtClock, todayET } from "@/lib/light/checkin";

export const CREW_COOKIE = "vd_crew";
export const PROGRAM_COOKIE = "vd_program";

export const OWNER_IDLE_SECONDS = 15 * 60;

export type CrewSession = {
  kind: "crew" | "admin" | "client" | "lead";
  programId: string;
  personId: string;
  name: string;
  touched?: number;
};

export type GateSession = {
  scope: "program" | "all";
  programId: string;
  programName: string;
  staffOnly?: boolean;
};

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(value);
}

export function endOfShiftUnix(now = new Date()) {
  const [year, month, day] = todayET(now).split("-").map(Number);
  const probe = new Date(Date.UTC(year, month - 1, day + 1, 15, 0, 0));
  return Math.floor(dateAtEtClock("00:00", probe).getTime() / 1000);
}

export function ownerIsIdle(touched: number | undefined, now = Date.now()) {
  if (!touched) return false;
  return now / 1000 - touched > OWNER_IDLE_SECONDS;
}

export function ownerIdleRemaining(touched: number | undefined, now = Date.now()) {
  if (!touched) return OWNER_IDLE_SECONDS;
  return Math.max(0, Math.floor(OWNER_IDLE_SECONDS - (now / 1000 - touched)));
}

export function roleAllows(kind: CrewSession["kind"], lock: "staff" | "desk" | "admin" | "field" | "lead") {
  if (lock === "admin") return kind === "admin";
  if (lock === "lead") return kind === "admin" || kind === "lead";
  if (lock === "desk") return kind === "admin" || kind === "client" || kind === "lead";
  return kind === "crew" || kind === "admin" || kind === "lead";
}

export async function signCrewToken(session: CrewSession, exp = endOfShiftUnix()) {
  const touched = session.kind === "admin" ? session.touched ?? Math.floor(Date.now() / 1000) : undefined;
  return new SignJWT({ ...session, touched })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(secret());
}

export async function signGateToken(gate: GateSession) {
  return new SignJWT({ kind: "gate", ...gate })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(endOfShiftUnix())
    .sign(secret());
}

export async function readCrewPayload(token: string): Promise<CrewSession | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.kind !== "crew" && payload.kind !== "admin" && payload.kind !== "client" && payload.kind !== "lead") return null;
    if (!payload.programId && payload.kind !== "admin") return null;
    return {
      kind: payload.kind,
      programId: String(payload.programId ?? ""),
      personId: String(payload.personId ?? ""),
      name: String(payload.name ?? ""),
      touched: typeof payload.touched === "number" ? payload.touched : undefined,
    };
  } catch {
    return null;
  }
}

export async function readCrewToken(token: string): Promise<CrewSession | null> {
  const session = await readCrewPayload(token);
  if (!session) return null;
  if (session.kind === "admin" && ownerIsIdle(session.touched)) return null;
  return session;
}

export async function readGateToken(token: string): Promise<GateSession | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.kind !== "gate") return null;
    if (payload.scope !== "program" && payload.scope !== "all") return null;
    return {
      scope: payload.scope,
      programId: String(payload.programId ?? ""),
      programName: String(payload.programName ?? ""),
      staffOnly: payload.staffOnly === true,
    };
  } catch {
    return null;
  }
}

export async function staffTokenValid(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret());
    return Boolean(payload.role && payload.id);
  } catch {
    return false;
  }
}
