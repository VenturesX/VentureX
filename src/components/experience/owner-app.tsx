"use client";

import { Home, KeyRound, Radio, Wallet } from "lucide-react";
import { LightAdmin } from "@/components/light/admin-panel";
import { DeskGrid } from "@/components/premium/desk-grid";
import { HeroCard } from "@/components/premium/hero-card";
import { PillNav } from "@/components/premium/pill-nav";
import { ProgressRing } from "@/components/premium/progress-ring";
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
    <div className="mx-auto w-full max-w-lg space-y-4 px-4 pb-28 pt-4 text-white" data-testid="owner-app">
      <HeroCard kicker="Owner" title="Big Dog admin" line="IACP 2026 Orlando · Today's shift" />
      <DeskGrid hrefFor={(key) => ({ manifest: "/admin", flights: "/team/director", dispatch: "/team/dispatch", clipboard: "/team/clipboard", shuttle: "/shuttle", drive: "/drive" }[key])} />
      <ProgressRing done={38} total={52} label="guests picked up" sample />
      <h2 className="text-2xl font-bold">Big Dog admin</h2>
      <p className="text-sm text-vd-muted">Arron Molina & Marissa Molina · Venture Directors LLC · IACP 2026 Orlando</p>
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
      <section id="money" className="space-y-1 rounded-card bg-vd-card p-4 ring-1 ring-white/10" data-testid="money-tab">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9ecbff]">Money</h2>
        <Row label="Client contract" value={state.revenue} />
        <Row label="Elite carrier payout" value={state.carrier} />
        <Row label="1099 field staff" value={state.staffPay} />
        <p className="pt-1 text-lg font-semibold">Net ${profit.toLocaleString()} · {margin}% margin</p>
        <p className="text-sm" data-testid="payee">Make all checks payable to Arron Molina</p>
        <p className="text-[12px] text-[#b7c3d6]">Payee: Arron Molina / Venture Directors LLC</p>
        <button type="button" className="mt-2 h-11 w-full rounded-xl bg-white text-sm font-semibold text-black">Generate invoice</button>
      </section>
      <LightAdmin />
      <PillNav
        label="Owner"
        items={[
          { id: "home", label: "Home", icon: <Home />, href: "/owner", active: true },
          { id: "dispatch", label: "Dispatch", icon: <Radio />, href: "/team/dispatch" },
          { id: "money", label: "Money", icon: <Wallet />, href: "#money" },
          { id: "more", label: "More", icon: <KeyRound />, href: "/team" },
        ]}
      />
      <button
        type="button"
        data-testid="fresh-reset"
        className="h-11 w-full rounded-full bg-[#1c1c1e] text-sm font-semibold ring-1 ring-white/15"
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
