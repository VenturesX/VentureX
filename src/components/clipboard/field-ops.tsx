"use client";

import type { ClipboardDay, DispatchRun, IngressStop } from "@/lib/clipboard/types";
import { departureCopyText, driverTallies, falconBlocked, ingressMath, pendingRuns, returnNumber, siteCodeFromBusPuck } from "@/lib/clipboard/logic";

export function PhoneToggle({ withPhones, onChange }: { withPhones: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="grid grid-cols-2 gap-1" data-testid="phone-toggle">
      <button type="button" aria-pressed={!withPhones} onClick={() => onChange(false)} className={toggleClass(!withPhones)}>No phones</button>
      <button type="button" aria-pressed={withPhones} onClick={() => onChange(true)} className={toggleClass(withPhones)}>With phones</button>
    </div>
  );
}

export function BatchPanel({ day, onSync }: { day: ClipboardDay; onSync: () => void }) {
  const pending = pendingRuns(day);
  if (!day.runs.length) return null;
  return (
    <section className="space-y-2 rounded-2xl border border-white/10 bg-[#0c0e12] p-2.5" data-testid="batch-panel">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9ecbff]" data-testid="pending-badge">Pending ({pending.length})</p>
        <button type="button" data-testid="batch-sync" disabled={!pending.length} onClick={onSync} className="h-10 rounded-xl bg-white px-3 text-[12px] font-semibold text-black disabled:opacity-40">
          Mark Batch Synced ({pending.length})
        </button>
      </div>
      {pending.length ? (
        <ul className="space-y-1">
          {pending.map((run) => {
            const blocked = falconBlocked(run, day);
            const slot = siteCodeFromBusPuck(run.busPuck) || "no slot";
            const count = run.paxUnknown ? "--" : `${run.pax} pax`;
            return (
              <li key={run.id} className="text-[12px] leading-snug text-[#e7edf6]">
                {slot} · {run.timeLabel} · {count}
                {blocked ? " · EventFalcon form can't take this" : ""}
                {run.pax === 0 || run.paxUnknown ? " · 0 pax" : ""}
                {!siteCodeFromBusPuck(run.busPuck) && day.mode !== "special" ? " · Fill-in (no puck)" : ""}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-[12px] text-[#b7c3d6]">Every run in this batch is marked synced.</p>
      )}
    </section>
  );
}

export function IngressCard({
  day,
  onCount,
  onOverage,
}: {
  day: ClipboardDay;
  onCount: (id: string, count: number) => void;
  onOverage: (enabled: boolean) => void;
}) {
  const math = ingressMath(day);
  return (
    <section className="space-y-2 rounded-2xl border border-[#1E90FF]/40 bg-[#071018] p-2.5" data-testid="ingress-card">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9ecbff]">Ingress summary</h2>
      <ul className="space-y-2">
        {day.ingress.map((stop) => (
          <li key={stop.id} className="grid grid-cols-[minmax(0,1fr)_5.5rem] items-center gap-2">
            <span className="text-sm">{stop.name}{stop.staffed ? "" : " · no staff"}</span>
            {stop.staffed ? (
              <input
                inputMode="numeric"
                aria-label={`${stop.name} count`}
                value={String(stop.count)}
                onChange={(event) => onCount(stop.id, Math.max(0, Number(event.target.value) || 0))}
                className="h-10 rounded-lg border border-white/15 bg-black px-2 text-right font-mono"
              />
            ) : (
              <span className="text-right text-sm font-semibold">{day.overageEnabled ? `Est. ${math.overage}` : stop.count}</span>
            )}
          </li>
        ))}
      </ul>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input type="checkbox" checked={day.overageEnabled} onChange={(event) => onOverage(event.target.checked)} className="size-6 accent-[#1E90FF]" />
        Estimate unstaffed overage from returns
      </label>
      <p className="text-sm font-semibold" data-testid="ingress-total">
        Total Ingress (In): {math.staffed} + Est. {math.overage} ({math.total} pax)
      </p>
    </section>
  );
}

export function EgressFooter({ day }: { day: ClipboardDay }) {
  const math = ingressMath(day);
  const tallies = driverTallies(day);
  return (
    <div className="space-y-2" data-testid="egress-footer">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {tallies.map((item) => (
          <p key={`${item.bus}-${item.driver}`} className="shrink-0 rounded-full bg-[#141820] px-3 py-1 text-[12px] ring-1 ring-white/10">
            {item.bus} {item.driver}: {item.runs} {item.runs === 1 ? "run" : "runs"} ({item.pax} pax)
          </p>
        ))}
      </div>
      <p className="rounded-xl bg-black px-3 py-2 text-sm font-semibold leading-snug">
        INGRESS: {math.total} · RETURNED: {math.returned} ({math.runs} runs) · REMAINING: {math.remaining}
      </p>
    </div>
  );
}

export function egressPax(run: DispatchRun) {
  return run.paxUnknown ? "--" : String(run.pax);
}

export function egressRunLabel(runs: DispatchRun[], index: number) {
  return `#${returnNumber(runs, index)}`;
}

export function copyLine(day: ClipboardDay, run: DispatchRun) {
  return departureCopyText(run, day);
}

export type { IngressStop };

function toggleClass(active: boolean) {
  return active
    ? "h-10 rounded-lg bg-gradient-to-r from-[#1E90FF] to-[#8B5CF6] text-[12px] font-semibold text-white"
    : "h-10 rounded-lg bg-[#141820] text-[12px] font-semibold text-[#d5dbe6] ring-1 ring-white/10";
}
