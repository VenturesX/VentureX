"use client";

import { moneyMath, useWalk, type Tiers } from "@/lib/experience/store";

const SWITCHES: Array<[keyof Tiers, string]> = [
  ["wayfinding", "Guest wayfinding & live GPS bus map"],
  ["dashboard", "VIP client command dashboard & executive PDF"],
  ["prereg", "Airport pre-registration, flight sync & family/bag tags"],
  ["seatHold", "15-min smart seat hold & virtual boarding pass"],
];

export function OwnerApp() {
  const { state, update, reset } = useWalk();
  const { profit, margin } = moneyMath(state);
  return (
    <div className="mx-auto w-full max-w-lg space-y-3 px-3 py-3 text-white" data-testid="owner-app">
      <h1 className="text-2xl font-semibold">Big Dog admin</h1>
      <p className="text-sm text-[#d5dbe6]">Arron Molina & Marissa Molina · Venture Directors LLC · IACP 2026 Orlando</p>
      <section className="space-y-2 rounded-2xl bg-[#0c0e12] p-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9ecbff]">Feature tiers</h2>
        {SWITCHES.map(([key, label]) => (
          <button
            key={key}
            type="button"
            data-testid={`tier-${key}`}
            aria-pressed={state.tiers[key]}
            className="flex min-h-11 w-full items-center justify-between rounded-xl bg-black px-3 text-left text-sm"
            onClick={() => update({ tiers: { ...state.tiers, [key]: !state.tiers[key] } })}
          >
            <span>{label}</span>
            <span className="font-semibold">{state.tiers[key] ? "Unlocked" : "Locked"}</span>
          </button>
        ))}
      </section>
      <section className="space-y-2 rounded-2xl bg-[#0c0e12] p-3 text-sm">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9ecbff]">Sub-DMC partners</h2>
        {state.partners.map((partner) => (
          <p key={partner.name} className="flex justify-between gap-2"><span>{partner.name}</span><span>{partner.cut}</span></p>
        ))}
      </section>
      <section className="space-y-1 rounded-2xl bg-[#0c0e12] p-3" data-testid="money-tab">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9ecbff]">Money</h2>
        <Row label="Client contract" value={state.revenue} />
        <Row label="Elite carrier payout" value={state.carrier} />
        <Row label="1099 field staff" value={state.staffPay} />
        <p className="pt-1 text-lg font-semibold">Net ${profit.toLocaleString()} · {margin}% margin</p>
        <p className="text-sm" data-testid="payee">Make all checks payable to Arron Molina</p>
        <p className="text-[12px] text-[#b7c3d6]">Payee: Arron Molina / Venture Directors LLC</p>
        <button type="button" className="mt-2 h-11 w-full rounded-xl bg-white text-sm font-semibold text-black">Generate invoice</button>
      </section>
      <button
        type="button"
        data-testid="fresh-reset"
        className="h-11 w-full rounded-xl bg-[#141820] text-sm font-semibold ring-1 ring-white/15"
        onClick={() => {
          reset();
          window.alert("Sample walkthrough data cleared. IACP 2026 Route 3 curb logs stay on the clipboard.");
        }}
      >
        Reset / clear sample manifests
      </button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return <p className="flex justify-between text-sm"><span>{label}</span><span>${value.toLocaleString()}</span></p>;
}
