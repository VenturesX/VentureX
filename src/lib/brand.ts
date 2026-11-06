import { DEFAULT_EXPERT_PHONE, DEFAULT_EXPERT_TEL } from "@/lib/guidance";

export const COMPANY_NAME = "Venture Directors";
export const COMPANY_LEGAL = "Venture Directors LLC";
export const APP_NAME = "VentureX";
export const COMPANY_EMAIL = "venturedirectors@gmail.com";
export const COMPANY_PHONE = DEFAULT_EXPERT_PHONE;
export const COMPANY_PHONE_TEL = DEFAULT_EXPERT_TEL;
export const DEFAULT_SITE_URL = "https://www.venturedirectors.com";
export const MISSION = "Getting every guest from point A to point B, safely and seamlessly.";
export const TAGLINE = "Group Transportation, Handled.";

export function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  return (configured || DEFAULT_SITE_URL).replace(/\/$/, "");
}

export function publicOrigin(request?: Request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (request) {
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
    if (host && !host.includes("localhost") && !host.startsWith("127.")) {
      const proto = request.headers.get("x-forwarded-proto") || "https";
      return `${proto}://${host}`;
    }
  }
  return DEFAULT_SITE_URL;
}
