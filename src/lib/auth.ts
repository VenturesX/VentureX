import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import type { Role } from "@prisma/client";

export const SESSION_COOKIE = "vd_session";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  clientId?: string | null;
  driverId?: string | null;
};

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(value);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function signSession(user: SessionUser) {
  return new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("16h")
    .sign(secret());
}

export async function readSessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.id || !payload.role || !payload.email) return null;
    return {
      id: String(payload.id),
      email: String(payload.email),
      name: String(payload.name ?? ""),
      role: payload.role as Role,
      clientId: payload.clientId ? String(payload.clientId) : null,
      driverId: payload.driverId ? String(payload.driverId) : null,
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return readSessionToken(token);
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    const error = new Error("Unauthorized") as Error & { status: number };
    error.status = 401;
    throw error;
  }
  return session;
}
