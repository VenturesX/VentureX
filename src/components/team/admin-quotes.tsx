"use client";

import { useEffect, useState } from "react";

type Quote = {
  id: string;
  reference: string;
  contactName: string;
  company: string | null;
  email: string;
  phone: string;
  market: string;
  marketCity: string;
  pickup: string;
  dropoff: string;
  startDate: string;
  passengerCount: number;
  needsExpertCall: boolean;
  createdAt: string;
};
type Call = { id: string; name: string; phone: string; bestTime: string; status: string; createdAt: string };

function when(value: string) {
  return new Date(value).toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function AdminQuotes() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/team/quotes").then(async (response) => {
      const json = (await response.json()) as { quotes?: Quote[]; calls?: Call[]; error?: string };
      if (!response.ok) {
        setError(json.error || "Could not open the inbox.");
        return;
      }
      setQuotes(json.quotes ?? []);
      setCalls(json.calls ?? []);
    });
  }, []);

  return (
    <section data-testid="quotes-inbox">
      <h2 className="text-xl font-semibold">Quotes</h2>
      {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
      {quotes.length === 0 && calls.length === 0 ? <p className="mt-2 text-sm text-white/70">No requests yet.</p> : null}
      <ul className="mt-3 space-y-3">
        {quotes.map((quote) => (
          <li key={quote.id} className="rounded-2xl border border-white/10 p-4">
            <p className="text-sm text-[#9ecbff]">{quote.reference} · {when(quote.createdAt)}</p>
            <p className="mt-1 text-lg font-semibold">{quote.contactName}</p>
            <p className="text-sm text-white/75">{quote.phone} · {quote.email}</p>
            <p className="mt-1 text-sm text-white/75">{quote.market}{quote.marketCity ? ` · ${quote.marketCity}` : ""} · {quote.startDate} · {quote.passengerCount} guests</p>
            <p className="text-sm text-white/75">{quote.pickup} to {quote.dropoff}</p>
          </li>
        ))}
        {calls.map((call) => (
          <li key={call.id} className="rounded-2xl border border-white/10 p-4">
            <p className="text-sm text-[#9ecbff]">Callback · {when(call.createdAt)}</p>
            <p className="mt-1 text-lg font-semibold">{call.name}</p>
            <p className="text-sm text-white/75">{call.phone} · {call.bestTime}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
