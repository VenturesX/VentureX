"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { field } from "@/components/light/styles";
import { CrewBar } from "@/components/team/crew-bar";

type Guest = {
  id: string;
  tripId: string;
  name: string;
  cell: string;
  checkedIn: boolean;
  stage: string;
  stageAt: string;
  stageBy: string;
  vehicle: string;
  notes: string;
  carSeats: number;
  boosters: number;
};
type Line = {
  flightCode: string;
  time: string;
  sort: string;
  airline: string;
  flight: string;
  status: string;
  origin: string;
  airSide: string;
  mine: boolean;
  parties: { id: string; count: number; vehicle: string; notes: string; carSeats: number; boosters: number }[];
  guests: Guest[];
};
type Day = {
  owner?: boolean;
  wide?: boolean;
  person: { name: string; postCode: string; postLabel: string; textAlerts: boolean };
  program: { name: string };
  positions: { code: string; label: string }[];
  lines: Line[];
};

const DAYS = [
  { label: "Day 1", hint: "Today" },
  { label: "Day 2", hint: "" },
  { label: "Day 3", hint: "" },
  { label: "Day 4", hint: "" },
];

export function FlightDesk({ mode }: { mode: "clipboard" | "dispatch" }) {
  const params = useSearchParams();
  const focus = params.get("flight") || "";
  const [code, setCode] = useState("");
  const [day, setDay] = useState<Day | null>(null);
  const [dayTab, setDayTab] = useState(0);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [vehicle, setVehicle] = useState("");
  const [destination, setDestination] = useState("");
  const [error, setError] = useState("");

  const lines = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return day?.lines ?? [];
    return (day?.lines ?? []).filter((line) =>
      line.flight.toLowerCase().includes(needle) ||
      line.flightCode.toLowerCase().includes(needle) ||
      line.guests.some((guest) => guest.name.toLowerCase().includes(needle)),
    );
  }, [day, query]);

  useEffect(() => {
    void fetch("/api/team/session").then((response) => response.json()).then((session) => {
      const saved = session.signedIn?.openProgram ? "" : sessionStorage.getItem("vd-day-code") || "";
      setCode(saved);
      return fetch(`/api/team/day?code=${encodeURIComponent(saved)}`);
    }).then(async (response) => {
      if (!response) return;
      if (response.ok) setDay((await response.json()) as Day);
      else { const json = await response.json(); setError(json.error || "Return to Team Login."); }
    }).catch(() => setError("Could not open the day. Return to Team Login."));
  }, []);

  useEffect(() => {
    const target = query.trim() ? lines[0]?.flightCode : focus;
    if (!target) return;
    document.getElementById(`flight-${target}`)?.scrollIntoView({ block: "start" });
  }, [focus, query, lines]);

  async function act(body: { action: string; paxIds?: string[]; tripId?: string; count?: number }) {
    if (!code && !day?.wide && !day?.owner) return;
    const response = await fetch("/api/team/desk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, destination, vehicle, ...body }),
    });
    if (response.ok) {
      setDay((await response.json()) as Day);
      setPicked([]);
    } else { const json = await response.json(); setError(json.error || "Could not save that change."); }
  }

  if (!day && error) {
    return (
      <div className="mx-auto max-w-lg px-5 py-10 text-white">
        <Link href="/team" className="text-sm text-[#9ecbff]">Team Login / Owner hub</Link>
        <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>
      </div>
    );
  }
  if (!day) return <p className="p-6 text-white">Opening the day...</p>;

  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-4 text-white" data-testid={mode}>
      {day.owner ? <Link href="/team" className="inline-block min-h-11 text-sm text-[#9ecbff]">← Owner hub</Link> : null}
      {error ? <p role="alert" className="text-sm text-red-300">{error}</p> : null}
      {mode === "clipboard" ? (
        <Link href="/team/director" className="sticky top-0 z-10 block bg-[#090b10] py-3 text-sm font-semibold text-[#9ecbff]">Back to My Day</Link>
      ) : <h1 className="py-3 text-2xl font-semibold">Dispatch</h1>}
      {mode === "clipboard" ? (
        <div className="grid grid-cols-4 gap-1">
          {DAYS.map((item, index) => (
            <button key={item.label} type="button" className={`h-12 rounded-xl text-sm font-semibold ${dayTab === index ? "bg-gradient-to-r from-[#1E90FF] to-[#8B5CF6]" : "bg-white/10"}`} onClick={() => setDayTab(index)}>
              {item.label}
              {item.hint ? <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-wide">{item.hint}</span> : null}
            </button>
          ))}
        </div>
      ) : null}
      <input className={`${field} mt-3`} aria-label="Search" placeholder="Guest name or flight" value={query} onChange={(event) => setQuery(event.target.value)} />
      {mode === "clipboard" && dayTab > 0 ? <p className="mt-8 text-base text-white/70">Nothing on this day.</p> : null}
      {(mode === "dispatch" || dayTab === 0) ? lines.map((line) => (
        <FlightBlock key={line.flightCode} line={line} mode={mode} focus={focus === line.flightCode} query={query} picked={picked} setPicked={setPicked} act={act} />
      )) : null}
      {mode === "dispatch" && picked.length ? (
        <div className="fixed inset-x-0 bottom-16 z-30 mx-auto max-w-lg space-y-2 border-t border-white/10 bg-[#090b10] p-3">
          <button type="button" className="h-12 w-full rounded-xl bg-white/10 text-sm font-semibold" onClick={() => void act({ action: "load", paxIds: picked })}>Move to loading</button>
          <input className={field} aria-label="Vehicle" placeholder="Vehicle, optional" value={vehicle} onChange={(event) => setVehicle(event.target.value)} />
          <input className={field} aria-label="Destination" placeholder="Destination, optional" value={destination} onChange={(event) => setDestination(event.target.value)} />
          <button type="button" className="h-12 w-full rounded-xl bg-gradient-to-r from-[#1E90FF] to-[#8B5CF6] text-sm font-semibold" onClick={() => void act({ action: "send", paxIds: picked })}>Send</button>
        </div>
      ) : null}
      <CrewBar owner={day.owner} code={code} person={day.person} positions={day.positions} onDay={(next) => setDay(next as Day)} />
    </div>
  );
}

function statusWord(guest: Guest, flightStatus: string) {
  if (guest.stage === "SENT") return "Sent";
  if (guest.stage === "LOADING") return "Loading";
  if (guest.stage === "SENT_DOWN") return "Sent down";
  return flightStatus === "Landed" || flightStatus === "At gate" ? "Landed" : flightStatus;
}

function FlightBlock({
  line,
  mode,
  focus,
  query,
  picked,
  setPicked,
  act,
}: {
  line: Line;
  mode: "clipboard" | "dispatch";
  focus: boolean;
  query: string;
  picked: string[];
  setPicked: (ids: string[]) => void;
  act: (body: { action: string; paxIds?: string[]; tripId?: string; count?: number }) => Promise<void>;
}) {
  const count = line.parties.reduce((sum, party) => sum + party.count, 0);
  const detail = line.parties.map((party) => {
    const bits = [party.notes];
    if (party.carSeats && !/car seat/i.test(party.notes)) bits.push(`${party.carSeats} car seat`);
    if (party.boosters && !/booster/i.test(party.notes)) bits.push(`${party.boosters} booster`);
    return bits.filter(Boolean).join(" · ");
  }).filter(Boolean).join(" · ");
  const ids = line.guests.map((guest) => guest.id);
  const ready = line.guests.filter((guest) => guest.stage === "EXPECTED" && (guest.checkedIn || picked.includes(guest.id)));
  const sent = line.guests.find((guest) => guest.stage === "SENT_DOWN" || guest.stage === "LOADING" || guest.stage === "SENT");
  return (
    <section id={`flight-${line.flightCode}`} className={`mt-4 scroll-mt-16 border-t border-white/10 pt-3 ${focus ? "bg-white/[0.04]" : ""}`}>
      <h2 className="text-lg font-semibold">{line.time} {line.airline} {line.flight} {line.status} · {count}</h2>
      <p className="text-sm text-white/70">{line.origin} · {line.airSide} · {line.parties.map((party) => party.vehicle).join(", ")}</p>
      {detail ? <p className="text-sm text-white/70">{detail}</p> : null}
      <div className="mt-2 flex items-center gap-2">
        <button type="button" className="h-11 rounded-xl bg-white/10 px-3 text-sm font-semibold" onClick={() => {
          const next = ids.every((id) => picked.includes(id)) ? picked.filter((id) => !ids.includes(id)) : [...new Set([...picked, ...ids])];
          setPicked(next);
          if (mode === "clipboard") void act({ action: "check", paxIds: ids });
        }}>Select all</button>
        <CountControl value={count} onChange={(next) => {
          const first = line.parties[0];
          if (!first) return;
          void act({ action: "count", tripId: first.id, count: Math.max(0, first.count + (next - count)) });
        }} />
      </div>
      <ul className="mt-1">
        {line.guests.map((guest) => (
          <li key={guest.id} className="flex min-h-12 items-center gap-3 text-base">
            <input
              type="checkbox"
              className="size-5"
              checked={mode === "clipboard" ? guest.checkedIn || picked.includes(guest.id) : picked.includes(guest.id)}
              aria-label={guest.name}
              onChange={() => {
                const on = picked.includes(guest.id);
                setPicked(on ? picked.filter((id) => id !== guest.id) : [...picked, guest.id]);
                if (mode === "clipboard" && !on && !guest.checkedIn) void act({ action: "check", paxIds: [guest.id] });
              }}
            />
            <span className={`flex-1 ${query.trim() && guest.name.toLowerCase().includes(query.trim().toLowerCase()) ? "text-[#9ecbff]" : ""}`}>{guest.name}</span>
            <span className="text-sm text-white/70">{mode === "dispatch" ? statusWord(guest, line.status) : guest.stage === "SENT_DOWN" ? "Sent to dispatch" : guest.stage === "LOADING" ? "Loading" : guest.stage === "SENT" ? "Sent" : ""}</span>
          </li>
        ))}
      </ul>
      {mode === "clipboard" && ready.length ? (
        <button type="button" className="mt-2 h-11 rounded-xl bg-gradient-to-r from-[#1E90FF] to-[#8B5CF6] px-4 text-sm font-semibold" onClick={() => void act({ action: "send-down", paxIds: ready.map((guest) => guest.id) })}>
          Send to dispatch
        </button>
      ) : null}
      {mode === "clipboard" && sent ? <p className="mt-2 text-sm text-white/70">Sent to dispatch · {sent.stageBy} · {sent.stageAt ? new Date(sent.stageAt).toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" }) : ""}</p> : null}
    </section>
  );
}

function CountControl({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  return (
    <span className="ml-auto flex items-center gap-1">
      <button type="button" className="grid size-11 place-items-center rounded-xl bg-white/10" onClick={() => { const next = Math.max(0, value - 1); setText(String(next)); onChange(next); }} aria-label="Fewer guests">-</button>
      <input className="h-11 w-14 rounded-xl border border-white/15 bg-black text-center" inputMode="numeric" aria-label="Guest count" value={text} onChange={(event) => setText(event.target.value.replace(/\D/g, ""))} onBlur={() => onChange(Number(text || 0))} />
      <button type="button" className="grid size-11 place-items-center rounded-xl bg-white/10" onClick={() => { const next = value + 1; setText(String(next)); onChange(next); }} aria-label="More guests">+</button>
    </span>
  );
}
