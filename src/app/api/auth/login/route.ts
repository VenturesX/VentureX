import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SESSION_COOKIE, signSession, verifyPassword } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/roles";
import { jsonError } from "@/lib/api";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const user = await db.user.findUnique({
      where: { email },
      include: { driver: true },
    });
    if (!user || user.deletedAt) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    const token = await signSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      clientId: user.clientId,
      driverId: user.driver?.id ?? null,
    });
    const res = NextResponse.json({
      ok: true,
      redirect: ROLE_HOME[user.role],
      user: { id: user.id, name: user.name, role: user.role, email: user.email },
    });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 16,
    });
    return res;
  } catch (error) {
    return jsonError(error);
  }
}
