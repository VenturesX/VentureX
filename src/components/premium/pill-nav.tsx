"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type PillItem = {
  id: string;
  label: string;
  icon: ReactNode;
  href?: string;
  active?: boolean;
  onSelect?: () => void;
};

export function PillNav({ label, items }: { label: string; items: PillItem[] }) {
  return (
    <nav aria-label={label} className="fixed inset-x-0 bottom-3 z-40 px-4 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex w-full max-w-md items-stretch rounded-full bg-[#141414]/95 p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.55)] ring-1 ring-white/10 backdrop-blur">
        {items.map((item) => {
          const className = cn(
            "vd-press flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-0.5 text-[10px] font-semibold leading-tight",
            item.active ? "bg-white text-black" : "text-vd-muted",
          );
          const body = (
            <>
              <span className="[&_svg]:size-5" aria-hidden="true">{item.icon}</span>
              {item.label}
            </>
          );
          if (item.href) {
            return (
              <Link key={item.id} href={item.href} className={className} aria-current={item.active ? "page" : undefined} onClick={item.onSelect}>
                {body}
              </Link>
            );
          }
          return (
            <button key={item.id} type="button" className={className} aria-current={item.active ? "page" : undefined} onClick={item.onSelect}>
              {body}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
