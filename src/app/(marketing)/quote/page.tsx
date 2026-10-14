import type { Metadata } from "next";
import { QuoteForm } from "@/components/marketing/quote-form";
import { db } from "@/lib/db";
import { REP_PRICE_KEY, centsFromSetting, formatRepPrice } from "@/lib/quotes";

export const metadata: Metadata = {
  title: "Get a Quote — Venture Directors",
  description: "Request a quote for an Orlando group move. Airport transfers, dine-arounds, and hotel-to-event transportation.",
};

export default async function QuotePage() {
  const setting = await db.appSetting.findUnique({ where: { key: REP_PRICE_KEY } });
  const repPriceLabel = formatRepPrice(centsFromSetting(setting?.value));

  return (
    <div className="mx-auto max-w-xl px-5 py-8">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#1E90FF]">Get a quote</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Tell us the move.</h1>
      <p className="mt-3 text-sm leading-relaxed text-white/70">
        A few quick questions. Skip anything you don&apos;t know. If you send it with blanks, a Venture Expert will reach out. Nothing is booked until you accept a quote.
      </p>
      <div className="mt-8">
        <QuoteForm repPriceLabel={repPriceLabel} />
      </div>
    </div>
  );
}
