import type { Metadata } from "next";
import { MarketingHome } from "@/components/marketing/home-page";
import { SITE_DESCRIPTION, TAGLINE, siteUrl } from "@/lib/brand";

export const metadata: Metadata = {
  title: { absolute: `Venture Directors — ${TAGLINE}` },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { url: siteUrl(), title: `Venture Directors — ${TAGLINE}`, description: SITE_DESCRIPTION },
};

export default function HomePage() {
  return <MarketingHome />;
}
