"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { BusinessPhone } from "@/components/marketing/business-phone";
import { VentureMark, Wordmark } from "@/components/marketing/logo";

const LINKS = [
  { href: "/#services", label: "Services" },
  { href: "/#how", label: "How it works" },
  { href: "/traveling", label: "Traveling now" },
  { href: "/shuttle", label: "Shuttle & bus tracking" },
  { href: "/clipboard", label: "Curb clipboard" },
];

const fieldLinkClass =
  "inline-flex h-11 items-center justify-center rounded-full border border-white/20 px-3 text-center text-[13px] font-semibold leading-tight text-white";

const quoteButtonClass =
  "inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-[#1E90FF] to-[#8B5CF6] px-4 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(30,144,255,0.28)]";

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
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 lg:h-[4.5rem] lg:gap-6">
        <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label="Venture Directors home">
          <VentureMark className="size-9 shrink-0" />
          <Wordmark compact />
        </Link>
        <nav className="ml-2 hidden items-center gap-6 lg:flex" aria-label="Primary">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm text-white/80 hover:text-white">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-3 lg:flex">
          <Link href="/shuttle" className="text-sm font-semibold text-white">Shuttle</Link>
          <Link href="/clipboard" className="text-sm font-semibold text-white">Clipboard</Link>
          <BusinessPhone className="text-sm" />
          <Link href="/quote" className={`${quoteButtonClass} h-10`}>
            Get a Quote
          </Link>
        </div>
        <button
          type="button"
          className="ml-auto grid size-11 place-items-center rounded-lg text-white lg:hidden"
          aria-expanded={open}
          aria-controls="marketing-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpenPath(open ? null : pathname)}
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>
      <div className="space-y-2 border-t border-white/10 px-3 py-2 lg:hidden">
        <BusinessPhone className="flex h-11 w-full items-center justify-center text-[13px] sm:text-sm" />
        <div className="grid grid-cols-2 gap-2">
          <Link href="/shuttle" className={fieldLinkClass}>Shuttle tracking</Link>
          <Link href="/clipboard" className={fieldLinkClass}>Curb clipboard</Link>
        </div>
        <Link href="/quote" className={`${quoteButtonClass} h-11 w-full`}>
          Get a Quote
        </Link>
      </div>
      {open ? (
        <div id="marketing-menu" className="border-t border-white/10 bg-black px-4 py-3 lg:hidden">
          <nav className="grid" aria-label="Mobile">
            {LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="border-b border-white/10 py-3 text-lg" onClick={() => setOpenPath(null)}>
                {link.label}
              </Link>
            ))}
            <Link href="/quote" className="border-b border-white/10 py-3 text-lg font-semibold text-white" onClick={() => setOpenPath(null)}>
              Get a Quote
            </Link>
            <Link href={staffHref} className="py-3 text-lg text-white/80" onClick={() => setOpenPath(null)}>
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
        <BusinessPhone className="min-h-11 w-fit text-base" />
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
          <Link href="/shuttle" className="font-semibold text-white">
            Shuttle & bus tracking
          </Link>
          <Link href="/clipboard" className="font-semibold text-white">
            Curb clipboard
          </Link>
          <Link href="/traveling" className="text-white/80">
            Traveling now
          </Link>
          <Link href="/login" className="text-white/80">
            Staff login
          </Link>
        </div>
        <p className="text-xs text-white/45">© {new Date().getFullYear()} Venture Directors LLC · Orlando</p>
      </div>
    </footer>
  );
}
