"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Compass, LogOut, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROLE_LABEL } from "@/lib/roles";
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
}: {
  role: Role;
  name: string;
  eventName?: string;
  nav: NavItem[];
  children: React.ReactNode;
  compact?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0b1220]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Compass className="size-4" />
            </span>
            <span className="truncate">
              <span className="block text-[10px] uppercase tracking-[0.18em] text-primary">Venture</span>
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
                    ? "bg-primary/20 text-white"
                    : "text-muted-foreground hover:text-white",
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
        {!compact && (
          <nav className="md:hidden flex gap-1 overflow-x-auto px-3 pb-2">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 text-xs",
                  pathname === item.href ? "bg-primary text-white" : "bg-secondary text-muted-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </header>
      <main className={cn("flex-1 mx-auto w-full", compact ? "max-w-lg px-4 py-4" : "max-w-7xl px-4 py-5")}>
        {children}
      </main>
    </div>
  );
}
