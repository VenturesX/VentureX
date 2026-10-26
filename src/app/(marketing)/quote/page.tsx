import type { Metadata } from "next";
import { QuickAnswers } from "@/components/marketing/quick-answers";
import { QuoteForm } from "@/components/marketing/quote-form";

export const metadata: Metadata = {
  title: "Get a Quote — Venture Directors",
  description: "Plan an Orlando group move in a few taps. Airport transfers, dine-arounds, and hotel-to-event transportation.",
};

export default function QuotePage() {
  return (
    <div className="mx-auto max-w-xl px-5 py-8">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#1E90FF]">Get a quote</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Plan the move.</h1>
      <p className="mt-3 text-sm leading-relaxed text-white/70">
        A few taps. The vehicle plan shows as you go. Nothing is reserved until you accept a quote.
      </p>
      <div className="mt-6">
        <QuickAnswers />
      </div>
      <div className="mt-8">
        <QuoteForm />
      </div>
    </div>
  );
}
