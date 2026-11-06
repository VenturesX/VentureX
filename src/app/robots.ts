import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/brand";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/light", "/team", "/owner", "/staff", "/drive", "/clipboard", "/shuttle", "/admin", "/plan", "/guest", "/login", "/dispatch"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}
