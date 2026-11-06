import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { APP_NAME, COMPANY_NAME, MISSION, TAGLINE, siteUrl } from "@/lib/brand";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const url = siteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(url),
  title: {
    default: `${COMPANY_NAME} — ${TAGLINE}`,
    template: `%s — ${COMPANY_NAME}`,
  },
  description: `${TAGLINE} ${MISSION}`,
  applicationName: APP_NAME,
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    siteName: COMPANY_NAME,
    title: `${COMPANY_NAME} — ${TAGLINE}`,
    description: MISSION,
    url,
  },
  twitter: {
    card: "summary_large_image",
    title: `${COMPANY_NAME} — ${TAGLINE}`,
    description: MISSION,
  },
  appleWebApp: {
    capable: true,
    title: APP_NAME,
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#090b10",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col bg-[#090b10]">
        {children}
        <Toaster theme="dark" />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
