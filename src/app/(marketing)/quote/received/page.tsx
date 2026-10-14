import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Request received — Venture Directors",
};

export default async function QuoteReceivedPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  const reference = ref && /^VX-\d{4,8}$/.test(ref) ? ref : null;

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
        Your request is in the Venture Directors queue. A coordinator will review it and follow up at the email and phone you sent. Nothing is reserved until you accept a quote.
      </p>
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
