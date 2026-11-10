"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { COMPANY_EMAIL, COMPANY_PHONE, COMPANY_PHONE_TEL } from "@/lib/brand";
import { field, onBtn } from "@/components/light/styles";

type Item = {
  id: string;
  title: string;
  kind: string;
  timeLabel: string;
  summary: string;
  detail: string;
  spot: string;
  route: string;
  frequency: string;
  flight: string;
  status: string;
  personal: boolean;
};
type Trip = {
  signedIn: boolean;
  ownerPreview?: boolean;
  program?: { name: string };
  guest?: string;
  mine?: { flight: string; time: string; vehicle: string; spot: string; status: string } | null;
  items?: Item[];
};

const TABS = ["Schedule", "My Trip", "Shuttles", "Info"] as const;

export function GuestTrip() {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Schedule");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function refresh() {
    const response = await fetch("/api/trip");
    setTrip((await response.json()) as Trip);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function submit(step: "open" | "code") {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step, code }),
      });
      const json = (await response.json()) as { error?: string; href?: string };
      if (!response.ok) {
        setError(json.error || "That code didn't match.");
        return;
      }
      setCode("");
      if (json.href === "/team") { window.location.assign("/team"); return; }
      await refresh();
      if (step === "code") setTab("My Trip");
    } catch {
      setError("The request didn't go through. Try again.");
    } finally {
      setPending(false);
    }
  }

  if (!trip) return <p className="p-6 text-sm text-white/70">Opening your trip…</p>;

  if (!trip.signedIn) {
    return (
      <div className="mx-auto max-w-lg px-5 py-12">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#1E90FF]">Guests</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Your trip, live</h1>
        <p className="mt-3 text-sm leading-relaxed text-white/70">Enter the program number from your text. No account to create.</p>
        <form className="mt-8 space-y-3" onSubmit={(event) => { event.preventDefault(); void submit("open"); }}>
          <label className="text-sm font-medium" htmlFor="program-number">Program number</label>
          <input id="program-number" className={`${field} text-center text-2xl tracking-[0.2em]`} autoComplete="off" aria-label="Program number" value={code} onChange={(event) => setCode(event.target.value)} />
          <button className={`${onBtn} h-12 w-full rounded-full`} type="submit" disabled={pending || code.trim().length < 2}>Open the program</button>
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
        </form>
      </div>
    );
  }

  const items = trip.items ?? [];
  const shuttles = items.filter((item) => item.kind === "SHUTTLE");
  const schedule = items.filter((item) => item.kind !== "SHUTTLE");

  return (
    <div className="mx-auto max-w-lg px-4 py-8" data-testid="guest-trip">
      {trip.ownerPreview ? <div className="mb-5 rounded-xl border border-[#1E90FF]/30 p-3 text-sm"><Link href="/team" className="font-semibold text-[#9ecbff]">← Owner hub</Link><p className="mt-2 text-white/70">General guest preview. Personal rides still require the guest&apos;s text code.</p></div> : null}
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#1E90FF]">{trip.program?.name}</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Your trip, live</h1>
      <p className="mt-2 text-sm text-white/70">{trip.guest ? `Hello, ${trip.guest}.` : "General moves are open. Add your text code for your own ride."}</p>
      <form className="mt-4 flex gap-2" onSubmit={(event) => { event.preventDefault(); void submit("code"); }}>
        <input className={field} type="password" aria-label="Text code" placeholder="Text code, optional" value={code} onChange={(event) => setCode(event.target.value)} />
        <button className={`${onBtn} shrink-0 rounded-xl px-4`} type="submit" disabled={pending || code.trim().length < 2}>Add</button>
      </form>
      {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
      <div className="mt-5 grid grid-cols-4 gap-1">
        {TABS.map((item) => (
          <button key={item} type="button" className={`h-11 rounded-xl text-xs font-semibold ${tab === item ? "bg-gradient-to-r from-[#1E90FF] to-[#8B5CF6]" : "bg-white/10"}`} onClick={() => setTab(item)}>
            {item === "Shuttles" ? "Shuttles" : item}
          </button>
        ))}
      </div>
      {tab === "Schedule" ? <ItemList items={schedule} empty="Nothing on the general schedule yet." /> : null}
      {tab === "My Trip" ? (
        <div className="mt-4 space-y-3">
          {trip.mine ? (
            <article className="rounded-2xl border border-white/10 p-4">
              <p className="text-sm text-[#9ecbff]">{trip.mine.status}</p>
              <h2 className="mt-1 text-2xl font-semibold">{trip.mine.flight}</h2>
              <p className="text-sm text-white/75">{trip.mine.vehicle}</p>
              {trip.mine.spot ? <p className="mt-3 text-sm font-medium">{spotLine(trip.mine.spot)}</p> : null}
            </article>
          ) : (
            <p className="text-sm text-white/70">Enter the text code from your message to unlock your flight, pickup, and ride.</p>
          )}
          <ItemList items={items.filter((item) => item.personal)} empty="" />
        </div>
      ) : null}
      {tab === "Shuttles" ? <ItemList items={shuttles} empty="No loops posted yet." /> : null}
      {tab === "Info" ? (
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-white/80">
          <p>A director is on the ground. If your ride is not listed, use the text code from your message.</p>
          <a className="block text-lg font-semibold text-white" href={`tel:${COMPANY_PHONE_TEL}`}>{COMPANY_PHONE}</a>
          <a className="block text-white" href={`mailto:${COMPANY_EMAIL}`}>{COMPANY_EMAIL}</a>
        </div>
      ) : null}
    </div>
  );
}

function spotLine(spot: string) {
  return /^x marks the spot/i.test(spot) ? spot : `X marks the spot. ${spot}`;
}

function ItemList({ items, empty }: { items: Item[]; empty: string }) {
  if (!items.length) return empty ? <p className="mt-4 text-sm text-white/70">{empty}</p> : null;
  return (
    <ul className="mt-4 space-y-2">
      {items.map((item) => (
        <li key={item.id} className="rounded-2xl border border-white/10">
          <details>
            <summary className="cursor-pointer list-none px-4 py-3 [&::-webkit-details-marker]:hidden">
              <span className="text-xs font-semibold text-[#9ecbff]">{item.timeLabel}{item.status ? ` · ${item.status}` : ""}</span>
              <span className="mt-1 block text-lg font-semibold">{item.title}</span>
              <span className="mt-1 block text-sm text-white/70">{item.summary}</span>
            </summary>
            <div className="space-y-2 px-4 pb-4 text-sm text-white/80">
              {item.detail ? <p>{item.detail}</p> : null}
              {item.route ? <p>Route: {item.route}</p> : null}
              {item.frequency ? <p>{item.frequency}</p> : null}
              {item.spot ? <p className="font-medium text-white">{spotLine(item.spot)}</p> : null}
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}
