"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { field, onBtn } from "@/components/light/styles";
import { Bus, CalendarDays, Gauge } from "lucide-react";
import { HeroCard } from "@/components/premium/hero-card";
import { Tile } from "@/components/premium/tile";
import { CrewBar } from "@/components/team/crew-bar";

type Party = { id: string; vehicle: string; notes: string; carSeats: number; boosters: number; count: number; names: string[]; cells: string[] };
type Line = { flightCode: string; time: string; sort?: string; airline: string; flight: string; status: string; postCodes: string[]; mine: boolean; parties: Party[]; leg?: string };
type Day = {
  owner?: boolean;
  wide?: boolean;
  person: { name: string; postCode: string; postLabel: string; textAlerts: boolean; wide: boolean };
  program: { code: string; name: string; timezone?: string; windowClose?: string; city?: string; jobKind?: string; demoDate?: string; demoTime?: string };
  count?: { kind: "airport" | "shuttle"; moved: number; total: number; label: string };
  shuttle?: { movedIn: number; movedOut: number; finalCount: number };
  flightsMet?: number;
  lastSent?: { id: string; vehicle: string; sentAt: string; pax: number } | null;
  vehicles?: string[];
  positions: { code: string; label: string }[];
  lines: Line[];
  staff: { name: string; post: string; in: boolean }[];
  sheet?: { kind: string; title: string; time: string; summary: string; detail: string; spot: string; route: string }[];
};

export function DirectorGate() {
  const [code, setCode] = useState("");
  const [day, setDay] = useState<Day | null>(null);
  const [error, setError] = useState("");

  async function open(value = code) {
    const response = await fetch(`/api/team/day?code=${encodeURIComponent(value)}`);
    const json = (await response.json()) as Day & { error?: string };
    if (!response.ok) {
      setError(json.error || "That day code is not active.");
      setDay(null);
      return;
    }
    setError("");
    if (!json.owner && value) sessionStorage.setItem("vd-day-code", value);
    setCode(value);
    setDay(json);
  }

  useEffect(() => {
    void fetch("/api/team/session").then((response) => response.json()).then((session) => {
      if (session.signedIn?.openProgram) { void open(""); return; }
      const saved = sessionStorage.getItem("vd-day-code");
      if (saved) { setCode(saved); void open(saved); }
    }).catch(() => setError("Could not check your session. Return to Team Login."));
  }, []);

  if (!day) {
    return (
      <form className="mx-auto max-w-lg space-y-3 px-5 py-10 text-white" onSubmit={(event) => { event.preventDefault(); void open(); }}>
        <Link href="/team" className="text-sm text-[#9ecbff]">Team Login</Link>
        <h1 className="text-3xl font-semibold">Director</h1>
        <p className="text-sm text-white/70">Enter the day code from your check-in text.</p>
        <input className={field} inputMode="numeric" aria-label="Day code" value={code} onChange={(event) => setCode(event.target.value)} placeholder="Day code" />
        <button className={`${onBtn} w-full`} type="submit">Open my day</button>
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        <p className="text-sm text-white/50">Demo code for Marissa: 4821</p>
      </form>
    );
  }

  return <MyDay day={day} code={code} onChange={setDay} />;
}

function GuestCount({ day }: { day: Day }) {
  const moved = day.count?.moved ?? 0;
  const total = day.count?.total ?? 0;
  return (
    <section className="rounded-tile bg-vd-elevated px-5 py-6 text-center ring-1 ring-white/10" data-testid="guest-count">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#4da3ff]">{day.count?.label || "Guests"}</p>
      <p className="mt-2 text-6xl font-bold tabular-nums tracking-tight">{moved}<span className="text-3xl text-vd-muted">/{total}</span></p>
    </section>
  );
}

function ShuttleDesk({ day, code, onChange }: { day: Day; code: string; onChange: (day: Day) => void }) {
  const [bus, setBus] = useState("");
  const [pax, setPax] = useState("");
  const [notice, setNotice] = useState("");
  const [problem, setProblem] = useState("");
  const airport = (day.count?.kind || "airport") === "airport";
  const sent = day.lastSent;
  const when = sent?.sentAt ? new Date(sent.sentAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: day.program.timezone || "America/New_York" }) : "";

  async function save(body: { action: string; tripId?: string; count?: number; vehicle?: string }) {
    setNotice("");
    setProblem("");
    const response = await fetch("/api/team/desk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, ...body }),
    });
    const json = (await response.json()) as Day & { error?: string };
    if (!response.ok) {
      setProblem(json.error || "Could not save that.");
      return;
    }
    onChange(json);
    setNotice("Saved");
    setPax("");
  }

  return (
    <section className="space-y-3" data-testid="shuttle-desk">
      <article className="rounded-tile bg-vd-card p-4 ring-1 ring-white/10">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#4da3ff]">Last shuttle sent</p>
        {sent ? (
          <>
            <p className="mt-2 text-2xl font-bold">{sent.vehicle}</p>
            <p className="text-sm text-vd-muted">{when} · {sent.pax} passengers</p>
            <button type="button" className="mt-3 h-12 rounded-full bg-white px-4 text-sm font-bold text-black" onClick={() => void save({ action: "late", tripId: sent.id, count: 1 })}>+1 late runner</button>
          </>
        ) : <p className="mt-2 text-sm text-vd-muted">No shuttle sent yet.</p>}
      </article>
      <form className="space-y-3 rounded-tile bg-vd-card p-4 ring-1 ring-white/10" onSubmit={(event) => { event.preventDefault(); void save({ action: "send-loop", vehicle: bus, count: Number(pax) }); }}>
        <p className="text-lg font-bold">{airport ? "Send an airport loop" : "Send shuttle"}</p>
        <label className="block text-sm">Bus
          <input className={`${field} mt-1`} list="bus-list" aria-label="Bus" value={bus} onChange={(event) => setBus(event.target.value)} placeholder="Bus or vehicle" />
        </label>
        <datalist id="bus-list">{(day.vehicles || []).map((item) => <option key={item} value={item} />)}</datalist>
        <label className="block text-sm">Passengers
          <input className={`${field} mt-1`} inputMode="numeric" aria-label="Passengers" value={pax} onChange={(event) => setPax(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="0" />
        </label>
        <button className="h-14 w-full rounded-full bg-white text-base font-bold text-black" type="submit" disabled={!bus.trim() || pax === ""}>Send</button>
        {notice ? <p className="text-sm font-semibold text-[#30d158]">{notice}</p> : null}
        {problem ? <p className="text-sm text-[#ffb4b0]">{problem}</p> : null}
      </form>
    </section>
  );
}

function routeKey(value: string) {
  return value.match(/route\s+\d+/i)?.[0].toLowerCase() || "";
}

function flightTitle(line: Line) {
  const number = line.flight.replace(/^[A-Za-z]+\s+/, "");
  return line.airline && number ? `${line.airline} ${number}` : `${line.airline} ${line.flight}`.trim();
}

function nextFlightFor(day: Day) {
  const mark = day.program.demoTime || "";
  const arrivals = day.lines.filter((line) => line.leg !== "depart");
  const ordered = [...(arrivals.length ? arrivals : day.lines)].sort((a, b) => (a.sort || a.time).localeCompare(b.sort || b.time));
  return ordered.find((line) => mark && (line.sort || "") >= mark) || ordered[0] || null;
}

function MyDay({ day, code, onChange }: { day: Day; code: string; onChange: (day: Day) => void }) {
  const [screen, setScreen] = useState<"home" | "day" | "info" | "flights">("home");
  const sheet = day.sheet || [];
  const me = sheet.find((item) => item.kind === "STAFF" && item.title === day.person.name);
  const lead = sheet.find((item) => item.kind === "STAFF" && /lead/i.test(`${item.spot} ${item.route}`));
  const mineKey = routeKey(me?.route || "");
  const partner = sheet.find((item) => item.kind === "STAFF" && item.title !== day.person.name && mineKey && routeKey(item.route) === mineKey);
  const kind = day.program.jobKind || (day.lines.length ? "AIRPORT" : "SHUTTLE");
  const nextFlight = nextFlightFor(day);
  const nextCount = nextFlight ? nextFlight.parties.reduce((sum, party) => sum + party.count, 0) : 0;

  if (screen === "home") {
    return (
      <div className="mx-auto max-w-lg space-y-4 px-4 pb-28 pt-6 text-white" data-testid="staff-home">
        {day.owner ? <Link href="/team" className="inline-block min-h-11 text-sm font-semibold text-[#4da3ff]">← Owner hub</Link> : null}
        <HeroCard kicker={day.program.name} title={day.person.name} line={me ? `${me.spot} · ${me.time}` : "Today's shift"} />
        <div className="grid grid-cols-1 gap-3">
          <Tile shape="row" icon={<Bus className="size-5" />} label="My Day" hint="Your post, the count, and the next move" onClick={() => setScreen("day")} />
          <Tile shape="row" icon={<CalendarDays className="size-5" />} label="Day Info" hint="Hours, notes, and who is working" tone="green" onClick={() => setScreen("info")} />
          <Tile shape="row" icon={<Gauge className="size-5" />} label="Guest-O-Meter" hint="The rings for this program" tone="amber" href="/team/meter" />
        </div>
        <CrewBar owner={day.owner} code={code} person={day.person} positions={day.positions} onDay={(next) => onChange(next as Day)} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 overflow-x-hidden px-4 pb-28 pt-6 text-white" data-testid={screen === "info" ? "day-info" : "my-day"}>
      <button type="button" className="text-sm font-semibold text-[#4da3ff]" onClick={() => setScreen(screen === "flights" ? "day" : "home")}>{screen === "flights" ? "Back to My Day" : "Back to home"}</button>
      {screen === "info" ? <DayInfo day={day} /> : null}
      {screen === "flights" ? <FlightList lines={day.lines} /> : null}
      {screen === "day" ? (
        <>
          <section className="rounded-tile bg-vd-elevated p-5 ring-1 ring-white/10">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#4da3ff]">{day.program.name}</p>
            <h1 className="mt-2 text-3xl font-bold">{me?.route || day.person.postLabel || "Today's post"}</h1>
            <p className="mt-2 text-sm text-vd-muted">{me?.time || "Shift on the sheet"} · {me?.spot || day.person.name}</p>
            <p className="mt-1 text-sm text-vd-muted">{me?.summary ? `${me.summary}` : ""}{partner ? ` · Partner ${partner.title}` : ""}{lead && lead.title !== day.person.name ? ` · Lead ${lead.title}` : ""}</p>
          </section>
          {kind === "AIRPORT" ? (
            <>
              <section className="rounded-tile bg-vd-elevated p-5 ring-1 ring-white/10" data-testid="next-flight">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#4da3ff]">Your next flight</p>
                {nextFlight ? (
                  <>
                    <h2 className="mt-2 text-3xl font-bold">{flightTitle(nextFlight)}</h2>
                    <p className="mt-2 text-vd-muted">{nextFlight.time} · {nextCount} {nextCount === 1 ? "guest" : "guests"} · {nextFlight.parties[0]?.vehicle}</p>
                    <p className="mt-2 text-sm">{nextFlight.parties.flatMap((party) => party.names).filter(Boolean).join(", ")}</p>
                  </>
                ) : <p className="mt-2">No flights posted.</p>}
              </section>
              <button type="button" className="flex min-h-14 w-full items-center justify-between rounded-tile bg-vd-card px-4 text-base font-bold ring-1 ring-white/10" onClick={() => setScreen("flights")}>All of today&apos;s flights <span aria-hidden="true">›</span></button>
              <ShuttleDesk day={day} code={code} onChange={onChange} />
            </>
          ) : null}
          {kind === "SHUTTLE" ? (
            <>
              <GuestCount day={day} />
              <ShuttleDesk day={day} code={code} onChange={onChange} />
            </>
          ) : null}
          {kind === "EVENT" ? <EventTimeline day={day} /> : null}
        </>
      ) : null}
      <CrewBar owner={day.owner} code={code} person={day.person} positions={day.positions} onDay={(next) => onChange(next as Day)} />
    </div>
  );
}

function FlightList({ lines }: { lines: Line[] }) {
  return (
    <div>
      <h1 className="text-3xl font-bold">Today&apos;s flights</h1>
      <ul className="mt-3 divide-y divide-white/10" data-testid="flight-lines">
        {lines.map((line) => {
          const count = line.parties.reduce((sum, party) => sum + party.count, 0);
          return (
            <li key={line.flightCode}>
              <Link href={`/team/clipboard?flight=${line.flightCode}`} className="flex min-h-14 items-center gap-2 py-3">
                <span className="w-16 shrink-0 text-sm font-semibold">{line.time}</span>
                <span className="min-w-0 flex-1 text-base font-semibold">{flightTitle(line)}</span>
                <span className="text-sm text-vd-muted">{count}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function EventTimeline({ day }: { day: Day }) {
  const rows = (day.sheet || []).filter((item) => item.kind === "WAVE" || item.kind === "NOTE");
  return (
    <div className="space-y-3" data-testid="event-timeline">
      <h2 className="text-2xl font-bold">Timeline</h2>
      {rows.map((item) => (
        <article key={`${item.kind}-${item.title}`} className="rounded-tile bg-vd-card p-4 ring-1 ring-white/10">
          <p className="text-sm font-semibold text-[#4da3ff]">{item.time}</p>
          <p className="text-lg font-bold">{item.title}</p>
          <p className="text-sm text-vd-muted">{item.summary}</p>
          {item.detail ? <p className="mt-2 text-sm">{item.detail}</p> : null}
        </article>
      ))}
    </div>
  );
}

function DayInfo({ day }: { day: Day }) {
  const sheet = day.sheet || [];
  const notes = sheet.filter((item) => item.kind === "NOTE");
  const routes = sheet.filter((item) => item.kind === "ROUTE");
  const waves = sheet.filter((item) => item.kind === "WAVE");
  const people = sheet.filter((item) => item.kind === "STAFF");
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Day Info</h1>
      <p className="text-sm text-vd-muted">{day.program.name}{day.program.city ? ` · ${day.program.city}` : ""}</p>
      {notes.map((item) => (
        <article key={item.title} className="rounded-tile bg-vd-elevated p-4 ring-1 ring-white/10">
          <p className="font-bold">{item.title}</p>
          <p className="mt-2 text-sm text-vd-muted">{item.summary}</p>
          {item.detail ? <p className="mt-2 text-sm">{item.detail}</p> : null}
        </article>
      ))}
      {routes[0]?.detail ? <article className="rounded-tile bg-vd-card p-4 text-sm ring-1 ring-white/10"><p className="font-bold">Shuttle hours</p><p className="mt-2 whitespace-pre-line text-vd-muted">{routes[0].detail}</p></article> : null}
      {waves.map((item) => (
        <article key={item.title} className="rounded-tile bg-vd-card p-4 ring-1 ring-white/10">
          <p className="text-sm text-[#4da3ff]">{item.time}</p>
          <p className="font-bold">{item.title}</p>
          <p className="text-sm text-vd-muted">{item.summary}</p>
        </article>
      ))}
      <ul className="divide-y divide-white/10">
        {(people.length ? people : day.staff.map((person) => ({ title: person.name, route: person.post, time: "", spot: "", summary: "" }))).map((person) => (
          <li key={person.title} className="py-3">
            <p className="text-lg font-semibold">{person.title}</p>
            <p className="text-sm text-vd-muted">{person.route}{person.time ? ` · ${person.time}` : ""}{person.spot ? ` · ${person.spot}` : ""}{person.summary ? ` · ${person.summary}` : ""}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
