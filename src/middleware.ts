import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { PORTAL_ROLES } from "@/lib/roles";
import type { Role } from "@prisma/client";
import { CREW_COOKIE, readCrewToken, staffTokenValid, type CrewSession } from "@/lib/crew-session";

const PUBLIC = ["/login", "/manifest.webmanifest", "/sw.js", "/icons", "/offline", "/api/auth/me"];
const SESSION_COOKIE = "vd_session";

function isPublic(pathname: string, method: string) {
  if (pathname.startsWith("/api/auth/login")) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname === "/quote" || pathname.startsWith("/quote/")) return true;
  if (pathname === "/api/quotes" && method === "POST") return true;
  if (pathname === "/api/quotes/preview" && method === "POST") return true;
  if (pathname === "/api/places" && method === "GET") return true;
  if (pathname === "/traveling" || pathname.startsWith("/traveling/")) return true;
  if (pathname === "/t" || pathname.startsWith("/t/")) return true;
  if (pathname === "/api/help" && method === "GET") return true;
  if (pathname === "/api/callbacks" && method === "POST") return true;
  if (pathname === "/api/guest/board" && method === "GET") return true;
  if (pathname === "/api/guest/code" && method === "POST") return true;
  if (pathname === "/api/guest/unlock" && method === "POST") return true;
  if (pathname === "/api/guest/requests" && method === "POST") return true;
  if (pathname.startsWith("/api/sms")) return true;
  if (pathname === "/plan" || pathname.startsWith("/plan/")) return true;
  if (pathname === "/contact" || pathname.startsWith("/contact/")) return true;
  if (pathname === "/trip" || pathname.startsWith("/trip/")) return true;
  if (pathname === "/api/trip" || pathname.startsWith("/api/trip/")) return true;
  if (pathname === "/team") return true;
  if (pathname === "/api/team/unlock" || pathname === "/api/team/session") return true;
  if (pathname.startsWith("/light/h/") || pathname === "/api/light/hotel") return true;
  return PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function crewLock(pathname: string): "staff" | "desk" | "admin" | "field" | null {
  if (pathname === "/api/team/quotes" || pathname === "/api/team/office") return "admin";
  if (pathname === "/api/team/guest-portal") return "desk";
  if (pathname === "/api/team/report" || pathname === "/team/admin") return "desk";
  if (pathname.startsWith("/api/team") || pathname.startsWith("/team/")) return "staff";
  if (pathname === "/light" || pathname.startsWith("/light/") || pathname.startsWith("/api/light")) return "staff";
  const field = ["/owner", "/clipboard", "/shuttle", "/drive", "/staff", "/api/clipboard", "/api/shuttle"];
  if (field.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) return "field";
  return null;
}

function crewAllows(session: CrewSession | null, lock: "staff" | "desk" | "admin" | "field") {
  if (!session) return false;
  if (lock === "admin") return session.kind === "admin";
  if (lock === "desk") return session.kind === "admin" || session.kind === "client";
  return session.kind === "crew" || session.kind === "admin";
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublic(pathname, request.method) || pathname === "/") {
    return NextResponse.next();
  }

  const lock = crewLock(pathname);
  if (lock) {
    const crew = await readCrewToken(request.cookies.get(CREW_COOKIE)?.value || "");
    if (crewAllows(crew, lock)) return NextResponse.next();
    if (lock === "field" && (await staffTokenValid(request.cookies.get(SESSION_COOKIE)?.value || ""))) {
      return NextResponse.next();
    }
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/team";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|marketing/|.*\\.(?:svg|png|jpe?g|webp|gif|avif|ico|woff2?)$).*)"],
};
