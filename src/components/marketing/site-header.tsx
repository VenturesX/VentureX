"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { VentureMark, Wordmark } from "@/components/marketing/logo";
import { FooterPhone } from "@/components/marketing/talk-line";

const LINKS = [
  { href: "/#services", label: "Services" },
  { href: "/#how", label: "How it works" },
  { href: "/traveling", label: "Traveling now" },
];

export function SiteHeader({ staffHref, staffLabel }: { staffHref: string; staffLabel: string }) {
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenPath(null);
    }
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label="Venture Directors home">
          <VentureMark className="size-9 shrink-0" />
          <Wordmark compact />
        </Link>
        <nav className="ml-auto hidden items-center gap-6 md:flex" aria-label="Primary">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm text-white/75 hover:text-white">
              {link.label}
            </Link>
          ))}
          <Link href="/quote" className="text-sm font-semibold text-[#1E90FF]">
            Get a Quote
          </Link>
          <Link href={staffHref} className="text-sm text-white/75 hover:text-white">
            {staffLabel}
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-1 md:hidden">
          <Link href={staffHref} className="px-2 py-2 text-sm text-white/80">
            {staffLabel}
          </Link>
          <button
            type="button"
            className="grid size-11 place-items-center rounded-lg text-white"
            aria-expanded={open}
            aria-controls="marketing-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpenPath(open ? null : pathname)}
          >
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </div>
      {open ? (
        <div id="marketing-menu" className="border-t border-white/10 bg-black px-4 py-3 md:hidden">
          <nav className="grid" aria-label="Mobile">
            {LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="border-b border-white/10 py-3 text-lg" onClick={() => setOpenPath(null)}>
                {link.label}
              </Link>
            ))}
            <Link href="/quote" className="border-b border-white/10 py-3 text-lg font-semibold text-[#1E90FF]" onClick={() => setOpenPath(null)}>
              Get a Quote
            </Link>
            <Link href={staffHref} className="py-3 text-lg" onClick={() => setOpenPath(null)}>
              {staffLabel}
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 px-5 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <Link href="/" className="flex items-center gap-2.5">
          <VentureMark className="size-8" />
          <Wordmark compact />
        </Link>
        <p className="max-w-xl text-sm leading-relaxed text-white/70">
          Seamless Transportation by Venture Directors LLC, an Orlando group transportation broker. We plan the move. Venture Reps guide on site when you want them. We do not own the vehicles.
        </p>
        <p className="max-w-xl text-sm leading-relaxed text-white/70">
          All transportation is provided by appropriately licensed operators; we manage planning, scheduling, and day-of coordination.
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <Link href="/quote" className="font-semibold text-[#1E90FF]">
            Get a Quote
          </Link>
          <Link href="/traveling" className="text-white/80">
            Traveling now
          </Link>
          <Link href="/login" className="text-white/80">
            Staff login
          </Link>
          <FooterPhone />
        </div>
        <p className="text-xs text-white/45">© {new Date().getFullYear()} Venture Directors LLC · Orlando</p>
      </div>
    </footer>
  );
}
