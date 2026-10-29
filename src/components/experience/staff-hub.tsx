"use client";

import { useState } from "react";
import Link from "next/link";

const FAQ = [
  ["Where is registration?", "OCCC West, Level 1, Hall A. Follow the IACP signs from the shuttle drop."],
  ["Where do I catch Route 3?", "Residence Inn main entrance, Hilton GV trolley G16, Element main entrance, or SpringHill near the front door."],
  ["What time is Chief's Night?", "Monday Oct 26, 6:00 PM–12:00 AM at Universal's Islands of Adventure."],
];

export function StaffHub() {
  const [profile, setProfile] = useState<"loop" | "airport" | "night" | "faq">("loop");
  const [alert, setAlert] = useState(false);
  const [clocked, setClocked] = useState<Record<string, string>>({ Donna: "In", Aaron: "In", Marissa: "Out" });
  const [help, setHelp] = useState(false);
  return (
    <div className="mx-auto w-full max-w-lg space-y-3 px-3 py-3 text-white" data-testid="staff-hub">
      {alert ? <p className="rounded-xl bg-rose-500 px-3 py-3 text-center text-sm font-semibold" data-testid="staff-alert">ALL STAFF RETURN TO HUB / STAND DOWN</p> : null}
      <h1 className="text-2xl font-semibold">Venture staff</h1>
      <div className="grid grid-cols-2 gap-1">
        <button type="button" className={profile === "loop" ? on : off} onClick={() => setProfile("loop")}>Shuttle loop</button>
        <button type="button" className={profile === "airport" ? on : off} onClick={() => setProfile("airport")}>Airport meet</button>
        <button type="button" className={profile === "night" ? on : off} onClick={() => setProfile("night")}>Night moves</button>
        <button type="button" className={profile === "faq" ? on : off} onClick={() => setProfile("faq")}>FAQ cards</button>
      </div>
      {profile === "loop" ? (
        <Link href="/clipboard" className={on} data-testid="open-clipboard">Open curb clipboard</Link>
      ) : null}
      {profile === "airport" ? (
        <section className="space-y-2 rounded-2xl bg-[#0c0e12] p-3 text-sm">
          <p className="font-semibold">DL 1098 · Kimberly Nguyen · 2 bags · 1 car seat</p>
          <button type="button" className={off}>Ready at curb</button>
          <button type="button" className={off}>Walking down · 10 min</button>
          <button type="button" className={off}>+ Walk-up guest</button>
        </section>
      ) : null}
      {profile === "night" ? (
        <section className="space-y-2 text-sm">
          <p>Universal buyout. Ingress 346 staffed + est. 208 unstaffed. Open the clipboard night tab and switch to Egress (Returns Only).</p>
          <Link href="/clipboard" className={on}>Open night returns</Link>
        </section>
      ) : null}
      {profile === "faq" ? (
        <div className="space-y-2">
          {FAQ.map(([q, a]) => (
            <article key={q} className="rounded-2xl bg-[#0c0e12] p-3">
              <h2 className="text-base font-semibold">{q}</h2>
              <p className="mt-1 text-sm text-[#d5dbe6]">{a}</p>
            </article>
          ))}
        </div>
      ) : null}
      <section className="space-y-2 rounded-2xl border border-white/10 p-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9ecbff]">Manager</h2>
        {Object.entries(clocked).map(([name, status]) => (
          <button key={name} type="button" className={off} onClick={() => setClocked((current) => ({ ...current, [name]: current[name] === "In" ? "Out" : "In" }))}>
            {name} · {status} · GPS pin
          </button>
        ))}
        <button type="button" data-testid="broadcast" className="h-11 w-full rounded-xl bg-rose-500 text-sm font-semibold" onClick={() => setAlert(true)}>All-staff alert</button>
        <button type="button" className={off} onClick={() => window.print()}>Print backup packet</button>
        <button type="button" className={off} onClick={() => setHelp(true)}>30-second curb tutorial</button>
      </section>
      {help ? (
        <div className="rounded-2xl bg-white p-3 text-sm text-black" data-testid="tutorial">
          <p className="font-semibold">1. Count the people at the door.</p>
          <p>2. Tap Loaded · Send Bus.</p>
          <p>3. If someone sprints up, tap +1 Late on the last bus, then copy the line.</p>
          <button type="button" className="mt-2 h-11 w-full rounded-xl bg-black text-white" onClick={() => setHelp(false)}>Got it</button>
        </div>
      ) : null}
    </div>
  );
}

const on = "flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-[#1E90FF] to-[#8B5CF6] px-2 text-center text-sm font-semibold";
const off = "flex min-h-11 items-center justify-center rounded-xl bg-[#141820] px-2 text-center text-sm font-semibold ring-1 ring-white/10";
