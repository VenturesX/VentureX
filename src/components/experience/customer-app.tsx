"use client";

import { useState } from "react";
import Link from "next/link";

const MARKETS = ["Orlando (instant baseline)", "Anaheim", "Denver", "Colorado", "Custom quote"] as const;
const MOVES = ["Airport / port meet & greet", "Convention shuttle loop", "Night event / park buyout", "Executive VIP"] as const;
const TIERS = [
  ["Tier 1 — Core operations", "Included. Vetted field staff and dispatch."],
  ["Tier 2 — Live shuttle & rider portal", "+$1,500 or per bus. Guest GPS, wayfinding, client ridership."],
  ["Tier 3 — Full VIP & airport concierge", "+$3,000 or $5/pax. Flights, family, bags, 15-min seat holds."],
] as const;

export function CustomerApp() {
  const [step, setStep] = useState(0);
  const [market, setMarket] = useState<(typeof MARKETS)[number]>("Orlando (instant baseline)");
  const [move, setMove] = useState<(typeof MOVES)[number]>(MOVES[1]);
  const [date, setDate] = useState("2026-10-26");
  const [pax, setPax] = useState("180");
  const [vehicles, setVehicles] = useState("6");
  const [stops, setStops] = useState("Residence Inn, Hilton GV, Element, SpringHill, OCCC West");
  const [tier, setTier] = useState(1);
  const [code, setCode] = useState("");
  const [program, setProgram] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [asClient, setAsClient] = useState(false);

  return (
    <div className="mx-auto w-full max-w-lg space-y-3 px-3 py-3 text-white" data-testid="customer-app">
      <p className="text-[10px] uppercase tracking-[0.18em] text-[#7eb6ff]">VentureX</p>
      <h1 className="text-2xl font-semibold leading-tight">Group Transportation, Handled.</h1>
      <div className="grid grid-cols-2 gap-1">
        <button type="button" className={step < 5 ? on : off} onClick={() => setStep(0)}>New quote</button>
        <button type="button" className={step >= 5 ? on : off} onClick={() => setStep(5)}>Live program</button>
      </div>

      {step < 5 ? (
        <section className="space-y-2 rounded-2xl border border-white/10 bg-[#0c0e12] p-3" data-testid="quote-builder">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9ecbff]">Step {Math.min(step + 1, 4)} of 4</p>
          {step === 0 ? (
            <div className="grid gap-1">
              {MARKETS.map((item) => (
                <button key={item} type="button" className={item === market ? on : off} onClick={() => setMarket(item)}>{item}</button>
              ))}
            </div>
          ) : null}
          {step === 1 ? (
            <div className="grid gap-1">
              {MOVES.map((item) => (
                <button key={item} type="button" className={item === move ? on : off} onClick={() => setMove(item)}>{item}</button>
              ))}
            </div>
          ) : null}
          {step === 2 ? (
            <div className="grid gap-2">
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-label="Date" className={field} />
              <input value={pax} onChange={(event) => setPax(event.target.value)} inputMode="numeric" aria-label="Passengers" className={field} />
              <input value={vehicles} onChange={(event) => setVehicles(event.target.value)} inputMode="numeric" aria-label="Vehicles" className={field} />
              <input value={stops} onChange={(event) => setStops(event.target.value)} aria-label="Stops" className={field} />
            </div>
          ) : null}
          {step === 3 ? (
            <div className="grid gap-1">
              {TIERS.map(([title, body], index) => (
                <button key={title} type="button" className={tier === index + 1 ? on : off} onClick={() => setTier(index + 1)}>
                  <span className="block text-sm font-semibold">{title}</span>
                  <span className="block text-[11px] font-normal text-[#d5dbe6]">{body}</span>
                </button>
              ))}
            </div>
          ) : null}
          {step === 4 ? (
            <p className="text-sm leading-snug" data-testid="quote-summary">{market}. {move}. {date}. {pax} guests, {vehicles} vehicles. Tier {tier}. {stops}</p>
          ) : null}
          <div className="grid grid-cols-2 gap-1">
            <button type="button" className={off} onClick={() => setStep((value) => Math.max(0, value - 1))}>Back</button>
            <button type="button" className={on} onClick={() => setStep((value) => Math.min(4, value + 1))}>{step === 4 ? "Request sent" : "Next"}</button>
          </div>
        </section>
      ) : (
        <section className="space-y-2 rounded-2xl border border-white/10 bg-[#0c0e12] p-3" data-testid="program-login">
          <label className="block text-xs text-[#c5d4ea]">Program access code
            <input value={code} onChange={(event) => setCode(event.target.value)} aria-label="Program code" className={`${field} mt-1`} />
          </label>
          <button type="button" data-testid="demo-code" className={off} onClick={() => { setCode("831519"); setProgram("IACP 2026 Orlando"); }}>Try IACP 2026 demo code</button>
          {program ? <p className="text-sm font-semibold">Program: {program}</p> : null}
          <button type="button" className={on} onClick={() => setProgram(code.trim() === "IACP26" || code.trim() === "831519" ? "IACP 2026 Orlando" : code.trim() ? "Code not found" : "")}>Confirm code</button>
          <label className="block text-xs text-[#c5d4ea]">Full name
            <input value={name} onChange={(event) => setName(event.target.value)} aria-label="Full name" className={`${field} mt-1`} />
          </label>
          <label className="block text-xs text-[#c5d4ea]">Phone or email
            <input value={phone} onChange={(event) => setPhone(event.target.value)} aria-label="Phone or email" className={`${field} mt-1`} />
          </label>
          <div className="grid grid-cols-3 gap-1">
            <button type="button" className={off}>Google</button>
            <button type="button" className={off}>Apple</button>
            <button type="button" className={off}>Phone</button>
          </div>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={asClient} onChange={(event) => setAsClient(event.target.checked)} className="size-5 accent-[#1E90FF]" />
            Preview as VIP client
          </label>
          <Link href={asClient ? "/guest?role=client" : "/guest?role=guest"} className={`${on} text-center`} data-testid="enter-program">Enter program</Link>
          <p className="text-[11px] leading-snug text-[#b7c3d6]">Your name is matched only to your own phone. Other passengers are never listed here.</p>
        </section>
      )}
    </div>
  );
}

const on = "flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-[#1E90FF] to-[#8B5CF6] px-2 text-sm font-semibold text-white";
const off = "flex min-h-11 items-center justify-center rounded-xl bg-[#141820] px-2 text-sm font-semibold text-white ring-1 ring-white/10";
const field = "h-11 w-full rounded-xl border border-white/15 bg-black px-3 text-base text-white";
