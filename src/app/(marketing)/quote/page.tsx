import type { Metadata } from "next";
import { QuickAnswers } from "@/components/marketing/quick-answers";
import { QuoteForm } from "@/components/marketing/quote-form";
import { OTHER_CITY } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Get a Quote",
  description: "Quote group transportation. Central Florida is home. Other cities are welcome.",
  alternates: { canonical: "/quote" },
};

export default async function QuotePage({ searchParams }: { searchParams: Promise<{ market?: string }> }) {
  const query = await searchParams;
  return (
    <div className="mx-auto max-w-xl px-5 py-8">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#1E90FF]">Get a quote</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Plan the move.</h1>
      <p className="mt-3 text-sm leading-relaxed text-white/70">
        Central Florida is home. If your city is somewhere else, tell us and we will follow up. Nothing is reserved until you accept a quote.
      </p>
      <div className="mt-6">
        <QuickAnswers />
      </div>
      <div className="mt-8">
        <QuoteForm initialMarket={query.market === "other" ? OTHER_CITY : undefined} />
      </div>
    </div>
  );
}
