"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RouteMap } from "@/components/shuttle/route-map";
import { CrewBar, CurbSelect, RelayStrip } from "@/components/shuttle/crew-bar";
import { formatPhone, telHref } from "@/lib/clipboard/logic";
import { readCurb } from "@/lib/shuttle/client";
import { activeLegs, activeOrder, downstreamEtas, etasFromProgress, loopMinutes, mph, resolvedFix, stopById } from "@/lib/shuttle/motion";
import { PUCK_IDS, defaultDesk } from "@/lib/shuttle/route3";
import type { PuckLink, ShuttleDesk, ShuttleStop } from "@/lib/shuttle/types";

const ROUTE_PUCKS = PUCK_IDS.filter((id) => id.startsWith("R3"));

export function ShuttleBoard() {
  const [desk, setDesk] = useState<ShuttleDesk | null>(null);
  const [persisted, setPersisted] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const [selectedId, setSelectedId] = useState("r3-s3");
  const [panel, setPanel] = useState<null | "links" | "falcon" | "stop" | "add">(null);
  const [puckId, setPuckId] = useState("R3-01");
  const [pax, setPax] = useState("0");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function pull() {
      try {
        const response = await fetch("/api/shuttle");
        if (!response.ok) throw new Error("shuttle unavailable");
        const body = (await response.json()) as { desk: ShuttleDesk; persisted?: boolean };
        if (cancelled) return;
        setDesk(body.desk ?? defaultDesk());
        setPersisted(body.persisted !== false);
      } catch {
        if (!cancelled) {
          setDesk((current) => current ?? readLocalDesk());
          setPersisted(false);
        }
      }
    }
    void pull();
    const timer = window.setInterval(() => {
      setNow(Date.now());
      void pull();
    }, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const view = desk ?? defaultDesk();
  const order = activeOrder(view);
  const legs = activeLegs(view);
  const shift = view.mode === "chiefs" ? "night" : "morning";
  const buses = useMemo(
    () =>
      PUCK_IDS.map((id, index) => {
        const fix = resolvedFix(view, id, index, ROUTE_PUCKS.length, now);
        const link = view.links.find((item) => item.puckId === id && item.shift === shift);
        const speed = mph(fix.speedMps);
        const eta = etaLine(view, fix, index, ROUTE_PUCKS.length, now);
        return {
          id,
          lat: fix.lat,
          lng: fix.lng,
          heading: fix.heading,
          label: id,
          detail: [link?.shuttleNumber, link?.driver, link?.coachNumber ? `#${link.coachNumber}` : "", speed == null ? "" : `${speed} mph`, fix.source === "sim" ? "Loop pace" : fix.source === "checkin" ? "Snapped" : "Live", eta].filter(Boolean).join(" · "),
          source: fix.source,
        };
      }),
    [view, now, shift],
  );
  const selected = stopById(view.stops, selectedId);

  async function save(next: ShuttleDesk) {
    setDesk(next);
    writeLocalDesk(next);
    try {
      const response = await fetch("/api/shuttle", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ desk: next }),
      });
      const body = (await response.json()) as { persisted?: boolean; desk?: ShuttleDesk };
      setPersisted(body.persisted !== false);
      if (body.desk) setDesk(body.desk);
    } catch {
      setPersisted(false);
    }
  }

  async function checkIn(kind: "arrive" | "depart") {
    const link = view.links.find((item) => item.puckId === puckId && item.shift === shift);
    const response = await fetch("/api/shuttle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        puckId,
        stopId: readCurb(),
        kind,
        pax: Number(pax) || 0,
        driver: link?.driver ?? "",
        coachNumber: link?.coachNumber ?? "",
        shuttleNumber: link?.shuttleNumber ?? "",
      }),
    });
    const body = (await response.json()) as { desk?: ShuttleDesk; relay?: { text: string }; persisted?: boolean };
    if (body.desk) setDesk(body.desk);
    if (body.relay) setNotice(body.relay.text);
    setPersisted(body.persisted !== false);
  }

  return (
    <div className="mx-auto w-full max-w-lg overflow-x-hidden px-2.5 pb-10 pt-3" data-testid="shuttle-root">
      <div className="mb-3 flex items-end justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#7eb6ff]">IACP 2026 · Event {view.eventCode}</p>
          <h1 className="text-2xl font-semibold leading-tight">Route 3 live map</h1>
        </div>
        <p className="text-[10px] uppercase tracking-[0.14em] text-[#9aa6ba]" data-testid="shuttle-sync">{persisted ? "Saved" : "On this phone"}</p>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-1">
        <button type="button" data-testid="mode-loop" onClick={() => void save({ ...view, mode: "loop" })} className={modeClass(view.mode === "loop")}>Morning loop · OCCC</button>
        <button type="button" data-testid="mode-chiefs" onClick={() => void save({ ...view, mode: "chiefs" })} className={modeClass(view.mode === "chiefs")}>Chief&apos;s Night · Universal</button>
      </div>
      <RouteMap stops={view.stops} order={order} legs={legs} buses={buses} selectedId={selectedId} onSelect={setSelectedId} />
      {selected ? <StopCard stop={selected} order={view.loopOrder} onEdit={() => setPanel("stop")} /> : null}
      <div className="mt-3 space-y-3">
        <RelayStrip />
        {notice ? <p className="text-[13px] text-white" data-testid="relay-notice">{notice}</p> : null}
        <CrewBar />
        <CurbSelect />
        <section className="space-y-2 rounded-2xl border border-white/10 bg-[#0c0e12] p-2.5">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9ecbff]">Stop check-in</h2>
          <div className="grid grid-cols-[minmax(0,1fr)_5rem] gap-2">
            <select value={puckId} onChange={(event) => setPuckId(event.target.value)} className={field} data-testid="checkin-puck">
              {PUCK_IDS.map((id) => <option key={id} value={id}>{id}</option>)}
            </select>
            <input value={pax} onChange={(event) => setPax(event.target.value)} inputMode="numeric" aria-label="Passengers" className={field} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className={ghostBtn} onClick={() => void checkIn("arrive")}>Arrived</button>
            <button type="button" data-testid="depart-stop" className={primaryBtn} onClick={() => void checkIn("depart")}>Departed</button>
          </div>
        </section>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" data-testid="open-linker" className={ghostBtn} onClick={() => setPanel("links")}>Link GPS pucks</button>
          <button type="button" data-testid="open-falcon" className={ghostBtn} onClick={() => setPanel("falcon")}>EventFalcon pull</button>
          <Link href={`/shuttle/beacon?puck=${puckId}`} className={`${ghostBtn} col-span-2 text-center`} data-testid="beacon-link">Broadcast GPS beacon</Link>
        </div>
        <ul className="space-y-1">
          {buses.map((bus) => (
            <li key={bus.id} className="rounded-xl bg-[#0c0e12] px-3 py-2 text-[12px]">
              <span className="font-semibold">{bus.label}</span>
              <span className="mt-0.5 block text-[#d5dbe6]">{bus.detail}</span>
            </li>
          ))}
        </ul>
      </div>
      {panel === "links" ? (
        <LinkSheet
          desk={view}
          onClose={() => setPanel(null)}
          onSave={(links) => {
            void save({ ...view, links });
            setPanel(null);
          }}
        />
      ) : null}
      {panel === "falcon" ? (
        <FalconSheet
          eventCode={view.eventCode}
          onClose={() => setPanel(null)}
          onDone={(next, message) => {
            if (next) setDesk(next);
            setNotice(message);
            setPanel(null);
          }}
        />
      ) : null}
      {panel === "stop" && selected ? (
        <StopSheet
          stop={selected}
          onClose={() => setPanel(null)}
          onSave={(stop) => {
            void save({ ...view, stops: view.stops.map((item) => (item.id === stop.id ? stop : item)) });
            setPanel(null);
          }}
          onRemove={selected.custom ? () => {
            void save(removeStop(view, selected.id));
            setSelectedId(order[0] ?? "occw");
            setPanel(null);
          } : undefined}
        />
      ) : null}
      <button type="button" className="mt-3 text-[12px] font-semibold text-[#9ecbff]" onClick={() => setPanel("add")}>+ Add stop</button>
      <button
        type="button"
        className="ml-4 text-[12px] font-semibold text-[#9aa6ba]"
        onClick={() => {
          const fresh = defaultDesk();
          void save({ ...fresh, links: view.links, fixes: view.fixes, relays: view.relays, mode: view.mode });
        }}
      >
        Reset route geometry
      </button>
      {panel === "add" ? (
        <StopSheet
          stop={blankStop()}
          onClose={() => setPanel(null)}
          onSave={(stop) => {
            void save(insertStop(view, stop));
            setSelectedId(stop.id);
            setPanel(null);
          }}
        />
      ) : null}
    </div>
  );
}

function StopCard({ stop, order, onEdit }: { stop: ShuttleStop; order: string[]; onEdit: () => void }) {
  const index = order.indexOf(stop.id);
  return (
    <section className="mt-3 rounded-2xl border border-white/10 bg-[#0c0e12] p-3" data-testid="stop-card">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-[#9ecbff]">{stop.code}{index > 0 ? ` · Stop ${index}` : ""}</p>
          <h2 className="text-base font-semibold leading-tight">{stop.name}</h2>
        </div>
        <button type="button" onClick={onEdit} className="text-[12px] font-semibold text-[#9ecbff]">Edit</button>
      </div>
      <p className="mt-1 text-[12px] text-[#d5dbe6]">{stop.address}</p>
      <p className="mt-1 text-[12px] text-white">{stop.boarding}</p>
      {stop.staffName ? (
        <a href={telHref(stop.staffPhone)} className="mt-2 block text-sm font-semibold text-[#d7e8ff]">{stop.staffName} · {formatPhone(stop.staffPhone)}</a>
      ) : null}
      {stop.walkOvers.length ? (
        <p className="mt-2 text-[12px] text-[#c5d4ea]">Walk-over: {stop.walkOvers.map((item) => item.name).join(" · ")}</p>
      ) : null}
    </section>
  );
}

function LinkSheet({ desk, onClose, onSave }: { desk: ShuttleDesk; onClose: () => void; onSave: (links: PuckLink[]) => void }) {
  const [shift, setShift] = useState<PuckLink["shift"]>(desk.mode === "chiefs" ? "night" : "morning");
  const [links, setLinks] = useState(desk.links);
  const visible = links.filter((link) => link.shift === shift);
  function update(puckId: string, patch: Partial<PuckLink>) {
    setLinks((current) => current.map((link) => (link.puckId === puckId && link.shift === shift ? { ...link, ...patch } : link)));
  }
  return (
    <Sheet title="Link GPS pucks & bus check-in" onClose={onClose}>
      <div className="mb-3 grid grid-cols-2 gap-1">
        <button type="button" className={modeClass(shift === "morning")} onClick={() => setShift("morning")}>Mon 6:30 AM–11:30 AM</button>
        <button type="button" className={modeClass(shift === "night")} onClick={() => setShift("night")}>Chief&apos;s Night 6 PM–12 AM</button>
      </div>
      <div className="max-h-[55dvh] space-y-3 overflow-y-auto pr-1">
        {visible.map((link) => (
          <fieldset key={`${link.shift}-${link.puckId}`} className="space-y-2 rounded-xl border border-white/10 p-2">
            <legend className="px-1 text-sm font-semibold">{link.puckId}</legend>
            <div className="grid grid-cols-2 gap-2">
              <input value={link.shuttleNumber} onChange={(event) => update(link.puckId, { shuttleNumber: event.target.value })} placeholder="Shuttle # 3-1" aria-label={`${link.puckId} shuttle`} className={field} />
              <input value={link.carrier} onChange={(event) => update(link.puckId, { carrier: event.target.value })} placeholder="Carrier, Mears" aria-label={`${link.puckId} carrier`} className={field} />
              <input value={link.coachNumber} onChange={(event) => update(link.puckId, { coachNumber: event.target.value })} placeholder="Coach # 9601" aria-label={`${link.puckId} coach`} className={field} />
              <input value={link.driver} onChange={(event) => update(link.puckId, { driver: event.target.value })} placeholder="Driver" aria-label={`${link.puckId} driver`} className={field} />
              <input value={link.phone} onChange={(event) => update(link.puckId, { phone: event.target.value })} placeholder="Driver cell" aria-label={`${link.puckId} phone`} inputMode="tel" className={field} />
              {link.phone ? <a href={telHref(link.phone)} className="col-span-2 text-sm font-semibold text-[#9ecbff]">Call {formatPhone(link.phone)}</a> : null}
              <input value={link.breakText} onChange={(event) => update(link.puckId, { breakText: event.target.value })} placeholder="Break window" aria-label={`${link.puckId} break`} className={field} />
              <input value={link.checkIn} onChange={(event) => update(link.puckId, { checkIn: event.target.value })} placeholder="Check-in" aria-label={`${link.puckId} check-in`} className={field} />
              <input value={link.release} onChange={(event) => update(link.puckId, { release: event.target.value })} placeholder="Release" aria-label={`${link.puckId} release`} className={field} />
            </div>
          </fieldset>
        ))}
      </div>
      <button type="button" className={`${primaryBtn} mt-3`} onClick={() => onSave(links)}>Save puck links</button>
    </Sheet>
  );
}

function FalconSheet({ eventCode, onClose, onDone }: { eventCode: string; onClose: () => void; onDone: (desk: ShuttleDesk | null, message: string) => void }) {
  const [code, setCode] = useState(eventCode);
  const [url, setUrl] = useState("");
  const [payload, setPayload] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function pull() {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/shuttle/falcon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventCode: code,
          url,
          payload: payload.trim() ? JSON.parse(payload) : undefined,
        }),
      });
      const body = (await response.json()) as { error?: string; note?: string; desk?: ShuttleDesk };
      if (!response.ok) throw new Error(body.error ?? "Pull failed");
      onDone(body.desk ?? null, body.note ?? "EventFalcon feed read.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pull failed");
    } finally {
      setPending(false);
    }
  }
  return (
    <Sheet title="EventFalcon live pull" onClose={onClose}>
      <p className="rounded-xl bg-amber-500/15 px-3 py-2 text-[12px] leading-snug text-amber-100" data-testid="falcon-warning">
        Read-only. EventFalcon locks PaxCountApp to one device through LoginCodeAuth. This board will not sign in, will not send that cookie, and will not kick the phone you already have open.
      </p>
      <label className="mt-3 block text-xs text-[#c5d4ea]">
        Event code
        <input value={code} onChange={(event) => setCode(event.target.value)} className={`${field} mt-1`} />
      </label>
      <label className="mt-3 block text-xs text-[#c5d4ea]">
        View URL
        <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://eta-main.eventfalcon.com/View/…" className={`${field} mt-1`} />
      </label>
      <label className="mt-3 block text-xs text-[#c5d4ea]">
        JSON feed
        <textarea value={payload} onChange={(event) => setPayload(event.target.value)} rows={5} placeholder='{"vehicleData":[{"vehicleName":"R3-01","centerPoint":[28.41,-81.47]}]}' className={`${field} mt-1 h-auto py-2`} />
      </label>
      {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
      <button type="button" className={`${primaryBtn} mt-3`} disabled={pending} onClick={() => void pull()}>{pending ? "Reading…" : "Read-only pull"}</button>
    </Sheet>
  );
}

function StopSheet({
  stop,
  onClose,
  onSave,
  onRemove,
}: {
  stop: ShuttleStop;
  onClose: () => void;
  onSave: (stop: ShuttleStop) => void;
  onRemove?: () => void;
}) {
  const [draft, setDraft] = useState(stop);
  return (
    <Sheet title={stop.name ? "Edit stop" : "Add stop"} onClose={onClose}>
      <form
        className="space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!draft.name.trim()) return;
          onSave({ ...draft, name: draft.name.trim(), lat: Number(draft.lat), lng: Number(draft.lng) });
        }}
      >
        <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Hotel name" aria-label="Stop name" className={field} />
        <input value={draft.address} onChange={(event) => setDraft({ ...draft, address: event.target.value })} placeholder="Address" aria-label="Address" className={field} />
        <div className="grid grid-cols-2 gap-2">
          <input value={String(draft.lat)} onChange={(event) => setDraft({ ...draft, lat: Number(event.target.value) })} aria-label="Latitude" className={field} />
          <input value={String(draft.lng)} onChange={(event) => setDraft({ ...draft, lng: Number(event.target.value) })} aria-label="Longitude" className={field} />
        </div>
        <input value={draft.boarding} onChange={(event) => setDraft({ ...draft, boarding: event.target.value })} placeholder="Boarding note" aria-label="Boarding" className={field} />
        <input value={draft.staffName} onChange={(event) => setDraft({ ...draft, staffName: event.target.value })} placeholder="Curb staff" aria-label="Staff" className={field} />
        <input value={draft.staffPhone} onChange={(event) => setDraft({ ...draft, staffPhone: event.target.value })} placeholder="Staff phone" aria-label="Staff phone" className={field} />
        <button type="submit" className={primaryBtn}>Save stop</button>
        {onRemove ? <button type="button" className="h-11 w-full text-sm font-semibold text-rose-300" onClick={onRemove}>Remove stop</button> : null}
      </form>
    </Sheet>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75" onClick={onClose}>
      <div role="dialog" aria-label={title} className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/10 bg-[#101218] p-4 pb-6" onClick={(event) => event.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-10 place-items-center rounded-full bg-white/10">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function insertStop(desk: ShuttleDesk, stop: ShuttleStop): ShuttleDesk {
  const night = desk.mode === "chiefs";
  const order = [...(night ? desk.nightOrder : desk.loopOrder), stop.id];
  const legs = [...(night ? desk.nightLegs : desk.loopLegs)];
  const closing = legs[legs.length - 1];
  if (closing) {
    legs.splice(legs.length - 1, 0, { from: closing.from, to: stop.id, minutes: 5 });
    legs[legs.length - 1] = { ...closing, from: stop.id };
  }
  return night
    ? { ...desk, stops: [...desk.stops, stop], nightOrder: order, nightLegs: legs }
    : { ...desk, stops: [...desk.stops, stop], loopOrder: order, loopLegs: legs };
}

function removeStop(desk: ShuttleDesk, id: string): ShuttleDesk {
  return {
    ...desk,
    stops: desk.stops.filter((stop) => stop.id !== id),
    loopOrder: desk.loopOrder.filter((stopId) => stopId !== id),
    nightOrder: desk.nightOrder.filter((stopId) => stopId !== id),
    loopLegs: desk.loopLegs.filter((leg) => leg.from !== id && leg.to !== id),
    nightLegs: desk.nightLegs.filter((leg) => leg.from !== id && leg.to !== id),
  };
}

function blankStop(): ShuttleStop {
  return {
    id: `custom-${Date.now().toString(36)}`,
    code: "NEW",
    name: "",
    address: "",
    lat: 28.41,
    lng: -81.46,
    boarding: "",
    staffName: "",
    staffPhone: "",
    walkOvers: [],
    kind: "stop",
    custom: true,
  };
}

function readLocalDesk() {
  try {
    const raw = localStorage.getItem("vd.shuttle.desk");
    if (!raw) return defaultDesk();
    return JSON.parse(raw) as ShuttleDesk;
  } catch {
    return defaultDesk();
  }
}

function writeLocalDesk(desk: ShuttleDesk) {
  try {
    localStorage.setItem("vd.shuttle.desk", JSON.stringify(desk));
  } catch {
    /* private mode */
  }
}

function etaLine(desk: ShuttleDesk, fix: { source: string; stopId: string | null }, index: number, count: number, now: number) {
  const legs = activeLegs(desk);
  const etas = fix.source === "sim" && !fix.stopId
    ? etasFromProgress(desk.stops, legs, (now / 60000 / loopMinutes(legs) + index / Math.max(1, count)) % 1)
    : fix.stopId
      ? downstreamEtas(desk.stops, legs, fix.stopId)
      : [];
  return etas.slice(0, 2).map((eta) => {
    const stop = stopById(desk.stops, eta.stopId);
    const name = stop ? stop.name.split(" ").slice(0, 2).join(" ") : eta.stopId;
    return `${name} ~${eta.minutes}m`;
  }).join(" · ");
}

function modeClass(active: boolean) {
  return active
    ? "min-h-11 rounded-xl bg-gradient-to-r from-[#1E90FF] to-[#8B5CF6] px-2 text-[12px] font-semibold leading-tight text-white"
    : "min-h-11 rounded-xl bg-[#141820] px-2 text-[12px] font-semibold leading-tight text-[#d5dbe6] ring-1 ring-white/10";
}

const field = "h-11 w-full rounded-xl border border-white/15 bg-black px-3 text-base text-white outline-none";
const primaryBtn = "h-12 w-full rounded-xl bg-gradient-to-r from-[#1E90FF] to-[#8B5CF6] text-sm font-semibold text-white";
const ghostBtn = "flex h-11 items-center justify-center rounded-xl bg-[#141820] px-2 text-[13px] font-semibold text-white ring-1 ring-white/15";
