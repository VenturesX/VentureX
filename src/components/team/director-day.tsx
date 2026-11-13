"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { field, onBtn } from "@/components/light/styles";
import { DeskGrid } from "@/components/premium/desk-grid";
import { HeroCard } from "@/components/premium/hero-card";
import { ProgressRing } from "@/components/premium/progress-ring";
import { CrewBar } from "@/components/team/crew-bar";

type Party = { id: string; vehicle: string; notes: string; carSeats: number; boosters: number; count: number; names: string[]; cells: string[] };
type Line = { flightCode: string; time: string; sort?: string; airline: string; flight: string; status: string; postCodes: string[]; mine: boolean; parties: Party[] };
type Day = {
  owner?: boolean;
  wide?: boolean;
  person: { name: string; postCode: string; postLabel: string; textAlerts: boolean; wide: boolean };
  program: { code: string; name: string; timezone?: string; windowClose?: string };
  count?: { kind: "airport" | "shuttle"; moved: number; total: number; label: string };
  shuttle?: { movedIn: number; movedOut: number; finalCount: number };
  flightsMet?: number;
  lastSent?: { id: string; vehicle: string; sentAt: string; pax: number } | null;
  vehicles?: string[];
  positions: { code: string; label: string }[];
  lines: Line[];
  staff: { name: string; post: string; in: boolean }[];
};

const TABS = ["Mine", "All", "Posts", "Staff"] as const;

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

function sideFromPost(post: string): "B1" | "B2" | "C" | null {
  if (post === "B_HIGH" || post === "B1") return "B1";
  if (post === "B_LOW" || post === "B2") return "B2";
  if (post === "C") return "C";
  return null;
}

function onSide(line: Line, side: "B1" | "B2" | "C") {
  return line.postCodes.some((code) => {
    if (side === "B1") return code === "B_HIGH" || code === "B1";
    if (side === "B2") return code === "B_LOW" || code === "B2";
    return code === "C";
  });
}

function flightOpen(line: Line) {
  return !/sent|depart|complete|cancel/i.test(line.status);
}

function MyDay({ day, code, onChange }: { day: Day; code: string; onChange: (day: Day) => void }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Mine");
  const [post, setPost] = useState(day.person.postCode);
  const assignedSide = sideFromPost(day.person.postCode);
  const [pickedSide, setPickedSide] = useState<"B1" | "B2" | "C" | null>(() => {
    if (typeof window === "undefined") return null;
    const saved = sessionStorage.getItem("vd-airport-side");
    return saved === "B1" || saved === "B2" || saved === "C" ? saved : null;
  });
  const side = assignedSide ?? pickedSide;
  const mine = day.lines.filter((line) => line.mine);
  const shown = tab === "All" ? day.lines : tab === "Posts" ? day.lines.filter((line) => line.postCodes.some((item) => item === post || (post === "B2" && item === "B_LOW") || (post === "B1" && item === "B_HIGH") || (post === "B_LOW" && item === "B2") || (post === "B_HIGH" && item === "B1"))) : mine;
  const airport = day.lines.some((line) => /\d/.test(line.flight));
  const guestTotal = day.lines.reduce((sum, line) => sum + line.parties.reduce((partySum, party) => partySum + party.count, 0), 0);
  const guestDone = day.lines.reduce((sum, line) => sum + (/sent|board|depart|picked|complete|loaded/i.test(line.status) ? line.parties.reduce((partySum, party) => partySum + party.count, 0) : 0), 0);
  const sideLines = side ? day.lines.filter((line) => onSide(line, side)) : [];
  const sideLeft = sideLines.filter(flightOpen);
  const allLeft = day.lines.filter(flightOpen);
  const nextFlight = [...sideLeft].sort((a, b) => (a.sort || a.time).localeCompare(b.sort || b.time))[0] ?? null;
  const nextCount = nextFlight ? nextFlight.parties.reduce((sum, party) => sum + party.count, 0) : 0;

  async function save(body: { postCode?: string; textAlerts?: boolean }) {
    const response = await fetch("/api/team/day", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, ...body }),
    });
    if (response.ok) onChange((await response.json()) as Day);
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 overflow-x-hidden px-4 pb-28 pt-6 text-white" data-testid="my-day">
      {day.owner ? <Link href="/team" className="inline-block min-h-11 text-sm font-semibold text-[#4da3ff]">← Owner hub</Link> : day.wide ? <Link href="/team/admin?setup=1" className="inline-block min-h-11 text-sm font-semibold text-[#4da3ff]">Staff and itinerary</Link> : null}
      <GuestCount day={day} />
      <ShuttleDesk day={day} code={code} onChange={onChange} />
      <HeroCard kicker={day.program.name} title={side ? `${day.person.postLabel || "Today's post"} · ${side}` : (day.person.postLabel || "Today's post")} line={`${day.person.name} · Today's shift`} />
      <Link href="/team/meter" className="flex min-h-14 items-center justify-between rounded-tile bg-vd-elevated px-4 text-base font-bold ring-1 ring-white/10">Guest-O-Meter<span aria-hidden="true">›</span></Link>
      <DeskGrid hrefFor={(key) => ({ manifest: "/team/clipboard", flights: "/team/director", dispatch: "/team/dispatch", clipboard: "/team/clipboard", shuttle: "/clipboard", drive: "/drive" }[key])} />
      {airport && !side ? (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">Your side</h2>
          <p className="text-sm text-vd-muted">Pick B1, B2, or C once. This phone remembers it.</p>
          <div className="grid grid-cols-3 gap-3">
            {(["B1", "B2", "C"] as const).map((item) => (
              <button key={item} type="button" className="vd-press flex min-h-24 items-center justify-center rounded-tile bg-vd-elevated text-2xl font-bold ring-1 ring-white/10" onClick={() => { sessionStorage.setItem("vd-airport-side", item); setPickedSide(item); }}>{item}</button>
            ))}
          </div>
        </section>
      ) : null}
      {airport && side ? (
        <>
          <section className="rounded-tile bg-vd-elevated p-5 ring-1 ring-white/10" data-testid="next-flight">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#4da3ff]">Next flight · {side}</p>
            {nextFlight ? (
              <>
                <h2 className="mt-2 break-words text-3xl font-bold tracking-tight">{nextFlight.airline} {nextFlight.flight}</h2>
                <p className="mt-2 text-base text-vd-muted">{nextFlight.time} · {nextCount} {nextCount === 1 ? "guest" : "guests"}</p>
              </>
            ) : <p className="mt-2 text-lg font-semibold">No flights left on {side}.</p>}
          </section>
          <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
            <ProgressRing compact done={sideLeft.length} total={Math.max(sideLines.length, sideLeft.length)} label={`flights left on ${side}`} />
            <ProgressRing compact done={allLeft.length} total={Math.max(day.lines.length, allLeft.length)} label="flights left overall" />
          </div>
        </>
      ) : null}
      {!airport ? <ProgressRing done={guestDone} total={Math.max(guestTotal, guestDone)} label="guests picked up" /> : null}
      <div className="grid grid-cols-4 gap-1">
        {TABS.map((item) => (
          <button key={item} type="button" className={`h-11 rounded-full text-sm font-semibold ${tab === item ? "bg-white text-black" : "bg-[#1c1c1e] text-vd-muted"}`} onClick={() => setTab(item)}>
            {item === "Mine" ? "My Day" : item}
          </button>
        ))}
      </div>
      {!day.wide ? <><label className="mt-3 block text-sm">Switch position
        <select className={`${field} mt-1`} value={day.person.postCode} onChange={(event) => void save({ postCode: event.target.value })}>
          {day.positions.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
        </select>
      </label>
      <button type="button" className="mt-2 min-h-11 text-sm font-semibold text-[#9ecbff]" onClick={() => void save({ textAlerts: !day.person.textAlerts })}>
        Text alerts {day.person.textAlerts ? "on" : "off"}
      </button>
      </> : null}
      {tab === "Staff" ? (
        <ul className="mt-4 divide-y divide-white/10">
          {day.staff.map((person) => (
            <li key={person.name} className="flex min-h-14 items-center justify-between text-lg">
              <span>{person.name}</span>
              <span className="text-base text-white/70">{person.post}{person.in ? " · In" : ""}</span>
            </li>
          ))}
        </ul>
      ) : (
        <>
          {tab === "Posts" ? (
            <div className="mt-3 flex flex-wrap gap-1">
              {day.positions.map((item) => (
                <button key={item.code} type="button" className={`h-10 rounded-full px-3 text-sm ${post === item.code ? "bg-white text-black" : "bg-white/10"}`} onClick={() => setPost(item.code)}>
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
          <ul className="mt-2 divide-y divide-white/10" data-testid="flight-lines">
            {shown.map((line) => {
              const count = line.parties.reduce((sum, party) => sum + party.count, 0);
              return (
                <li key={line.flightCode}>
                  <Link href={`/team/clipboard?flight=${line.flightCode}`} className="flex min-h-14 min-w-0 items-center gap-2 py-3">
                    <span className="w-16 shrink-0 text-sm font-semibold">{line.time}</span>
                    <span className="min-w-0 flex-1 truncate text-base font-semibold">{line.airline} {line.flight}</span>
                    <span className="shrink-0 text-xs text-vd-muted">{line.status}</span>
                    <span className="w-6 shrink-0 text-right text-sm">{count}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {shown.length === 0 ? <p className="mt-6 text-base text-white/70">No flights on this post.</p> : null}
        </>
      )}
      <CrewBar owner={day.owner} code={code} person={day.person} positions={day.positions} onDay={(next) => onChange(next as Day)} />
    </div>
  );
}
