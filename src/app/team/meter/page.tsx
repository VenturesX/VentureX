"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProgressRing } from "@/components/premium/progress-ring";
import { ScreenSkeleton } from "@/components/premium/skeleton";

type Day = {
  program: { name: string; timezone?: string; windowClose?: string };
  count?: { kind: "airport" | "shuttle"; moved: number; total: number; label: string };
  shuttle?: { movedIn: number; movedOut: number; finalCount: number };
  flightsMet?: number;
  lines: unknown[];
};

export default function MeterPage() {
  const [day, setDay] = useState<Day | null>(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const code = sessionStorage.getItem("vd-day-code") || "";
    const timer = window.setTimeout(() => {
      void fetch(`/api/team/day?code=${encodeURIComponent(code)}`).then(async (response) => {
        const json = (await response.json()) as Day & { error?: string };
        if (!response.ok) setError(json.error || "Open your day first.");
        else setDay(json);
      }).catch(() => setError("Open your day first."));
    }, 0);
    const pulse = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => { window.clearTimeout(timer); window.clearInterval(pulse); };
  }, []);

  if (error) {
    return <div className="mx-auto max-w-lg px-4 py-8 text-white"><Link href="/team/director" className="text-sm text-[#4da3ff]">Back to my day</Link><p className="mt-4">{error}</p></div>;
  }
  if (!day) return <ScreenSkeleton />;
  const airport = day.count?.kind !== "shuttle";
  const close = minutesUntil(day.program.windowClose || "", day.program.timezone || "America/New_York", now);
  return (
    <div className="mx-auto max-w-lg space-y-4 overflow-x-hidden px-4 pb-16 pt-6 text-white" data-testid="guest-o-meter">
      <Link href="/team/director" className="text-sm font-semibold text-[#4da3ff]">Back to my day</Link>
      <h1 className="text-3xl font-bold">Guest-O-Meter</h1>
      <p className="text-sm text-vd-muted">{day.program.name}</p>
      {airport ? (
        <section className="space-y-3" data-testid="meter-airport">
          <ProgressRing done={day.flightsMet ?? 0} total={Math.max(day.lines.length, day.flightsMet ?? 0)} label="Flights met" />
          <ProgressRing done={day.count?.moved ?? 0} total={Math.max(day.count?.total ?? 0, day.count?.moved ?? 0)} label="Guests met" />
          <article className="rounded-tile bg-vd-elevated p-5 ring-1 ring-white/10">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#ffb340]">Window close</p>
            <p className="mt-2 text-4xl font-bold tabular-nums">{close == null ? "—" : close < 0 ? "Closed" : `${close} min`}</p>
          </article>
        </section>
      ) : null}
      <section className="space-y-3" data-testid="meter-shuttle">
        <h2 className="text-xl font-bold">{airport ? "Shuttle loops" : "Shuttle"}</h2>
        <ProgressRing done={day.shuttle?.movedIn ?? 0} total={Math.max(day.shuttle?.finalCount ?? 0, day.shuttle?.movedIn ?? 0)} label="Guests moved in" />
        <ProgressRing done={day.shuttle?.movedOut ?? 0} total={Math.max(day.shuttle?.finalCount ?? 0, day.shuttle?.movedOut ?? 0)} label="Guests moved out" />
        <article className="rounded-tile bg-vd-elevated p-5 ring-1 ring-white/10">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#4da3ff]">Final guest count</p>
          <p className="mt-2 text-5xl font-bold tabular-nums">{day.shuttle?.finalCount ?? 0}</p>
        </article>
      </section>
    </div>
  );
}

function minutesUntil(close: string, timeZone: string, now: number) {
  const match = close.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(now));
  const hour = Number(parts.find((part) => part.type === "hour")?.value || "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value || "0");
  return Number(match[1]) * 60 + Number(match[2]) - (hour * 60 + minute);
}
