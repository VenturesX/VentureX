"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { telHref } from "@/lib/clipboard/logic";
import { readCurb, subscribeCurb, writeCurb } from "@/lib/shuttle/client";
import { CURB_CHOICES, SUPERVISORS } from "@/lib/shuttle/route3";
import type { Relay } from "@/lib/shuttle/types";

export function CrewBar() {
  return (
    <div className="flex flex-wrap gap-1.5" data-testid="supervisor-bar">
      {SUPERVISORS.map((person) => (
        <a
          key={person.phone}
          href={telHref(person.phone)}
          className="min-h-10 rounded-full bg-[#141820] px-3 py-1 text-[12px] leading-tight text-white ring-1 ring-white/15"
        >
          <span className="block font-semibold">{person.name}</span>
          <span className="block text-[10px] text-[#c5d4ea]">{person.role} · {person.phone}</span>
        </a>
      ))}
    </div>
  );
}

export function CurbSelect() {
  const curb = useSyncExternalStore(subscribeCurb, readCurb, () => "r3-s3");
  return (
    <label className="block text-[11px] text-[#c5d4ea]">
      Logging from
      <select
        data-testid="curb-select"
        value={curb}
        onChange={(event) => {
          writeCurb(event.target.value);
        }}
        className="mt-1 h-11 w-full rounded-xl border border-white/15 bg-black px-3 text-sm font-medium text-white"
      >
        {CURB_CHOICES.map((choice) => (
          <option key={choice.id} value={choice.id}>
            {choice.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function RelayStrip() {
  const [lines, setLines] = useState<Relay[]>([]);
  useEffect(() => {
    let cancelled = false;
    async function pull() {
      try {
        const response = await fetch("/api/shuttle");
        if (!response.ok) return;
        const body = (await response.json()) as { desk?: { relays?: Relay[] } };
        if (!cancelled) setLines((body.desk?.relays ?? []).slice(0, 2));
      } catch {
        /* The sheet stays usable when the map feed is quiet. */
      }
    }
    void pull();
    const timer = window.setInterval(() => void pull(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);
  if (!lines.length) return null;
  return (
    <div className="space-y-1 rounded-xl border border-[#1E90FF]/40 bg-[#071018] px-3 py-2" data-testid="relay-banner">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9ecbff]">Incoming bus relay</p>
      {lines.map((relay) => (
        <p key={relay.id} className="text-[13px] leading-snug text-white">{relay.text}</p>
      ))}
    </div>
  );
}
