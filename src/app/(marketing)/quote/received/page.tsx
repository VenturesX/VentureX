import type { Metadata } from "next";
import Link from "next/link";
import { TalkLine } from "@/components/marketing/talk-line";

export const metadata: Metadata = {
  title: "Request received — Venture Directors",
};

export default async function QuoteReceivedPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; expert?: string }>;
}) {
  const { ref, expert } = await searchParams;
  const reference = ref && /^VX-\d{4,8}$/.test(ref) ? ref : null;
  const needsExpert = expert === "1";

  return (
    <div className="mx-auto max-w-lg px-5 py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#1E90FF]">Quote request</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">We got it.</h1>
      {reference ? (
        <div className="mt-6">
          <p className="text-sm text-white/60">Reference</p>
          <p className="text-3xl font-semibold tracking-wide text-[#1E90FF]">{reference}</p>
        </div>
      ) : null}
      <p className="mt-6 text-base leading-relaxed text-white/75">
        {needsExpert
          ? "Stay tuned. We will follow up on anything still open. Nothing is reserved until you accept a quote."
          : "Stay tuned. We will confirm the plan and the price. Nothing is reserved until you accept a quote."}
      </p>
      <div className="mt-8">
        <TalkLine />
      </div>
      <div className="mt-8 flex flex-col items-start gap-4">
        <Link href="/" className="inline-flex h-12 items-center rounded-lg bg-[#1E90FF] px-5 text-base font-semibold text-white">
          Back to home
        </Link>
        <Link href="/quote" className="text-sm text-white/70">
          Submit another request
        </Link>
      </div>
    </div>
  );
}
