"use client";

import { useState } from "react";

const STOPS = [
  ["Residence Inn SeaWorld", 28.405937, -81.475356, "Main entrance. Stage clear of the porte-cochere."],
  ["Hilton Grand Vacations", 28.405978, -81.471135, "I-Ride trolley stop G16 on Westwood Blvd."],
  ["Element Orlando", 28.407203, -81.454832, "Main entrance. Do not block the Aloft drive."],
  ["SpringHill Suites", 28.409047, -81.454184, "Near the main entrance, International Drive side."],
  ["OCCC West", 28.424724, -81.469196, "West Building bus loop. End of the hotel loop."],
];

export function DriverApp() {
  const [tab, setTab] = useState<"gps" | "board">("gps");
  const [bus, setBus] = useState("241 / R3-01");
  const [live, setLive] = useState(false);
  const [stop, setStop] = useState(0);
  const [pax, setPax] = useState(0);
  const [banner, setBanner] = useState("");
  const [bid, setBid] = useState<"open" | "accepted" | "passed">("open");
  const here = STOPS[stop];
  const next = STOPS[(stop + 1) % STOPS.length];
  const maps = `https://www.google.com/maps/dir/?api=1&destination=${here[1]},${here[2]}&travelmode=driving`;
  return (
    <div className="mx-auto w-full max-w-lg space-y-3 px-3 py-3 text-white" data-testid="driver-app">
      {banner ? <p className="rounded-xl bg-amber-400 px-3 py-3 text-center text-lg font-semibold text-black" data-testid="driver-banner">{banner}</p> : null}
      <div className="grid grid-cols-2 gap-1">
        <button type="button" className={tab === "gps" ? on : off} onClick={() => setTab("gps")}>Street GPS</button>
        <button type="button" className={tab === "board" ? on : off} onClick={() => setTab("board")}>Elite load board</button>
      </div>
      {tab === "gps" ? (
        <section className="space-y-3" data-testid="driver-gps">
          {!live ? (
            <>
              <select value={bus} onChange={(event) => setBus(event.target.value)} aria-label="Bus puck" className="h-14 w-full rounded-2xl border border-white/15 bg-black px-3 text-lg">
                <option>241 / R3-01</option>
                <option>219 / R3-04</option>
                <option>P3128 / R3-02</option>
              </select>
              <button type="button" data-testid="start-run" className="h-16 w-full rounded-2xl bg-gradient-to-r from-[#1E90FF] to-[#8B5CF6] text-xl font-semibold" onClick={() => setLive(true)}>Start run (GPS on)</button>
            </>
          ) : (
            <>
              <p className="text-sm text-[#9ecbff]">{bus}</p>
              <h1 className="text-3xl font-semibold leading-tight">Stop {stop + 1}: {here[0]}</h1>
              <p className="text-lg leading-snug">Next: {next[0]}</p>
              <p className="rounded-2xl bg-white p-4 text-xl font-semibold leading-snug text-black">{here[3]}</p>
              <a href={maps} className="flex h-12 items-center justify-center rounded-xl bg-[#141820] text-sm font-semibold ring-1 ring-white/15">Open Google Maps to bus loop pin</a>
              <div className="grid grid-cols-4 gap-1">
                <button type="button" className={off} onClick={() => setPax(0)}>0</button>
                <button type="button" className={off} onClick={() => setPax(5)}>1–5</button>
                <button type="button" className={off} onClick={() => setPax((value) => value + 1)}>+1</button>
                <button type="button" className={off} onClick={() => setPax((value) => value + 5)}>+5</button>
              </div>
              <p className="text-center text-4xl font-semibold tabular-nums" data-testid="driver-pax">{pax}</p>
              <button type="button" data-testid="confirm-stop" className="h-14 w-full rounded-2xl bg-white text-lg font-semibold text-black" onClick={() => { setStop((value) => (value + 1) % STOPS.length); setPax(0); }}>Parked · confirm & continue</button>
              <div className="grid grid-cols-2 gap-1">
                <button type="button" className={off} onClick={() => setBanner("ON BREAK: 9:30–11:00 AM")}>Break banner</button>
                <button type="button" className={off} onClick={() => setBanner("RELEASED FROM ROUTE")}>Release banner</button>
              </div>
            </>
          )}
        </section>
      ) : (
        <section className="space-y-2 rounded-2xl bg-[#0c0e12] p-3" data-testid="load-board">
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#9ecbff]">Elite Bus Company</p>
          <h2 className="text-xl font-semibold">IACP Route 3 · 6 coaches</h2>
          <p className="text-sm text-[#d5dbe6]">Orlando baseline. Offer closes in 18:00. Residence Inn loop to OCCC West, Mon 6:30 AM.</p>
          <p className="text-sm">Status: {bid}</p>
          <button type="button" className={on} onClick={() => setBid("accepted")}>Accept contract (Elite priority)</button>
          <button type="button" className={off} onClick={() => setBid("passed")}>Pass to carrier pool</button>
          <input aria-label="Coach number" placeholder="Coach # 9601" className="h-11 w-full rounded-xl border border-white/15 bg-black px-3" />
          <input aria-label="Driver" placeholder="Driver name and cell" className="h-11 w-full rounded-xl border border-white/15 bg-black px-3" />
        </section>
      )}
    </div>
  );
}

const on = "flex min-h-12 items-center justify-center rounded-xl bg-gradient-to-r from-[#1E90FF] to-[#8B5CF6] px-2 text-center text-sm font-semibold";
const off = "flex min-h-11 items-center justify-center rounded-xl bg-[#141820] px-2 text-center text-sm font-semibold ring-1 ring-white/10";
