import type { Metadata } from "next";
import { TalkLine } from "@/components/marketing/talk-line";
import { COMPANY_EMAIL, COMPANY_LEGAL, COMPANY_PHONE, COMPANY_PHONE_TEL, siteUrl } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Contact",
  description: "Call or email Venture Directors about group transportation in Orlando and Central Florida.",
  alternates: { canonical: "/contact" },
  openGraph: { url: `${siteUrl()}/contact`, title: "Contact — Venture Directors" },
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-xl px-5 py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#1E90FF]">Contact</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Talk with Venture Directors.</h1>
      <p className="mt-3 text-sm leading-relaxed text-white/75">
        {COMPANY_LEGAL}. Based in Orlando. Central Florida is home, and we partner in cities across the country.
      </p>
      <div className="mt-8 space-y-2 text-base">
        <a className="block font-semibold" href={`mailto:${COMPANY_EMAIL}`}>{COMPANY_EMAIL}</a>
        <a className="block font-semibold" href={`tel:${COMPANY_PHONE_TEL}`}>{COMPANY_PHONE}</a>
      </div>
      <div className="mt-8">
        <TalkLine />
      </div>
    </div>
  );
}
