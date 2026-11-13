"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bus, Compass, LogOut, Plane, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PillNav } from "@/components/premium/pill-nav";
import { ROLE_HOME, ROLE_LABEL } from "@/lib/roles";
import type { Role } from "@prisma/client";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string };

export function PortalShell({
  role,
  name,
  eventName,
  nav,
  children,
  compact,
  tone,
}: {
  role: Role;
  name: string;
  eventName?: string;
  nav: NavItem[];
  children: React.ReactNode;
  compact?: boolean;
  tone?: "field";
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className={cn("min-h-dvh flex flex-col", tone === "field" && "staff-field")}>
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <span className="grid size-8 place-items-center rounded-2xl bg-white text-black">
              <Compass className="size-4" />
            </span>
            <span className="truncate">
              <span className="block text-[10px] uppercase tracking-[0.18em] text-[#4da3ff]">Venture</span>
              <span className="block text-sm font-semibold leading-tight">Directors</span>
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground min-w-0">
            <span className="live-dot" />
            <Radio className="size-3.5 text-emerald-400" />
            <span className="truncate">{eventName ?? "Live ops"}</span>
          </div>
          <nav className="ml-auto hidden md:flex items-center gap-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm",
                  pathname === item.href
                    ? "bg-white text-black"
                    : "text-vd-muted hover:text-white",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto md:ml-2 flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-medium">{name}</div>
              <div className="text-[11px] text-muted-foreground">{ROLE_LABEL[role]}</div>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={() => void logout()} aria-label="Sign out">
              <LogOut />
            </Button>
          </div>
        </div>
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-1 px-3 pb-2">
          <Link
            href="/shuttle"
            className="rounded-full bg-[#1c1c1e] px-2 py-2 text-center text-[11px] font-semibold leading-tight text-vd-muted ring-1 ring-white/10"
          >
            Shuttle & bus tracking
          </Link>
          <Link
            href={ROLE_HOME[role]}
            className="rounded-full bg-white px-2 py-2 text-center text-[11px] font-bold leading-tight text-black"
          >
            Airport / port meet & greet
          </Link>
        </div>
        {!compact && (
          <nav className="md:hidden grid grid-cols-2 gap-1 px-3 pb-2">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-2 text-center",
                  tone === "field" ? "py-2 text-sm" : "py-1.5 text-xs",
                  pathname === item.href ? "bg-primary text-white" : "bg-secondary text-muted-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </header>
      <main className={cn("flex-1 mx-auto w-full pb-28", compact ? "max-w-lg px-4 py-4" : "max-w-7xl px-4 py-5")}>
        {children}
      </main>
      <PillNav
        label="Workspace"
        items={[
          ...nav.slice(0, 4).map((item) => ({
            id: item.href,
            label: item.label,
            icon: <Radio className="size-5" />,
            href: item.href,
            active: pathname === item.href,
          })),
          ...(nav.some((item) => item.href === "/shuttle") ? [] : [{ id: "shuttle", label: "Shuttle", icon: <Bus className="size-5" />, href: "/shuttle", active: pathname.startsWith("/shuttle") }]),
          { id: "meet", label: "Meet", icon: <Plane className="size-5" />, href: ROLE_HOME[role], active: pathname === ROLE_HOME[role] },
        ]}
      />
    </div>
  );
}
