"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bus, Home, Hotel, MessageCircle, Plane, UserRound } from "lucide-react";
import { COMPANY_EMAIL, COMPANY_PHONE, COMPANY_PHONE_TEL } from "@/lib/brand";
import { tripRedirectHref } from "@/lib/trip-redirect";
import { field, onBtn } from "@/components/light/styles";
import { Accordion } from "@/components/premium/accordion";
import { PillNav } from "@/components/premium/pill-nav";
import { ScreenSkeleton } from "@/components/premium/skeleton";
import { Tile } from "@/components/premium/tile";

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
type TripCard = { phase: string; line: string; note: string; pickup: string };
type Trip = {
  signedIn: boolean;
  ownerPreview?: boolean;
  program?: { name: string };
  guest?: string;
  card?: TripCard;
  updatedAt?: string;
  mine?: { flight: string; time: string; vehicle: string; spot: string; status: string } | null;
  items?: Item[];
};

const TABS = ["Schedule", "My Trip", "Shuttles", "Info"] as const;
type View = "home" | "trip" | "text" | "account";

export function GuestTrip() {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Schedule");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [view, setView] = useState<View>("home");
  const [welcome, setWelcome] = useState("");

  async function refresh() {
    const response = await fetch("/api/trip");
    setTrip((await response.json()) as Trip);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(); }, 0);
    const pulse = window.setInterval(() => { void refresh(); }, 60_000);
    return () => { window.clearTimeout(timer); window.clearInterval(pulse); };
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
      const json = (await response.json()) as { error?: string; href?: string; welcome?: string };
      if (!response.ok) {
        setError(json.error || "That code didn't match. Check your welcome message or ask the team at your arrival area.");
        return;
      }
      setCode("");
      const next = tripRedirectHref(json.href);
      if (next) { window.location.assign(next); return; }
      if (json.welcome) setWelcome(json.welcome);
      await refresh();
      if (step === "open") setView("home");
    } catch {
      setError("The request didn't go through. Try again.");
    } finally {
      setPending(false);
    }
  }

  if (!trip) return <ScreenSkeleton />;

  if (!trip.signedIn) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <h1 className="text-4xl font-bold tracking-tight">Your trip starts here.</h1>
        <p className="mt-3 text-lg text-white">Enter your trip code.</p>
        <p className="mt-2 text-sm text-vd-muted">It&apos;s in your welcome message or on the sign.</p>
        <form className="mt-8 space-y-3" onSubmit={(event) => { event.preventDefault(); void submit("open"); }}>
          <label className="sr-only" htmlFor="trip-code">Trip code</label>
          <input id="trip-code" className={`${field} text-center text-3xl font-bold tracking-[0.18em]`} autoComplete="off" aria-label="Trip code" value={code} onChange={(event) => setCode(event.target.value)} />
          <button className={`${onBtn} h-14 w-full text-base`} type="submit" disabled={pending || code.trim().length < 2}>Open my trip</button>
          {error ? <p className="text-sm text-[#ffb4b0]">{error}</p> : null}
        </form>
      </div>
    );
  }

  const items = trip.items ?? [];
  const shuttles = items.filter((item) => item.kind === "SHUTTLE");
  const schedule = items.filter((item) => item.kind !== "SHUTTLE");
  const cards = tripCards(trip);
  const spot = trip.card?.pickup || cards.find((card) => card.kicker === "Hotel")?.title || "";

  return (
    <div className="mx-auto max-w-lg space-y-5 px-4 pb-28 pt-5" data-testid="guest-trip">
      {welcome ? (
        <button type="button" className="w-full rounded-tile bg-vd-elevated p-5 text-left ring-1 ring-white/10" onClick={() => setWelcome("")}>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#4da3ff]">Welcome</p>
          <p className="mt-2 text-2xl font-bold">Welcome to {welcome}.</p>
          <p className="mt-2 text-vd-muted">Your Orlando trip starts here.</p>
        </button>
      ) : null}
      {trip.ownerPreview ? <div className="rounded-card bg-vd-card p-3 text-sm ring-1 ring-white/10"><Link href="/team" className="font-semibold text-[#4da3ff]">← Owner hub</Link><p className="mt-2 text-vd-muted">General guest preview.</p></div> : null}

      {view === "home" ? (
        <>
          <FirstCard card={trip.card} updatedAt={trip.updatedAt} />
          <section className="space-y-3">
            <h2 className="text-xl font-bold">Your trips</h2>
            <div className="grid grid-cols-2 gap-3">
              {cards.map((card) => (
                <Tile key={card.kicker} icon={tripIcon(card.kicker)} label={card.title} hint={card.status} tone={card.tone === "muted" ? "accent" : card.tone} onClick={() => setView("trip")} />
              ))}
            </div>
          </section>
          <HelpLadder spot={spot} />
        </>
      ) : null}

      {view === "trip" ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#4da3ff]">{trip.program?.name}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Your trip, live</h1>
          <p className="mt-2 text-sm text-vd-muted">{trip.guest ? `Hello, ${trip.guest}.` : "Shared moves for this trip."}</p>
          <div className="mt-5 grid grid-cols-4 gap-1">
            {TABS.map((item) => (
              <button key={item} type="button" className={`h-11 rounded-full text-xs font-semibold ${tab === item ? "bg-white text-black" : "bg-vd-elevated text-vd-muted"}`} onClick={() => setTab(item)}>
                {item}
              </button>
            ))}
          </div>
          {tab === "Schedule" ? <ItemList items={schedule} empty="Nothing on the general schedule yet." /> : null}
          {tab === "My Trip" ? (
            <div className="mt-4 space-y-3">
              {trip.mine ? (
                <article className="rounded-card bg-vd-card p-4 ring-1 ring-white/10">
                  <p className="text-sm font-semibold text-[#30d158]">{trip.mine.status}</p>
                  <h2 className="mt-1 text-2xl font-bold">{trip.mine.flight}</h2>
                  <p className="text-sm text-vd-muted">{trip.mine.vehicle}</p>
                  {trip.mine.spot ? <p className="mt-3 text-sm font-medium text-white">{spotLine(trip.mine.spot)}</p> : null}
                </article>
              ) : (
                <p className="text-sm text-vd-muted">Shared arrivals and the shuttle card are on Home.</p>
              )}
              <ItemList items={items.filter((item) => item.personal)} empty="" />
            </div>
          ) : null}
          {tab === "Shuttles" ? <ItemList items={shuttles} empty="No loops posted yet." /> : null}
          {tab === "Info" ? <Info /> : null}
        </div>
      ) : null}

      {view === "text" ? (
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight">Text us</h1>
          <p className="text-sm text-vd-muted">A director is on the ground. Call or write if your ride is not listed.</p>
          <a className="flex h-14 items-center justify-center rounded-full bg-white text-lg font-bold text-black" href={`tel:${COMPANY_PHONE_TEL}`}>{COMPANY_PHONE}</a>
          <a className="flex h-12 items-center justify-center rounded-full text-sm font-semibold text-[#4da3ff] ring-1 ring-white/15" href={`mailto:${COMPANY_EMAIL}`}>{COMPANY_EMAIL}</a>
        </div>
      ) : null}

      {view === "account" ? (
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight">Account</h1>
          <p className="text-sm text-vd-muted">{trip.program?.name}</p>
          <p className="text-lg font-semibold">{trip.guest || "General guest"}</p>
          <p className="text-sm text-vd-muted">No app account. Your trip code is enough.</p>
        </div>
      ) : null}

      <PillNav
        label="Guest"
        items={[
          { id: "home", label: "Home", icon: <Home />, active: view === "home", onSelect: () => setView("home") },
          { id: "trip", label: "My Trip", icon: <Bus />, active: view === "trip", onSelect: () => setView("trip") },
          { id: "text", label: "Text Us", icon: <MessageCircle />, active: view === "text", onSelect: () => setView("text") },
          { id: "account", label: "Account", icon: <UserRound />, active: view === "account", onSelect: () => setView("account") },
        ]}
      />
    </div>
  );
}

function FirstCard({ card, updatedAt }: { card?: TripCard; updatedAt?: string }) {
  const when = updatedAt ? new Date(updatedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }) : "";
  const spot = card?.pickup || "";
  const maps = spot ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(spot)}` : "";
  return (
    <section className="rounded-tile bg-vd-elevated p-5 ring-1 ring-white/10" data-testid="guest-card">
      <p className="text-lg font-semibold leading-snug">{card?.line || "Pickup details are with the team at your arrival area."}</p>
      {card?.note ? <p className="mt-2 text-sm text-vd-muted">{card.note}</p> : null}
      {spot ? <p className="mt-3 text-sm">Pickup: {spot}</p> : null}
      {maps ? <a className="mt-4 inline-flex h-12 items-center rounded-full bg-white px-5 text-sm font-bold text-black" href={maps}>Directions</a> : null}
      {when ? <p className="mt-3 text-xs text-vd-muted">Updated {when}</p> : null}
    </section>
  );
}

function HelpLadder({ spot }: { spot: string }) {
  const sms = COMPANY_PHONE_TEL.replace(/[^\d+]/g, "");
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold">Help</h2>
      <Accordion title="Where do I wait?">{spot ? <p>Wait at {spot}.</p> : <p>Wait at the signed stop from your welcome message.</p>}</Accordion>
      <Accordion title="What time?"><p>Use the card above. Times may vary, and boarding depends on space.</p></Accordion>
      <Accordion title="Lost item?"><p>Tell the on-duty team. They will look with the crew from that run.</p></Accordion>
      <Accordion title="Who do I ask?"><p>The Venture team at your arrival area.</p></Accordion>
      <a className="flex h-12 items-center justify-center rounded-full bg-white text-sm font-bold text-black" href={`sms:${sms}`}>Text the on-duty team</a>
      <a className="flex h-12 items-center justify-center rounded-full text-sm font-semibold text-white ring-1 ring-white/15" href={`tel:${COMPANY_PHONE_TEL}`}>Call {COMPANY_PHONE}</a>
      <p className="text-sm text-vd-muted">Need a lead? Ask for one on that same line.</p>
    </section>
  );
}

function tripIcon(kicker: string) {
  if (kicker === "Hotel") return <Hotel className="size-5" />;
  if (kicker === "Departure") return <Bus className="size-5" />;
  return <Plane className="size-5" />;
}

function tripCards(trip: Trip) {
  const items = trip.items ?? [];
  const arrival = trip.mine
    ? { title: trip.mine.flight || "Arrival", time: trip.mine.time || "—", status: trip.mine.status || "Posted" }
    : fromItem(items.find((item) => /arriv|flight|airport|mco/i.test(`${item.kind} ${item.title}`)), "Arrival");
  const hotel = fromItem(items.find((item) => /hotel|shuttle/i.test(`${item.kind} ${item.title}`)), "Hotel");
  const departure = fromItem(items.find((item) => /depart|return/i.test(`${item.kind} ${item.title}`)), "Departure");
  return [
    { kicker: "Arrival", tone: arrival.status === "Not posted" ? "muted" as const : "accent" as const, ...arrival },
    { kicker: "Hotel", tone: hotel.status === "Not posted" ? "muted" as const : "green" as const, ...hotel },
    { kicker: "Departure", tone: departure.status === "Not posted" ? "muted" as const : "amber" as const, ...departure },
  ];
}

function fromItem(item: Item | undefined, fallback: string) {
  if (!item) return { title: fallback, time: "—", status: "Not posted" };
  return { title: item.title, time: item.timeLabel || "—", status: item.status || item.summary || "Posted" };
}

function Info() {
  return (
    <div className="mt-4 space-y-3 text-sm leading-relaxed text-vd-muted">
      <p>A director is on the ground. If your ride is not listed, use the text code from your message.</p>
      <a className="block text-lg font-semibold text-white" href={`tel:${COMPANY_PHONE_TEL}`}>{COMPANY_PHONE}</a>
      <a className="block text-white" href={`mailto:${COMPANY_EMAIL}`}>{COMPANY_EMAIL}</a>
    </div>
  );
}

function spotLine(spot: string) {
  return /^x marks the spot/i.test(spot) ? spot : `X marks the spot. ${spot}`;
}

function ItemList({ items, empty }: { items: Item[]; empty: string }) {
  if (!items.length) return empty ? <p className="mt-4 text-sm text-vd-muted">{empty}</p> : null;
  return (
    <ul className="mt-4 space-y-2">
      {items.map((item) => (
        <li key={item.id}>
          <Accordion
            title={
              <span className="block">
                <span className="block text-xs font-semibold text-[#4da3ff]">{item.timeLabel}{item.status ? ` · ${item.status}` : ""}</span>
                <span className="mt-1 block text-lg text-white">{item.title}</span>
                <span className="mt-1 block text-sm font-normal text-vd-muted">{item.summary}</span>
              </span>
            }
          >
            {item.detail ? <p>{item.detail}</p> : null}
            {item.route ? <p>Route: {item.route}</p> : null}
            {item.frequency ? <p>{item.frequency}</p> : null}
            {item.spot ? <p className="font-medium text-white">{spotLine(item.spot)}</p> : null}
          </Accordion>
        </li>
      ))}
    </ul>
  );
}
