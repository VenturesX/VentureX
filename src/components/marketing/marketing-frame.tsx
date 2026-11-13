"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

export function MarketingFrame({ children }: { children: ReactNode }) {
  const path = usePathname();
  const home = path === "/";
  return (
    <div
      className={
        home
          ? "vd-marketing-classic flex min-h-full flex-col pb-28 text-white md:pb-0"
          : "flex min-h-full flex-col bg-black pb-28 text-white md:pb-0"
      }
    >
      {children}
    </div>
  );
}
