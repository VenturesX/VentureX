"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BOARD_TABS, FLAG_LABEL, displayFlight, ruleKind, tripInTab } from "@/lib/light/posts";
import { addMinutes, clockLabel, isAfterWindow } from "@/lib/light/time";
import { card, field, ghostBtn, offBtn, onBtn } from "@/components/light/styles";

type Pax = {
  id: string;
  firstName: string;
  lastName: string;
  cell: string;
  notes: string;
  bagStatus: string;
  checkedIn: boolean;
  noShow: boolean;
  ownTransport: boolean;
};
type Trip = {
  id: string;
  flightCode: string;
  origin: string;
  scheduledTime: string;
  airSide: string;
  postCode: string;
  vehicleLabel: string;
  vendor: string;
  notes: string;
  flags: string;
  driverName: string;
  driverPhone: string;
  vehicleNumber: string;
  status: string;
  reportedPax: number | null;
  sentAt: string | null;
  etaLabel: string;
  hotelToken: string | null;
  hotelMessage: string;
  ownerName: string;
  passengers: Pax[];
};
type Flight = {
  flightCode: string;
  status: string;
  gate: string;
  baggage: string;
  estimatedAt: string;
  actualAt: string;
  scheduledAt: string;
  pinned: boolean;
};
type Board = {
  program: { name: string; code: string; serviceDate: string; windowClose: string; greetOffsetMin: number; hotels: string };
  trips: Trip[];
  flights: Flight[];
  rules: { vehicleKind: string; pickupNote: string }[];
  directory: { id: string; kind: string; name: string; company: string; phone: string }[];
  alerts: { id: string; body: string }[];
  headsUps: { id: string; fromName: string; body: string; ackedAt: string | null }[];
  changes: { id: string; actor: string; action: string; detail: string; createdAt: string }[];
  roster: { id: string; name: string; role: string; postCode: string; phone: string }[];
  late: { flights: number; pax: number };
  viewer: { role: string; post: string; name: string } | null;
  provider: string;
};

const BAGS = [
  ["UNKNOWN", "Unknown"],
  ["NOT_YET", "Not yet"],
  ["ON_HAND", "Bags on hand"],
] as const;

export function LightBoard({ code, token = "" }: { code: string; token?: string }) {
  const [board, setBoard] = useState<Board | null>(null);
  const [tab, setTab] = useState("ALL");
  const [error, setError] = useState("");
  const [cars, setCars] = useState(false);
  const [sentFor, setSentFor] = useState<string | null>(null);
  const [view, setView] = useState("greeter");

  const load = useCallback(async () => {
    const response = await fetch(`/api/light/board?code=${encodeURIComponent(code)}&t=${encodeURIComponent(token)}`, { cache: "no-store" });
    const json = (await response.json()) as Board & { error?: string };
    if (!response.ok) {
      setError(json.error || "Board unavailable.");
      return;
    }
    setBoard(json);
    setError("");
  }, [code, token]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    const poll = window.setInterval(() => void load(), 15000);
    const flights = window.setInterval(() => {
      void fetch("/api/light/flights", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) }).then(() => load());
    }, 60000);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(poll);
      window.clearInterval(flights);
    };
  }, [load, code]);

  useEffect(() => {
    if (!board?.viewer) return;
    const timer = window.setTimeout(() => {
      if (board.viewer?.role === "dispatcher") setView("dispatch");
      if (board.viewer?.post && board.viewer.post !== "ALL") setTab(board.viewer.post === "A_HIGH" || board.viewer.post === "A_LOW" ? "A" : board.viewer.post);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [board?.viewer]);

  const flights = useMemo(() => new Map((board?.flights ?? []).map((flight) => [flight.flightCode, flight])), [board]);
  const trips = (board?.trips ?? []).filter((trip) => tripInTab(trip.postCode, tab));
  const groups = new Map<string, Trip[]>();
  for (const trip of trips) {
    const list = groups.get(trip.flightCode) ?? [];
    list.push(trip);
    groups.set(trip.flightCode, list);
  }

  async function act(body: Record<string, unknown>) {
    await fetch("/api/light/board", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, actor: board?.viewer?.name || "Board", ...body }),
    });
    await load();
  }

  if (!board) return <p className="p-4 text-sm text-white">{error || "Loading the board..."}</p>;

  return (
    <div className="mx-auto w-full max-w-lg space-y-3 px-3 py-3 text-white" data-testid="light-board">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9ecbff]">Meet and greet</p>
        <h1 className="text-2xl font-semibold leading-tight">{board.program.name}</h1>
        <p className="text-sm text-[#d5dbe6]">{board.program.serviceDate} · {board.program.hotels}</p>
      </header>
      <div className="grid grid-cols-3 gap-1">
        {["greeter", "dispatch", "driver"].map((item) => (
          <button key={item} type="button" className={view === item ? onBtn : offBtn} onClick={() => setView(item)}>
            {item === "dispatch" ? "Dispatch" : item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-1" data-testid="post-tabs">
        {BOARD_TABS.map((item) => (
          <button key={item.id} type="button" className={tab === item.id ? onBtn : offBtn} onClick={() => setTab(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      {board.late.flights > 0 ? (
        <section className="rounded-2xl border border-red-500 bg-red-950/40 p-3" data-testid="after-window">
          <p className="text-sm font-semibold text-red-200">{board.late.flights} flights past close</p>
          <p className="text-sm text-red-100">{board.late.pax} guests</p>
          <button type="button" className={`${offBtn} mt-2 w-full`} data-testid="private-car" onClick={() => setCars((open) => !open)}>
            Private car
          </button>
          {cars ? (
            <ul className="mt-2 space-y-1 text-sm">
              {board.directory.filter((row) => row.kind === "AFFILIATE").map((row) => (
                <li key={row.id}>{row.name}{row.phone ? ` · ${row.phone}` : ""}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
      {board.alerts[0] ? <p className="rounded-xl bg-amber-950/50 px-3 py-2 text-sm text-amber-100">{board.alerts[0].body}</p> : null}
      {view === "dispatch" ? (
        <section className={card}>
          <h2 className="text-sm font-semibold">Heads up</h2>
          {board.headsUps.filter((item) => !item.ackedAt).length === 0 ? <p className="mt-1 text-sm text-[#d5dbe6]">None waiting.</p> : null}
          {board.headsUps.filter((item) => !item.ackedAt).map((item) => (
            <div key={item.id} className="mt-2 flex items-center gap-2">
              <p className="flex-1 text-sm">{item.fromName}: {item.body}</p>
              <button type="button" className={ghostBtn} onClick={() => act({ action: "ack", id: item.id })}>Got it</button>
            </div>
          ))}
        </section>
      ) : null}
      {[...groups.entries()].map(([flightCode, parties]) => {
        const flight = flights.get(flightCode);
        const when = flight?.actualAt || flight?.estimatedAt || parties[0].scheduledTime;
        const late = isAfterWindow(when, board.program.windowClose);
        const greet = clockLabel(addMinutes(when, board.program.greetOffsetMin));
        return (
          <article key={flightCode} className={`${card} ${late ? "border-red-500" : ""}`} data-testid={`flight-${flightCode}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">{displayFlight(flightCode)} · {parties[0].origin}</h2>
                <p className="text-sm text-[#d5dbe6]">{statusWord(flight?.status)} {clockLabel(when)}</p>
                <p className="text-sm">Greet {greet || "—"}</p>
                {flight?.baggage ? <p className="text-sm">Bags {flight.baggage}{flight.gate ? ` · Gate ${flight.gate}` : ""}</p> : null}
              </div>
              {late ? <span className="rounded-full bg-red-600 px-2 py-1 text-xs font-semibold">After window</span> : null}
            </div>
            {parties.map((trip) => {
              const rule = board.rules.find((item) => item.vehicleKind === ruleKind(trip.vehicleLabel));
              return (
                <div key={trip.id} className="mt-3 border-t border-white/10 pt-3">
                  <p className="text-sm font-semibold">{trip.vehicleLabel} · {trip.vendor || "Vendor open"} · {trip.airSide}</p>
                  <p className="text-sm text-[#d5dbe6]">{rule?.pickupNote}</p>
                  <p className="text-sm">{trip.driverName ? `Driver ${trip.driverName}` : "Driver open"}{trip.vehicleNumber ? ` · #${trip.vehicleNumber}` : ""} · {trip.status === "SENT" ? "Sent" : trip.status === "QUEUED" ? "Down" : "Open"}</p>
                  {trip.reportedPax != null ? <p className="text-sm">Count {trip.reportedPax}</p> : null}
                  <div className="mt-1 flex flex-wrap gap-1">
                    {trip.flags.split(",").filter(Boolean).map((flag) => (
                      <span key={flag} className="rounded-full bg-white/10 px-2 py-1 text-xs">{FLAG_LABEL[flag] || flag}</span>
                    ))}
                  </div>
                  {trip.notes ? <p className="mt-1 text-sm text-[#d5dbe6]">{trip.notes}</p> : null}
                  <ul className="mt-2 space-y-1">
                    {trip.passengers.map((pax) => (
                      <li key={pax.id} className="rounded-xl bg-black/40 p-2">
                        <button type="button" className="min-h-11 w-full text-left text-sm font-semibold" data-testid={`checkin-${pax.id}`} onClick={() => act({ action: "check-in", paxId: pax.id, on: !pax.checkedIn })}>
                          {pax.checkedIn ? "In · " : ""}{pax.firstName} {pax.lastName}
                        </button>
                        <div className="mt-1 grid grid-cols-3 gap-1">
                          {BAGS.map(([value, label]) => (
                            <button key={value} type="button" className={pax.bagStatus === value ? onBtn : offBtn} onClick={() => act({ action: "bag", paxId: pax.id, bagStatus: value })}>
                              {label}
                            </button>
                          ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 grid grid-cols-2 gap-1">
                    <button type="button" className={offBtn} onClick={() => act({ action: "send-down", tripId: trip.id })}>Send down</button>
                    <button type="button" className={onBtn} data-testid={`sent-${trip.id}`} onClick={() => setSentFor(sentFor === trip.id ? null : trip.id)}>Mark sent</button>
                    <button type="button" className={ghostBtn} onClick={() => act({ action: "status", tripId: trip.id, status: "NO_SHOW" })}>No-show</button>
                    <button type="button" className={ghostBtn} onClick={() => act({ action: "status", tripId: trip.id, status: "OWN_TRANSPORT" })}>Own transport</button>
                  </div>
                  {view === "dispatch" ? (
                    <button type="button" className={`${offBtn} mt-1 w-full`} onClick={() => act({ action: "ping", tripId: trip.id })}>Ping driver</button>
                  ) : null}
                  {sentFor === trip.id ? <SentForm trip={trip} onSave={(fields) => act({ action: "sent", tripId: trip.id, ...fields })} /> : null}
                  {trip.hotelMessage ? (
                    <details className="mt-2">
                      <summary className="min-h-11 cursor-pointer text-sm font-semibold">Hotel text</summary>
                      <pre className="mt-1 whitespace-pre-wrap text-sm">{trip.hotelMessage}</pre>
                      {trip.hotelToken ? <Link className="mt-1 block text-sm text-[#9ecbff]" href={`/light/h/${trip.hotelToken}`}>Hotel link</Link> : null}
                    </details>
                  ) : null}
                  <TripEdit trip={trip} onSave={(fields) => act({ action: "edit-trip", tripId: trip.id, ...fields })} />
                </div>
              );
            })}
            <FlightEdit flightCode={flightCode} flight={flight} onSave={(fields) => act({ action: "edit-flight", flightCode, ...fields })} />
          </article>
        );
      })}
      <section className={card}>
        <h2 className="text-sm font-semibold">Roster</h2>
        {board.roster.length === 0 ? <p className="mt-1 text-sm text-[#d5dbe6]">No one has texted in.</p> : null}
        {board.roster.map((person) => (
          <label key={person.id} className="mt-2 block text-sm">
            {person.name || person.phone}
            <select className={`${field} mt-1`} value={`${person.role}|${person.postCode}`} onChange={(event) => {
              const [role, postCode] = event.target.value.split("|");
              void act({ action: "reassign", rosterId: person.id, role, postCode });
            }}>
              {["greeter", "dispatcher", "loader", "driver", "lead"].flatMap((role) =>
                ["A", "B_HIGH", "B_LOW", "C", "ALL"].map((post) => (
                  <option key={`${role}|${post}`} value={`${role}|${post}`}>{role} · {post.replace("_", " ")}</option>
                )),
              )}
            </select>
          </label>
        ))}
      </section>
      <details className={card}>
        <summary className="min-h-11 cursor-pointer text-sm font-semibold">Change log</summary>
        <ul className="mt-2 space-y-1 text-sm text-[#d5dbe6]">
          {board.changes.map((change) => (
            <li key={change.id}>{change.actor}: {change.detail || change.action}</li>
          ))}
        </ul>
      </details>
      <div className="grid grid-cols-2 gap-1">
        <Link href={`/light/${code}/intake`} className={offBtn}>Manifest</Link>
        <Link href={`/light/${code}/setup`} className={offBtn}>Setup</Link>
        <Link href={`/light/${code}/client`} className={offBtn}>Client view</Link>
        <button type="button" className={ghostBtn} onClick={() => act({ action: "template" })}>Save template</button>
      </div>
      <p className="text-xs text-[#9aa8bd]">Flight feed: {board.provider === "manual" ? "Manual" : board.provider}. Close {clockLabel(board.program.windowClose)}.</p>
    </div>
  );
}

function statusWord(status?: string) {
  if (status === "LANDED") return "Arrived";
  if (status === "DELAYED") return "Delayed";
  if (status === "ON_TIME") return "On time";
  if (status === "CANCELLED") return "Canceled";
  return "No live feed";
}

function SentForm({ trip, onSave }: { trip: Trip; onSave: (fields: Record<string, string>) => void | Promise<void> }) {
  const [driverName, setDriverName] = useState(trip.driverName);
  const [driverPhone, setDriverPhone] = useState(trip.driverPhone);
  const [vehicleNumber, setVehicleNumber] = useState(trip.vehicleNumber);
  return (
    <form className="mt-2 grid gap-1" onSubmit={(event) => { event.preventDefault(); onSave({ driverName, driverPhone, vehicleNumber }); }}>
      <input className={field} aria-label="Driver" value={driverName} onChange={(event) => setDriverName(event.target.value)} placeholder="Driver" />
      <input className={field} aria-label="Driver phone" value={driverPhone} onChange={(event) => setDriverPhone(event.target.value)} placeholder="Phone" />
      <input className={field} aria-label="Vehicle number" value={vehicleNumber} onChange={(event) => setVehicleNumber(event.target.value)} placeholder="Bus or car #" />
      <button type="submit" className={onBtn}>Save sent</button>
    </form>
  );
}

function TripEdit({ trip, onSave }: { trip: Trip; onSave: (fields: Trip) => void | Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(trip);
  if (!open) return <button type="button" className={`${ghostBtn} mt-1 w-full`} onClick={() => setOpen(true)}>Edit party</button>;
  return (
    <form className="mt-2 grid gap-1" onSubmit={(event) => { event.preventDefault(); onSave({ ...draft }); setOpen(false); }}>
      <input className={field} aria-label="Vehicle" value={draft.vehicleLabel} onChange={(event) => setDraft({ ...draft, vehicleLabel: event.target.value })} />
      <input className={field} aria-label="Vendor" value={draft.vendor} onChange={(event) => setDraft({ ...draft, vendor: event.target.value })} />
      <input className={field} aria-label="Notes" value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
      <button className={onBtn} type="submit">Save edit</button>
    </form>
  );
}

function FlightEdit({ flightCode, flight, onSave }: { flightCode: string; flight?: Flight; onSave: (fields: Record<string, string>) => void }) {
  const [open, setOpen] = useState(false);
  const [gate, setGate] = useState(flight?.gate ?? "");
  const [baggage, setBaggage] = useState(flight?.baggage ?? "");
  const [status, setStatus] = useState(flight?.status ?? "UNKNOWN");
  const [estimatedAt, setEstimatedAt] = useState(flight?.estimatedAt || flight?.actualAt || "");
  if (!open) return <button type="button" className={`${ghostBtn} mt-2 w-full`} onClick={() => setOpen(true)}>Edit {displayFlight(flightCode)}</button>;
  return (
    <form className="mt-2 grid gap-1" onSubmit={(event) => { event.preventDefault(); onSave({ gate, baggage, status, estimatedAt }); setOpen(false); }}>
      <input className={field} aria-label="Gate" value={gate} onChange={(event) => setGate(event.target.value)} placeholder="Gate" />
      <input className={field} aria-label="Carousel" value={baggage} onChange={(event) => setBaggage(event.target.value)} placeholder="Carousel" />
      <input className={field} aria-label="Time" value={estimatedAt} onChange={(event) => setEstimatedAt(event.target.value)} placeholder="HH:MM" />
      <select className={field} aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
        <option value="UNKNOWN">No live feed</option>
        <option value="ON_TIME">On time</option>
        <option value="DELAYED">Delayed</option>
        <option value="LANDED">Arrived</option>
        <option value="CANCELLED">Canceled</option>
      </select>
      <button className={onBtn} type="submit">Save flight</button>
    </form>
  );
}
