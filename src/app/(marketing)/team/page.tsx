import type { Metadata } from "next";
import Link from "next/link";
import { APP_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Team",
  robots: { index: false, follow: false },
};

const CARDS = [
  { href: "/staff", title: "Staff", body: "Field tools and the curb sheet." },
  { href: "/drive", title: "Driver", body: "Driver view for the day." },
  { href: "/light/NBCU", title: "Ops board", body: "Airport meet and greet." },
  { href: "/clipboard", title: "Clipboard", body: "Passenger counts and the roster." },
  { href: "/shuttle", title: "Shuttle", body: "Live loop map." },
  { href: "/light/text", title: "Text simulator", body: "Practice texts before the number is live." },
  { href: "/owner", title: "Owner", body: "Big Dog Admin." },
];

export default function TeamPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#1E90FF]">Crew</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Team login</h1>
      <p className="mt-2 text-sm text-white/70">Powered by {APP_NAME}. These tools are for our crew.</p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {CARDS.map((card) => (
          <Link key={card.href} href={card.href} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 hover:border-[#1E90FF]/50">
            <p className="text-lg font-semibold">{card.title}</p>
            <p className="mt-1 text-sm text-white/70">{card.body}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
