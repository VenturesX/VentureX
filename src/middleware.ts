import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { PORTAL_ROLES } from "@/lib/roles";
import type { Role } from "@prisma/client";

const PUBLIC = ["/login", "/manifest.webmanifest", "/sw.js", "/icons", "/offline"];

function isPublic(pathname: string) {
  if (pathname.startsWith("/api/auth/login")) return true;
  if (pathname.startsWith("/_next")) return true;
  return PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublic(pathname) || pathname === "/") {
    return NextResponse.next();
  }

  const token = request.cookies.get("vd_session")?.value;
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  try {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? "");
    const { payload } = await jwtVerify(token, secret);
    const role = payload.role as Role;
    const match = Object.entries(PORTAL_ROLES).find(
      ([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );
    if (match && !match[1].includes(role)) {
      const home = {
        ADMIN: "/admin",
        DISPATCHER: "/dispatch",
        MEET_GREET: "/meet-greet",
        DRIVER: "/driver",
        CLIENT: "/client",
      }[role] ?? "/login";
      return NextResponse.redirect(new URL(home, request.url));
    }
    return NextResponse.next();
  } catch {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|.*\\.(?:svg|png|jpg|ico)$).*)"],
};
