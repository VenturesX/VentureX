import type { ReactNode } from "react";
import { MarketingFrame } from "@/components/marketing/marketing-frame";
import { SiteFooter, SiteHeader } from "@/components/marketing/site-header";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <MarketingFrame>
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </MarketingFrame>
  );
}
