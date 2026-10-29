"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Customer & Guest", match: (path: string) => path === "/" || path.startsWith("/guest") || path.startsWith("/quote") },
  { href: "/staff", label: "Venture Staff", match: (path: string) => path.startsWith("/staff") || path.startsWith("/clipboard") },
  { href: "/drive", label: "Venture Driver", match: (path: string) => path.startsWith("/drive") || path.startsWith("/shuttle") },
  { href: "/owner", label: "Big Dog Admin", match: (path: string) => path.startsWith("/owner") || path.startsWith("/admin") },
];

export function ExperienceBar() {
  const path = usePathname();
  return (
    <nav aria-label="Experience walkthrough" className="sticky top-0 z-40 grid grid-cols-4 gap-1 border-b border-white/10 bg-[#090b10]/95 px-2 py-1.5 backdrop-blur" data-testid="experience-bar">
      {LINKS.map((link) => {
        const active = link.match(path);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex min-h-11 items-center justify-center rounded-lg px-1 text-center text-[10px] font-semibold leading-tight",
              active ? "bg-gradient-to-r from-[#1E90FF] to-[#8B5CF6] text-white" : "bg-[#141820] text-[#d5dbe6]",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
