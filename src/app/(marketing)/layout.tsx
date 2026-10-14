import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getSession } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/roles";
import { SiteFooter, SiteHeader } from "@/components/marketing/site-header";

export const metadata: Metadata = {
  title: "Venture Directors — Group Transportation, Handled.",
  description:
    "Orlando group transportation for meetings, events, and tours. Airport transfers, dine-arounds, and on-site meet and greet.",
};

export default async function MarketingLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  const staffHref = session ? ROLE_HOME[session.role] : "/login";
  const staffLabel = session ? "Open ops" : "Staff login";

  return (
    <div className="marketing">
      <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-[#1E90FF] focus:px-3 focus:py-2">
        Skip to content
      </a>
      <SiteHeader staffHref={staffHref} staffLabel={staffLabel} />
      <main id="content">{children}</main>
      <SiteFooter />
    </div>
  );
}
