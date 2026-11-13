"use client";

import { useState } from "react";
import { Bus, Hotel, LifeBuoy, Plane, Sun } from "lucide-react";
import { COMPANY_PHONE, COMPANY_PHONE_TEL } from "@/lib/brand";
import { Tile } from "@/components/premium/tile";

type Row = { id: string; title: string; time: string; summary: string; detail: string; spot: string; route: string; frequency: string; flight: string };
type Portal = {
  flights: Row[];
  hotels: Row[];
  routes: Row[];
  waves: Row[];
  departs: Row[];
  today: Row[];
  hasArrival: boolean;
  hasTransport: boolean;
  hasDeparture: boolean;
};
type Trip = {
  program?: { name: string; city?: string };
  portal?: Portal;
  card?: { line: string; note: string; pickup: string };
  updatedAt?: string;
};

const COLORS: Record<string, string> = {
  Red: "#f43f5e",
  Blue: "#60a5fa",
  Green: "#4ade80",
  Purple: "#c084fc",
  Orange: "#fb923c",
  Pink: "#f472b6",
  Yellow: "#facc15",
  Lime: "#a3e635",
  Teal: "#2dd4bf",
};

export function GuestHome({ trip, onExit }: { trip: Trip; onExit: () => void }) {
  const [screen, setScreen] = useState<"home" | "arrival" | "flight" | "transport" | "route" | "depart" | "hotel" | "help" | "today">("home");
  const [flightId, setFlightId] = useState("");
  const [hotelId, setHotelId] = useState("");
  const [savedHotel, setSavedHotel] = useState(() => (typeof window === "undefined" ? "" : sessionStorage.getItem("vd-guest-hotel") || ""));
  const portal = trip.portal;
  const city = trip.program?.city || "Orlando";
  const flight = portal?.flights.find((item) => item.id === flightId);
  const stay = portal?.hotels.find((item) => item.id === hotelId) || portal?.hotels.find((item) => item.title === savedHotel);
  const route = portal?.routes.find((item) => item.title === stay?.route);

  if (screen !== "home") {
    return (
      <div className="mx-auto max-w-lg space-y-4 px-4 pb-10 pt-5 text-white">
        <button type="button" className="text-sm font-semibold text-[#4da3ff]" onClick={() => setScreen("home")}>Back to home</button>
        {screen === "arrival" ? <FlightList flights={portal?.flights || []} onOpen={(id) => { setFlightId(id); setScreen("flight"); }} /> : null}
        {screen === "flight" && flight ? <FlightDetail flight={flight} /> : null}
        {screen === "transport" ? <Transport portal={portal} stay={stay} onHotel={(id, title) => { sessionStorage.setItem("vd-guest-hotel", title); setSavedHotel(title); setHotelId(id); }} route={route} /> : null}
        {screen === "depart" ? <Departure rows={portal?.departs || []} hotel={portal?.hotels[0]} /> : null}
        {screen === "hotel" ? <HotelCard hotels={portal?.hotels || []} /> : null}
        {screen === "help" ? <Help /> : null}
        {screen === "today" ? <Today rows={portal?.today || []} /> : null}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-5 px-4 pb-8 pt-5 text-white" data-testid="guest-home">
      <section className="rounded-tile bg-vd-elevated p-5 ring-1 ring-white/10">
        <h1 className="text-3xl font-bold tracking-tight">Welcome to {city}!</h1>
        <p className="mt-3 text-sm leading-relaxed text-vd-muted">Everything for your trip is here: full trip details and transportation. A Venture Director is always happy to help.</p>
      </section>
      <div className="grid grid-cols-1 gap-3">
        {portal?.hasArrival ? <Tile shape="row" icon={<Plane className="size-5" />} label="Arrival" hint="Your flight and where to go after you land" onClick={() => setScreen("arrival")} /> : null}
        {portal?.hasTransport ? <Tile shape="row" icon={<Bus className="size-5" />} label="Transportation" hint="Your hotel, pickup, and today's shuttle" tone="green" onClick={() => setScreen("transport")} /> : null}
        {portal?.hasDeparture ? <Tile shape="row" icon={<Plane className="size-5" />} label="Departure" hint="When to leave the hotel" tone="amber" onClick={() => setScreen("depart")} /> : null}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Tile icon={<Hotel className="size-5" />} label="Hotel" hint="Name and directions" onClick={() => setScreen("hotel")} />
        <Tile icon={<LifeBuoy className="size-5" />} label="Help" hint="Questions, then a person" onClick={() => setScreen("help")} />
        <Tile icon={<Sun className="size-5" />} label="Today" hint="Moves posted for guests" onClick={() => setScreen("today")} />
      </div>
      <button type="button" className="text-sm text-vd-muted underline" onClick={onExit}>Exit / Switch trip</button>
    </div>
  );
}

function FlightList({ flights, onOpen }: { flights: Row[]; onOpen: (id: string) => void }) {
  return (
    <div className="space-y-3">
      <h1 className="text-3xl font-bold">Select your flight</h1>
      {flights.map((item) => (
        <button key={item.id} type="button" className="w-full rounded-tile bg-vd-elevated p-4 text-left ring-1 ring-white/10" onClick={() => onOpen(item.id)}>
          <p className="text-xl font-bold">{item.title}</p>
          <p className="text-sm text-vd-muted">{item.summary} · {item.time} · {item.route}</p>
        </button>
      ))}
    </div>
  );
}

function FlightDetail({ flight }: { flight: Row }) {
  const steps = (flight.detail || flight.spot).split("\n").filter(Boolean);
  return (
    <div className="space-y-3">
      <h1 className="text-3xl font-bold">{flight.title}</h1>
      <p className="text-vd-muted">{flight.summary} · {flight.time} · Terminal {flight.route}</p>
      <section className="rounded-tile bg-vd-elevated p-4 ring-1 ring-white/10">
        <p className="text-sm font-semibold text-[#4da3ff]">Where to go after you land</p>
        <ul className="mt-2 space-y-2 text-sm">{steps.map((step) => <li key={step}>{step}</li>)}</ul>
      </section>
      <p className="text-sm text-vd-muted">Follow the signs for ground transportation. A Venture Director is happy to point you on.</p>
    </div>
  );
}

function Transport({ portal, stay, onHotel, route }: { portal?: Portal; stay?: Row; onHotel: (id: string, title: string) => void; route?: Row }) {
  if (!stay) {
    return (
      <div className="space-y-3">
        <h1 className="text-3xl font-bold">Your hotel</h1>
        <p className="text-sm text-vd-muted">Choose it once. We&apos;ll keep the route with this phone.</p>
        {(portal?.hotels || []).map((item) => (
          <button key={item.id} type="button" className="w-full rounded-tile bg-vd-elevated p-4 text-left ring-1 ring-white/10" onClick={() => onHotel(item.id, item.title)}>
            <p className="text-lg font-bold">{item.title}</p>
            <p className="text-sm text-vd-muted">{item.spot}</p>
          </button>
        ))}
        {portal?.waves.length ? <WaveList rows={portal.waves} /> : null}
      </div>
    );
  }
  const color = COLORS[route?.summary || ""] || "#4da3ff";
  const mapsQuery = stay.spot || stay.title;
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`;
  return (
    <div className="space-y-3">
      <h1 className="text-3xl font-bold">{route?.title || stay.title}</h1>
      <article className="rounded-tile bg-vd-elevated p-4 ring-1 ring-white/10">
        {route ? <p className="text-sm font-semibold" style={{ color }}>{route.summary}</p> : null}
        <p className="mt-2 text-lg font-bold">Pickup</p>
        <p className="text-sm text-vd-muted">{stay.spot}</p>
        <a className="mt-3 inline-flex h-12 items-center rounded-full bg-white px-5 text-sm font-bold text-black" href={maps}>Directions</a>
        {route?.detail ? <p className="mt-4 text-sm whitespace-pre-line">{route.detail}</p> : null}
      </article>
      {portal?.waves.length ? <WaveList rows={portal.waves} /> : null}
    </div>
  );
}

function WaveList({ rows }: { rows: Row[] }) {
  return (
    <div className="space-y-2">
      <h2 className="text-xl font-bold">Special moves</h2>
      {rows.map((item) => (
        <article key={item.id} className="rounded-tile bg-vd-card p-4 ring-1 ring-white/10">
          <p className="font-bold">{item.time} · {item.title}</p>
          <p className="text-sm text-vd-muted">{item.summary}</p>
        </article>
      ))}
    </div>
  );
}

function Departure({ rows, hotel }: { rows: Row[]; hotel?: Row }) {
  return (
    <div className="space-y-3">
      <h1 className="text-3xl font-bold">Departure</h1>
      <p className="text-sm text-vd-muted">Leave from {hotel?.title || "your hotel"}. {hotel?.spot}</p>
      {hotel?.summary ? <a className="inline-flex h-12 items-center rounded-full bg-white px-5 text-sm font-bold text-black" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotel.summary)}`}>Directions</a> : null}
      {rows.map((item) => (
        <article key={item.id} className="rounded-tile bg-vd-elevated p-4 ring-1 ring-white/10">
          <p className="text-lg font-bold">{item.title}</p>
          <p className="text-sm text-vd-muted">Leave the hotel {item.time} · {item.summary}</p>
        </article>
      ))}
      {!rows.length ? <p className="text-sm text-vd-muted">Departure times are posted when your group covers them.</p> : null}
    </div>
  );
}

function HotelCard({ hotels }: { hotels: Row[] }) {
  return (
    <div className="space-y-3">
      <h1 className="text-3xl font-bold">Hotel</h1>
      {hotels.map((item) => (
        <article key={item.id} className="rounded-tile bg-vd-elevated p-4 ring-1 ring-white/10">
          <p className="text-lg font-bold">{item.title}</p>
          <p className="text-sm text-vd-muted">{item.summary || item.spot}</p>
          <a className="mt-3 inline-flex h-12 items-center rounded-full bg-white px-5 text-sm font-bold text-black" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.summary || item.title)}`}>Directions</a>
        </article>
      ))}
    </div>
  );
}

function Help() {
  const sms = COMPANY_PHONE_TEL.replace(/[^\d+]/g, "");
  return (
    <div className="space-y-3">
      <h1 className="text-3xl font-bold">Help</h1>
      <p className="text-sm text-vd-muted">Wait at the signed curb for your hotel. Times follow the schedule on Transportation. A lost item goes to the on-duty team.</p>
      <a className="flex h-12 items-center justify-center rounded-full bg-white text-sm font-bold text-black" href={`sms:${sms}`}>Text the on-duty team</a>
      <a className="flex h-12 items-center justify-center rounded-full text-sm font-semibold ring-1 ring-white/15" href={`tel:${COMPANY_PHONE_TEL}`}>Call {COMPANY_PHONE}</a>
      <p className="text-sm text-vd-muted">Need a lead? Ask for one on that same line.</p>
    </div>
  );
}

function Today({ rows }: { rows: Row[] }) {
  return (
    <div className="space-y-3">
      <h1 className="text-3xl font-bold">Today</h1>
      {rows.length ? rows.map((item) => (
        <article key={item.id} className="rounded-tile bg-vd-elevated p-4 ring-1 ring-white/10">
          <p className="font-bold">{item.title}</p>
          <p className="text-sm text-vd-muted">{item.time} {item.summary}</p>
        </article>
      )) : <p className="text-sm text-vd-muted">Nothing else is posted for guests today.</p>}
    </div>
  );
}
