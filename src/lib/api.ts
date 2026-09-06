import { NextResponse } from "next/server";
import { getSession, type SessionUser } from "@/lib/auth";
import { canMutate } from "@/lib/roles";

export async function requireApi(action = "ops.read"): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw Object.assign(new Error("Sign in required"), { status: 401 });
  }
  if (!canMutate(session.role, action)) {
    throw Object.assign(new Error("Not authorized for this action"), { status: 403 });
  }
  return session;
}

export function jsonError(error: unknown) {
  const err = error as { status?: number; message?: string };
  const status = err.status ?? 500;
  return NextResponse.json({ error: err.message ?? "Unexpected error" }, { status });
}
