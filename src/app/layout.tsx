import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { OwnerLock } from "@/components/team/owner-lock";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { APP_NAME, COMPANY_NAME, SITE_DESCRIPTION, TAGLINE, siteUrl } from "@/lib/brand";
import "./globals.css";

const inter = Inter({
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
  description: SITE_DESCRIPTION,
  applicationName: APP_NAME,
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    siteName: COMPANY_NAME,
    title: `${COMPANY_NAME} — ${TAGLINE}`,
    description: SITE_DESCRIPTION,
    url,
  },
  twitter: {
    card: "summary_large_image",
    title: `${COMPANY_NAME} — ${TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  appleWebApp: {
    capable: true,
    title: APP_NAME,
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`dark ${inter.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col bg-black">
        {children}
        <OwnerLock />
        <Toaster theme="dark" />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
