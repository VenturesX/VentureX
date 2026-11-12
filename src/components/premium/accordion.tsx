"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function Accordion({
  title,
  children,
  open,
  onOpenChange,
  defaultOpen = false,
}: {
  title: ReactNode;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
}) {
  const [internal, setInternal] = useState(defaultOpen);
  const isOpen = open ?? internal;
  function toggle() {
    const next = !isOpen;
    onOpenChange?.(next);
    if (open === undefined) setInternal(next);
  }
  return (
    <div className="overflow-hidden rounded-card bg-vd-card ring-1 ring-white/10">
      <button
        type="button"
        className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={isOpen}
        onClick={toggle}
      >
        <span className="min-w-0 flex-1 text-base font-semibold text-white">{title}</span>
        <ChevronDown className={cn("size-5 shrink-0 text-vd-muted transition-transform duration-300", isOpen && "rotate-180")} aria-hidden="true" />
      </button>
      <div className={cn("vd-accordion grid", isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="overflow-hidden">
          <div className="px-4 pb-4 text-sm leading-relaxed text-vd-muted">{children}</div>
        </div>
      </div>
    </div>
  );
}
