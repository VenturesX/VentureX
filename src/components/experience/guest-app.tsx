"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useWalk } from "@/lib/experience/store";

const HOTELS = [
  ["Residence Inn SeaWorld", "Main entrance. Donna is on the curb. Headway 15–20 min."],
  ["Hilton Grand Vacations", "Board at I-Ride trolley stop G16 on Westwood Blvd, outside the gate."],
  ["Element Orlando", "Main entrance. Aaron is on the curb. Walk-over from Aloft next door."],
  ["SpringHill Suites", "Near the main entrance. Marissa is on the curb. Fairfield, TownePlace, and Homewood walk over."],
  ["OCCC West", "West Building hub, 9800 International Dr. Buses start and end here."],
] as const;

export function GuestApp() {
  const params = useSearchParams();
  const role = params.get("role") === "client" ? "client" : "guest";
  const { state } = useWalk();
  const [tab, setTab] = useState<"board" | "hold" | "flight">("board");
  const [hotel, setHotel] = useState(0);
  const [hold, setHold] = useState<"none" | "held" | "curb">("none");
  const [seconds, setSeconds] = useState(180);
  const [family, setFamily] = useState(0);
  const [bags, setBags] = useState(0);
  const [seats, setSeats] = useState(0);
  const [gear, setGear] = useState(0);
  const [openFamily, setOpenFamily] = useState(false);
  const [openBags, setOpenBags] = useState(false);
  const note = useMemo(() => HOTELS[hotel][1], [hotel]);

  if (role === "client" && state.tiers.dashboard) {
    return (
      <div className="mx-auto w-full max-w-lg space-y-3 px-3 py-3 text-white" data-testid="client-dashboard">
        <h1 className="text-2xl font-semibold">IACP 2026 Orlando</h1>
        <p className="text-sm text-[#d5dbe6]">VIP client command. Code 831519.</p>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Moved" value="554" />
          <Stat label="Registered" value="142 / 180" />
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[79%] bg-gradient-to-r from-[#1E90FF] to-[#8B5CF6]" /></div>
        <p className="rounded-2xl border border-white/10 bg-[#0c0e12] p-3 text-sm">Live map: Route 3 buses between Residence Inn and OCCC West. Hotel counts update as curb staff send each bus.</p>
        <button type="button" className="h-11 w-full rounded-xl bg-white text-sm font-semibold text-black">Executive summary</button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-3 px-3 py-3 text-white" data-testid="guest-app">
      <h1 className="text-2xl font-semibold">IACP 2026 Orlando</h1>
      <div className="grid grid-cols-3 gap-1">
        <button type="button" className={tab === "board" ? on : off} onClick={() => setTab("board")}>Where to board</button>
        <button type="button" className={tab === "hold" ? on : off} onClick={() => setTab("hold")} disabled={!state.tiers.seatHold}>Hold seat</button>
        <button type="button" className={tab === "flight" ? on : off} onClick={() => setTab("flight")} disabled={!state.tiers.prereg}>Pre-register</button>
      </div>
      {tab === "board" && state.tiers.wayfinding ? (
        <section className="space-y-2" data-testid="boarding">
          {HOTELS.map(([name], index) => (
            <button key={name} type="button" className={index === hotel ? on : off} onClick={() => setHotel(index)}>{name}</button>
          ))}
          <p className="rounded-2xl bg-[#0c0e12] p-3 text-lg font-semibold leading-snug">{note}</p>
          <p className="text-sm text-[#d5dbe6]">Next bus ETA about 6 min. Loop pace until a puck is linked.</p>
        </section>
      ) : null}
      {tab === "board" && !state.tiers.wayfinding ? <Locked /> : null}
      {tab === "hold" ? (
        <section className="space-y-2" data-testid="seat-hold">
          {hold === "none" ? <button type="button" className={on} onClick={() => setHold("held")}>Hold seat on next bus</button> : null}
          {hold === "held" ? (
            <>
              <p className="text-center text-4xl font-semibold tabular-nums">{seconds}s</p>
              <p className="text-center text-sm">Check in at the curb at least 3 minutes before the bus leaves, or the seat goes to standby.</p>
              <button type="button" className={on} onClick={() => { setHold("curb"); setSeconds(0); }}>I&apos;m at the curb</button>
            </>
          ) : null}
          {hold === "curb" ? <p className="text-sm font-semibold">Checked in. Stay on the curb.</p> : null}
        </section>
      ) : null}
      {tab === "flight" ? (
        <section className="space-y-2" data-testid="prereg">
          <p className="text-sm">Client-approved flights: DL 1098, AA 2144, or enter your own number.</p>
          <input aria-label="Flight number" placeholder="Flight number" className="h-11 w-full rounded-xl border border-white/15 bg-black px-3" />
          <button type="button" className={off} onClick={() => setOpenFamily((value) => !value)}>+ Add family / guests</button>
          {openFamily ? <Stepper label="Extra guests" value={family} setValue={setFamily} max={3} /> : null}
          <button type="button" className={off} onClick={() => setOpenBags((value) => !value)}>+ Add bags & gear</button>
          {openBags ? (
            <div className="space-y-2">
              <Stepper label="Checked bags" value={bags} setValue={setBags} />
              <Stepper label="Car seats" value={seats} setValue={setSeats} />
              <Stepper label="Strollers / wheelchairs" value={gear} setValue={setGear} />
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-[#0c0e12] p-3"><p className="text-[10px] uppercase tracking-[0.14em] text-[#9ecbff]">{label}</p><p className="text-2xl font-semibold">{value}</p></div>;
}
function Locked() {
  return <p className="rounded-xl bg-[#141820] p-3 text-sm">This feature is locked for this program.</p>;
}
function Stepper({ label, value, setValue, max = 9 }: { label: string; value: number; setValue: (n: number) => void; max?: number }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-black px-3 py-2">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" className="grid size-11 place-items-center rounded-lg bg-[#141820]" onClick={() => setValue(Math.max(0, value - 1))}>−</button>
        <span className="w-6 text-center font-semibold">{value}</span>
        <button type="button" className="grid size-11 place-items-center rounded-lg bg-[#141820]" onClick={() => setValue(Math.min(max, value + 1))}>+</button>
      </div>
    </div>
  );
}
const on = "flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-[#1E90FF] to-[#8B5CF6] px-2 text-center text-[12px] font-semibold";
const off = "flex min-h-11 items-center justify-center rounded-xl bg-[#141820] px-2 text-center text-[12px] font-semibold ring-1 ring-white/10";
