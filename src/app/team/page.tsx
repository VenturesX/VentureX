import type { Metadata } from "next";
import Link from "next/link";
import { APP_NAME } from "@/lib/brand";
import { VentureMark } from "@/components/marketing/logo";

export const metadata: Metadata = {
  title: "Team Login",
  robots: { index: false, follow: false },
};

const CARDS = [
  { href: "/team/director", title: "Director", body: "Your day. Your post. The flights in front of you." },
  { href: "/drive", title: "Driver", body: "Your run, and nothing else." },
  { href: "/clipboard", title: "Clipboard", body: "The curb sheet." },
  { href: "/team/admin", title: "Admin", body: "Owner, lead, or client." },
];

export default function TeamPage() {
  return (
    <div className="min-h-screen bg-[#090b10] text-white">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col px-5 py-10">
        <VentureMark className="size-12" />
        <h1 className="mt-6 text-4xl font-semibold tracking-tight">Team Login</h1>
        <p className="mt-2 text-sm text-white/70">Powered by {APP_NAME}, the tools for our crew.</p>
        <div className="mt-8 grid gap-3">
          {CARDS.map((card) => (
            <Link key={card.href} href={card.href} className="flex min-h-24 flex-col justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4">
              <span className="text-2xl font-semibold">{card.title}</span>
              <span className="mt-1 text-sm text-white/70">{card.body}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
