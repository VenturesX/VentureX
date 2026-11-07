import { SignJWT, jwtVerify } from "jose";
import { dateAtEtClock, todayET } from "@/lib/light/checkin";

export const CREW_COOKIE = "vd_crew";
export const PROGRAM_COOKIE = "vd_program";

export type CrewSession = {
  kind: "crew" | "admin" | "client";
  programId: string;
  personId: string;
  name: string;
};

export type GateSession = {
  scope: "program" | "all";
  programId: string;
  programName: string;
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

export async function signCrewToken(session: CrewSession, exp = endOfShiftUnix()) {
  return new SignJWT({ ...session })
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

export async function readCrewToken(token: string): Promise<CrewSession | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.kind !== "crew" && payload.kind !== "admin" && payload.kind !== "client") return null;
    if (!payload.programId && payload.kind !== "admin") return null;
    return {
      kind: payload.kind,
      programId: String(payload.programId ?? ""),
      personId: String(payload.personId ?? ""),
      name: String(payload.name ?? ""),
    };
  } catch {
    return null;
  }
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
