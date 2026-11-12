import type { ReactNode } from "react";
import { SiteFooter, SiteHeader } from "@/components/marketing/site-header";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="marketing flex min-h-full flex-col bg-black pb-36 text-white md:pb-0">
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
