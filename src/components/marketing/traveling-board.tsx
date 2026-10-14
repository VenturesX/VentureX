"use client";

import { useEffect, useMemo, useState } from "react";
import { QuickAnswers } from "@/components/marketing/quick-answers";

const CATEGORIES = [
  ["PICKUP", "Pickup spot"],
  ["SCHEDULE", "Schedule"],
  ["LOST", "Lost item"],
  ["ACCESSIBILITY", "Accessibility"],
  ["OTHER", "Something else"],
] as const;

type Faq = { id: string; category: string; question: string; answer: string };

export function TravelingBoard() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [eventName, setEventName] = useState("");
  const [phone, setPhone] = useState("");
  const [tel, setTel] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/guest/board")
      .then((response) => response.json())
      .then((json: { faqs?: Faq[]; eventName?: string; phone?: string; tel?: string }) => {
        setFaqs(json.faqs ?? []);
        setEventName(json.eventName ?? "");
        setPhone(json.phone ?? "");
        setTel(json.tel ?? "");
      });
  }, []);

  const matches = useMemo(() => {
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length) return faqs;
    return faqs.filter((faq) => {
      const haystack = `${faq.question} ${faq.answer} ${faq.category}`.toLowerCase();
      return tokens.every((token) => haystack.includes(token));
    });
  }, [faqs, query]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/guest/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, message, name }),
      });
      const json = (await response.json()) as { error?: string; grouped?: boolean };
      if (!response.ok) {
        setError(json.error ?? "We couldn't send that.");
        return;
      }
      setMessage("");
      setNotice(json.grouped ? "Someone already asked this. We added your note to that request." : "We got it. A Venture Rep will follow up with the group.");
    } catch {
      setError("The note didn't go through. Try again in a moment.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-5 py-8">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#1E90FF]">Traveling with us now</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Answers for this trip.</h1>
      <p className="mt-3 text-sm leading-relaxed text-white/70">
        {eventName ? `${eventName}. ` : ""}Search the notes first. If you still need something, send one question and we&apos;ll group it with the others.
      </p>
      {phone && tel ? (
        <a href={`tel:${tel}`} className="mt-5 flex h-12 items-center justify-center rounded-lg border border-[#1E90FF] text-sm font-semibold text-[#1E90FF]">
          Event line {phone}
        </a>
      ) : null}
      <div className="mt-6">
        <QuickAnswers handoff="link" />
      </div>
      <label className="mt-6 block text-sm font-medium" htmlFor="faq-search">Search</label>
      <input id="faq-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pickup, schedule, lost item…" className="mt-1.5 h-12 w-full rounded-xl border border-white/15 bg-black px-3 text-base outline-none focus:border-[#1E90FF]" />
      <div className="mt-4 space-y-3">
        {matches.length === 0 ? <p className="text-sm text-white/60">Nothing matched. Send a question below.</p> : null}
        {matches.map((faq) => (
          <article key={faq.id} className="rounded-2xl border border-white/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#1E90FF]">{labelFor(faq.category)}</p>
            <h2 className="mt-1 text-lg font-semibold">{faq.question}</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/75">{faq.answer}</p>
          </article>
        ))}
      </div>
      <form className="mt-8 space-y-3 rounded-2xl border border-[#1E90FF]/30 p-4" onSubmit={submit}>
        <h2 className="text-xl font-semibold">Still need help?</h2>
        <p className="text-sm text-white/65">Pick a topic first. We read these with the event team, not as a public phone line.</p>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIES.map(([value, label]) => (
            <button key={value} type="button" className={`min-h-12 rounded-xl border px-2 text-sm font-semibold ${category === value ? "border-[#1E90FF] bg-[#1E90FF] text-white" : "border-white/15"}`} onClick={() => setCategory(value)}>
              {label}
            </button>
          ))}
        </div>
        <label className="block text-sm" htmlFor="guest-question">Question</label>
        <textarea id="guest-question" value={message} onChange={(event) => setMessage(event.target.value)} className="min-h-28 w-full rounded-xl border border-white/15 bg-black px-3 py-3 text-base outline-none focus:border-[#1E90FF]" />
        <label className="block text-sm" htmlFor="guest-name">Name, if you want a direct reply</label>
        <input id="guest-name" value={name} onChange={(event) => setName(event.target.value)} className="h-12 w-full rounded-xl border border-white/15 bg-black px-3 text-base outline-none focus:border-[#1E90FF]" />
        {error ? <p className="text-sm text-rose-200">{error}</p> : null}
        {notice ? <p className="text-sm text-white">{notice}</p> : null}
        <button type="submit" disabled={pending} className="h-12 w-full rounded-lg bg-[#1E90FF] text-base font-semibold text-white disabled:opacity-60">
          {pending ? "Sending…" : "Send question"}
        </button>
      </form>
    </div>
  );
}

function labelFor(category: string) {
  return CATEGORIES.find(([value]) => value === category)?.[1] ?? category;
}
