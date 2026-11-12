"use client";

import { useEffect, useMemo, useState } from "react";
import { Bus, FerrisWheel, Home, Hotel, Landmark, MessageCircle, Plane, UserRound } from "lucide-react";
import { QuickAnswers } from "@/components/marketing/quick-answers";
import { Accordion } from "@/components/premium/accordion";
import { PillNav } from "@/components/premium/pill-nav";
import { RideBar } from "@/components/premium/ride-bar";
import { ADD_RIDES, ORLANDO_PICKS } from "@/components/premium/rides";
import { ScreenSkeleton } from "@/components/premium/skeleton";
import { Tile } from "@/components/premium/tile";

const CATEGORIES = [
  ["PICKUP", "Pickup spot"],
  ["SCHEDULE", "Schedule"],
  ["LOST", "Lost item"],
  ["ACCESSIBILITY", "Accessibility"],
  ["OTHER", "Something else"],
] as const;

type Faq = { id: string; category: string; question: string; answer: string };
type Stop = { id: string; name: string; scheduledAt: string; origin: string; destination: string; status: string };
type NextBus = { name: string; scheduledAt: string; origin: string; destination: string };

type Board = {
  gate?: "PIN" | "MANIFEST" | null;
  error?: string;
  eventName?: string;
  faqs?: Faq[];
  pickups?: string[];
  schedule?: Stop[];
  nextBus?: NextBus | null;
  phone?: string;
  tel?: string;
};

export function TripBoard({ token }: { token: string }) {
  const [board, setBoard] = useState<Board | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [lastName, setLastName] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [later, setLater] = useState(false);
  const [ride, setRide] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`/api/guest/board?token=${encodeURIComponent(token)}`);
        const json = (await response.json()) as Board;
        if (!cancelled) setBoard(json);
      } catch {
        if (!cancelled) setBoard({ error: "This link isn't active." });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const matches = useMemo(() => {
    const faqs = board?.faqs ?? [];
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length) return faqs;
    return faqs.filter((faq) => {
      const haystack = `${faq.question} ${faq.answer} ${faq.category}`.toLowerCase();
      return tokens.every((part) => haystack.includes(part));
    });
  }, [board, query]);

  async function unlock(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/guest/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, pin, lastName, confirmation }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(json.error ?? "That didn't match. Check the details from your planner and try again.");
        return;
      }
      const next = await fetch(`/api/guest/board?token=${encodeURIComponent(token)}`);
      setBoard((await next.json()) as Board);
    } catch {
      setError("That didn't match. Check the details from your planner and try again.");
    } finally {
      setPending(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/guest/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, category, message, name }),
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

  if (!board) return <ScreenSkeleton />;
  if (board.error || (board.gate === undefined && !board.faqs)) {
    return (
      <div className="mx-auto max-w-xl px-5 py-10">
        <h1 className="text-3xl font-semibold">Your trip</h1>
        <p className="mt-3 text-sm text-white/70">{board.error ?? "This link isn't active."}</p>
      </div>
    );
  }
  if (board.gate === "PIN" || board.gate === "MANIFEST") {
    return (
      <div className="mx-auto max-w-xl px-5 py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#1E90FF]">Your trip</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Confirm it&apos;s you.</h1>
        <p className="mt-3 text-sm leading-relaxed text-white/70">
          {board.gate === "PIN" ? "Enter the event PIN from your planner." : "Enter the last name and confirmation number on your itinerary."}
        </p>
        <form className="mt-8 space-y-3" onSubmit={unlock}>
          {board.gate === "PIN" ? (
            <>
              <label className="block text-sm font-medium" htmlFor="event-pin">Event PIN</label>
              <input id="event-pin" value={pin} onChange={(event) => setPin(event.target.value)} autoComplete="off" className="h-12 w-full rounded-xl border border-white/15 bg-black px-3 text-base outline-none focus:border-[#1E90FF]" />
            </>
          ) : (
            <>
              <label className="block text-sm font-medium" htmlFor="guest-last">Last name</label>
              <input id="guest-last" value={lastName} onChange={(event) => setLastName(event.target.value)} autoComplete="family-name" className="h-12 w-full rounded-xl border border-white/15 bg-black px-3 text-base outline-none focus:border-[#1E90FF]" />
              <label className="block text-sm font-medium" htmlFor="guest-confirm">Confirmation number</label>
              <input id="guest-confirm" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" className="h-12 w-full rounded-xl border border-white/15 bg-black px-3 text-base outline-none focus:border-[#1E90FF]" />
            </>
          )}
          {error ? <p role="alert" className="text-sm text-rose-200">{error}</p> : null}
          <button type="submit" disabled={pending} className="h-12 w-full rounded-lg bg-[#1E90FF] text-base font-semibold text-white disabled:opacity-60">
            {pending ? "Checking…" : "Continue"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-5 py-8">
      <div className="space-y-5 pb-24">
      <RideBar
        laterOpen={later}
        onLater={() => setLater((open) => !open)}
        onOpen={() => document.getElementById("next-bus")?.scrollIntoView({ behavior: "smooth", block: "start" })}
      />
      {later ? (
        <Accordion title={ride ? `Later · ${ride}` : "Book a later transfer"} open={later} onOpenChange={setLater}>
          <p>Pick the extra move. It drops into the question below so your event team still gets it.</p>
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {ADD_RIDES.map((item) => (
              <button key={item.id} type="button" className={`h-11 shrink-0 rounded-full px-4 text-sm font-semibold ${ride === item.title ? "bg-white text-black" : "bg-black text-white ring-1 ring-white/15"}`} onClick={() => { setRide(item.title); setCategory("OTHER"); setMessage(`Later transfer: ${item.title}. `); }}>
                {item.title}
              </button>
            ))}
          </div>
        </Accordion>
      ) : null}
      <section className="space-y-3">
        <h2 className="text-xl font-bold">Your trips</h2>
        <div className="grid grid-cols-2 gap-3">
          <Tile icon={<Plane className="size-5" />} label={board.nextBus?.name || board.schedule?.[0]?.name || "Arrival"} hint={board.nextBus?.destination || "Not posted"} />
          <Tile icon={<Hotel className="size-5" />} label={middleStop(board.schedule)?.name || "Hotel"} hint={middleStop(board.schedule)?.status || "Not posted"} tone="green" />
          <Tile icon={<Bus className="size-5" />} label={board.schedule?.at(-1)?.name || "Departure"} hint={board.schedule?.at(-1)?.status || "Not posted"} tone="amber" />
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-bold">Add a ride</h2>
        <div className="grid grid-cols-2 gap-3">
          {ADD_RIDES.map((item) => (
            <Tile key={item.id} icon={<FerrisWheel className="size-5" />} label={item.title} hint={ride === item.title ? "Selected" : "Request"} tone={ride === item.title ? "green" : "accent"} onClick={() => { setRide(item.title); setLater(true); setCategory("OTHER"); setMessage(`Later transfer: ${item.title}. `); }} />
          ))}
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-bold">Orlando picks</h2>
        <div className="grid grid-cols-2 gap-3">
          {ORLANDO_PICKS.map((pick) => (
            <Tile key={pick.title} icon={<Landmark className="size-5" />} label={pick.title} hint={pick.subtitle} onClick={() => { setRide(pick.title); setLater(true); setCategory("OTHER"); setMessage(`Later transfer: ${pick.title}. `); }} />
          ))}
        </div>
      </section>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#4da3ff]">Your trip</p>
      <h1 id="next-bus" className="mt-2 text-4xl font-bold tracking-tight">{board.eventName || "Your trip"}</h1>
      {board.nextBus ? (
        <article className="mt-5 rounded-card bg-vd-card p-4 ring-1 ring-white/10">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#1E90FF]">Next bus</p>
          <h2 className="mt-1 text-xl font-semibold">{board.nextBus.name}</h2>
          <p className="mt-1 text-sm text-white/80">{when(board.nextBus.scheduledAt)}</p>
          <p className="mt-2 text-sm text-white/70">{board.nextBus.origin} → {board.nextBus.destination}</p>
        </article>
      ) : null}
      {board.pickups && board.pickups.length > 0 ? (
        <section className="mt-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-white/60">X marks the spot</h2>
          <p className="mt-1 text-sm text-white/60">Where to wait or load.</p>
          <ul className="mt-2 space-y-2">
            {board.pickups.map((spot) => (
              <li key={spot} className="rounded-xl border border-white/10 px-3 py-3 text-sm">{spot}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {board.schedule && board.schedule.length > 0 ? (
        <section className="mt-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-white/60">Schedule</h2>
          <div className="mt-2 space-y-2">
            {board.schedule.map((stop) => (
              <article key={stop.id} className="rounded-xl border border-white/10 px-3 py-3">
                <p className="font-semibold">{stop.name}</p>
                <p className="mt-1 text-sm text-white/70">{when(stop.scheduledAt)}</p>
                <p className="text-sm text-white/70">{stop.origin} → {stop.destination}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
      {board.phone && board.tel ? (
        <a href={`tel:${board.tel}`} className="mt-5 flex h-12 items-center justify-center rounded-lg border border-[#1E90FF] text-sm font-semibold text-[#1E90FF]">
          Event line {board.phone}
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
        <p className="text-sm text-white/65">Pick a topic first. We read these with your event team.</p>
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
        <button type="submit" disabled={pending} className="h-12 w-full rounded-full bg-white text-base font-bold text-black disabled:opacity-60">
          {pending ? "Sending…" : "Send question"}
        </button>
      </form>
      </div>
      <PillNav
        label="Guest"
        items={[
          { id: "home", label: "Home", icon: <Home />, onSelect: () => window.scrollTo({ top: 0, behavior: "smooth" }) },
          { id: "trip", label: "My Trip", icon: <Bus />, onSelect: () => document.getElementById("next-bus")?.scrollIntoView({ behavior: "smooth", block: "start" }) },
          { id: "text", label: "Text Us", icon: <MessageCircle />, href: board.tel ? `tel:${board.tel}` : "/contact" },
          { id: "account", label: "Account", icon: <UserRound />, onSelect: () => document.getElementById("guest-question")?.scrollIntoView({ behavior: "smooth", block: "center" }) },
        ]}
      />
    </div>
  );
}

function middleStop(schedule: Stop[] | undefined) {
  if (!schedule?.length) return undefined;
  return schedule[Math.min(schedule.length - 1, Math.floor(schedule.length / 2))];
}

function when(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function labelFor(category: string) {
  return CATEGORIES.find(([value]) => value === category)?.[1] ?? category;
}
