"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { APP_NAME, COMPANY_EMAIL, COMPANY_LEGAL, COMPANY_PHONE, COMPANY_PHONE_TEL } from "@/lib/brand";
import { VentureMark, Wordmark } from "@/components/marketing/logo";

const LINKS = [
  { href: "/#services", label: "Services" },
  { href: "/#about", label: "About" },
];

const quoteButtonClass =
  "inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-[#1E90FF] to-[#8B5CF6] px-4 text-sm font-semibold text-white";

export function SiteHeader() {
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
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#090b10]/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label="Venture Directors home">
          <VentureMark className="size-9 shrink-0" />
          <Wordmark compact />
        </Link>
        <nav className="ml-4 hidden items-center gap-6 md:flex" aria-label="Primary">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm text-white/80 hover:text-white">
              {link.label}
            </Link>
          ))}
        </nav>
        <Link href="/quote" className={`${quoteButtonClass} ml-auto h-10 px-3 sm:px-4`}>
          <span className="sm:hidden">Quote</span>
          <span className="hidden sm:inline">Get a Quote</span>
        </Link>
        <button
          type="button"
          className="grid size-11 place-items-center rounded-lg text-white md:hidden"
          aria-expanded={open}
          aria-controls="site-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpenPath(open ? null : pathname)}
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>
      {open ? (
        <div id="site-menu" className="border-t border-white/10 bg-[#090b10] px-5 py-2 md:hidden">
          <nav className="grid" aria-label="Mobile">
            {LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="border-b border-white/10 py-3 text-lg" onClick={() => setOpenPath(null)}>
                {link.label}
              </Link>
            ))}
            <Link href="/contact" className="border-b border-white/10 py-3 text-lg" onClick={() => setOpenPath(null)}>
              Contact
            </Link>
            <Link href="/quote" className="py-3 text-lg font-semibold" onClick={() => setOpenPath(null)}>
              Get a Quote
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-white/10 px-5 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <Link href="/" className="flex items-center gap-2.5">
          <VentureMark className="size-8" />
          <Wordmark compact />
        </Link>
        <p className="max-w-xl text-sm leading-relaxed text-white/75">
          {COMPANY_LEGAL} is based in Orlando and ready nationwide. Central Florida is home. We also partner in cities across the country.
        </p>
        <div className="flex flex-col gap-1 text-sm">
          <a className="w-fit text-white" href={`mailto:${COMPANY_EMAIL}`}>{COMPANY_EMAIL}</a>
          <a className="w-fit text-white" href={`tel:${COMPANY_PHONE_TEL}`}>{COMPANY_PHONE}</a>
        </div>
        <p className="text-xs text-white/45">Powered by {APP_NAME}</p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <Link href="/quote" className="font-semibold text-[#9ecbff]">Get a Quote</Link>
          <Link href="/contact" className="text-white/80">Contact</Link>
          <Link href="/team" className="text-xs text-white/40">Team Login</Link>
        </div>
        <p className="text-xs text-white/40">© {new Date().getFullYear()} {COMPANY_LEGAL}</p>
      </div>
    </footer>
  );
}
