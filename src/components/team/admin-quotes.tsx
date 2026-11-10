"use client";

import { useEffect, useState } from "react";
import { quoteDetailSections, type QuoteDetails, type QuoteAlert } from "@/lib/quote-details";

type Quote = Omit<QuoteDetails, "createdAt"> & { createdAt: string; alert: QuoteAlert | null };
type EmailConfig = { to: string; from: string; enabled: boolean; test: QuoteAlert | null };
type Call = { id: string; name: string; phone: string; bestTime: string; status: string; createdAt: string };

function when(value: string) {
  return new Date(value).toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function AdminQuotes() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);
  const [error, setError] = useState("");
  const [email, setEmail] = useState<EmailConfig | null>(null);
  const [testing, setTesting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/team/quotes").then(async (response) => {
      const json = (await response.json()) as { quotes?: Quote[]; calls?: Call[]; email?: EmailConfig; error?: string };
      if (!response.ok) {
        setError(json.error || "Could not open the inbox.");
        return;
      }
      setQuotes(json.quotes ?? []);
      setCalls(json.calls ?? []);
      setEmail(json.email ?? null);
    }).catch(() => setError("Could not load the inbox. Refresh to try again.")).finally(() => setLoading(false));
  }, []);

  async function testAlert() {
    setTesting(true);
    setError("");
    try {
      const response = await fetch("/api/team/quotes", { method: "POST" });
      const json = await response.json() as { alert?: QuoteAlert; error?: string };
      if (!response.ok || !json.alert) throw new Error(json.error || "Could not test the email alert.");
      setEmail((current) => current ? { ...current, test: json.alert! } : current);
    } catch (error) { setError(error instanceof Error ? error.message : "Could not test the email alert."); }
    finally { setTesting(false); }
  }

  return (
    <section data-testid="quotes-inbox">
      <h2 className="text-xl font-semibold">Quotes</h2>
      {email ? <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm">
        <h3 className="font-semibold">Quote email alerts</h3>
        <p className="mt-1 break-words text-white/75">Send to: {email.to}</p>
        <p className="break-words text-xs text-white/60">Sender: {email.from}</p>
        {!email.enabled ? <p className="mt-2 text-amber-200">Alerts are off. Add RESEND_API_KEY in Vercel Production and redeploy.</p> : null}
        {email.from.includes("@resend.dev") ? <p className="mt-2 text-xs text-amber-200">Using Resend&apos;s test sender. It can only email the address on your Resend account. For production, verify your domain in Resend, set QUOTE_FROM_EMAIL to an address on that domain in Vercel, and redeploy.</p> : null}
        <button type="button" disabled={testing} onClick={testAlert} className="mt-3 min-h-11 rounded-xl border border-white/20 px-4 font-semibold disabled:opacity-50">{testing ? "Testing…" : "Send test alert"}</button>
        {email.test ? <div className="mt-2" role="status"><AlertStatus alert={email.test} /><p className="text-xs text-white/50">Last test: {when(email.test.attemptedAt)}</p></div> : null}
      </div> : null}
      {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
      {loading ? <p className="mt-2 text-sm text-white/70">Loading requests…</p> : !error && quotes.length === 0 && calls.length === 0 ? <p className="mt-2 text-sm text-white/70">No requests yet.</p> : null}
      <ul className="mt-3 space-y-3">
        {quotes.map((quote) => (
          <li key={quote.id} className="rounded-2xl border border-white/10 p-4">
            <p className="text-sm text-[#9ecbff]">{quote.reference} · {when(quote.createdAt)}</p>
            <p className="mt-1 text-lg font-semibold">{quote.contactName}</p>
            <p className="text-sm text-white/75">{quote.phone} · {quote.email}</p>
            <p className="mt-1 text-sm text-white/75">{quote.market}{quote.marketCity ? ` · ${quote.marketCity}` : ""} · {quote.startDate} · {quote.passengerCount} guests</p>
            <p className="text-sm text-white/75">{quote.pickup} to {quote.dropoff}</p>
            {quote.alert ? <div className="mt-2 text-xs"><AlertStatus alert={quote.alert} /></div> : <p className="mt-2 text-xs text-white/50">Email status was not recorded for this request.</p>}
            <details className="mt-3 border-t border-white/10 pt-2">
              <summary className="cursor-pointer py-2 text-sm font-semibold text-[#9ecbff]">View full request</summary>
              <div className="mt-2 space-y-5">
                {quoteDetailSections(quote).map((section) => <div key={section.title}>
                  <h3 className="text-sm font-semibold">{section.title}</h3>
                  <dl className="mt-2 space-y-2 text-sm">
                    {section.rows.map(([label, value]) => <div key={label} className="grid gap-1 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-3">
                      <dt className="text-white/50">{label}</dt><dd className="min-w-0 whitespace-pre-wrap break-words text-white/85">{value}</dd>
                    </div>)}
                  </dl>
                </div>)}
                {quote.manifestFileName ? <a href={`/api/team/quotes/${quote.id}/manifest`} className="inline-flex min-h-11 items-center rounded-xl border border-white/20 px-4 text-sm font-semibold">Download manifest</a> : null}
              </div>
            </details>
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

function AlertStatus({ alert }: { alert: QuoteAlert }) {
  return <p className={alert.state === "accepted" ? "text-emerald-200" : "text-amber-200"}>
    <span className="font-semibold">{alert.state === "accepted" ? "Email accepted" : alert.state === "not_configured" ? "Email not configured" : "Email alert failed"}.</span> {alert.detail}
  </p>;
}
