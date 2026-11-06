import type { Metadata } from "next";
import { MarketingHome } from "@/components/marketing/home-page";
import { MISSION, TAGLINE, siteUrl } from "@/lib/brand";

export const metadata: Metadata = {
  title: { absolute: `Venture Directors — ${TAGLINE}` },
  description: `${TAGLINE} ${MISSION}`,
  alternates: { canonical: "/" },
  openGraph: { url: siteUrl(), title: `Venture Directors — ${TAGLINE}`, description: MISSION },
};

export default function HomePage() {
  return <MarketingHome />;
}
