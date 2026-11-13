"use client";

import { useState } from "react";
import Link from "next/link";
import { CircleHelp, ClipboardList, Home, Moon, Plane, Radio } from "lucide-react";
import { Accordion } from "@/components/premium/accordion";
import { DeskGrid, type DeskKey } from "@/components/premium/desk-grid";
import { HeroCard } from "@/components/premium/hero-card";
import { ListRow } from "@/components/premium/list-row";
import { PillNav } from "@/components/premium/pill-nav";
import { ProgressRing } from "@/components/premium/progress-ring";

const FAQ = [
  ["Where is registration?", "OCCC West, Level 1, Hall A. Follow the IACP signs from the shuttle drop."],
  ["Where do I catch Route 3?", "Residence Inn main entrance, Hilton GV trolley G16, Element main entrance, or SpringHill near the front door."],
  ["What time is Chief's Night?", "Monday Oct 26, 6:00 PM–12:00 AM at Universal's Islands of Adventure."],
];

const HREFS: Record<DeskKey, string> = {
  manifest: "/clipboard",
  flights: "/team/dispatch",
  dispatch: "/team/dispatch",
  clipboard: "/clipboard",
  shuttle: "/shuttle",
  drive: "/drive",
};

export function StaffHub() {
  const [profile, setProfile] = useState<"loop" | "airport" | "night" | "faq">("loop");
  const [alert, setAlert] = useState(false);
  const [clocked, setClocked] = useState<Record<string, string>>({ Donna: "In", Aaron: "In", Marissa: "Out" });
  const [help, setHelp] = useState(false);
  const [section, setSection] = useState<"home" | "more">("home");
  const titles = { loop: "Shuttle loop", airport: "Airport meet", night: "Night moves", faq: "FAQ" };
  return (
    <div className="mx-auto w-full max-w-lg space-y-4 px-4 pb-28 pt-4 text-white" data-testid="staff-hub">
      {alert ? <p className="rounded-card bg-[#ff453a] px-3 py-3 text-center text-sm font-bold text-black" data-testid="staff-alert">ALL STAFF RETURN TO HUB / STAND DOWN</p> : null}
      <HeroCard kicker="Today's position" title={titles[profile]} line="IACP 2026 Orlando · Curb shift, today" />
      <DeskGrid hrefFor={(key) => HREFS[key]} />
      <ProgressRing done={38} total={52} label="guests picked up" sample />
      {profile === "loop" ? (
        <Link href="/clipboard" className={on} data-testid="open-clipboard">Open curb clipboard</Link>
      ) : null}
      {profile === "airport" ? (
        <section className="space-y-2 rounded-card bg-vd-card p-4 text-sm ring-1 ring-white/10">
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
            <Accordion key={q} title={q} defaultOpen>
              <p>{a}</p>
            </Accordion>
          ))}
        </div>
      ) : null}
      {section === "more" ? (
        <section className="overflow-hidden rounded-card bg-vd-card ring-1 ring-white/10">
          <h2 className="px-4 pt-4 text-lg font-bold">More</h2>
          <ListRow icon={<BusIcon />} title="Shuttle loop" subtitle="Curb clipboard" onClick={() => { setProfile("loop"); setSection("home"); }} />
          <ListRow icon={<Plane className="size-5" />} title="Airport meet" subtitle="Ready, walking, walk-up" onClick={() => { setProfile("airport"); setSection("home"); }} />
          <ListRow icon={<Moon className="size-5" />} title="Night moves" subtitle="Ingress and egress" onClick={() => { setProfile("night"); setSection("home"); }} />
          <ListRow icon={<CircleHelp className="size-5" />} title="FAQ cards" subtitle="Answers for the curb" onClick={() => { setProfile("faq"); setSection("home"); }} />
        </section>
      ) : null}
      <section className="space-y-2 rounded-card bg-vd-card p-4 ring-1 ring-white/10">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4da3ff]">Manager</h2>
        {Object.entries(clocked).map(([name, status]) => (
          <button key={name} type="button" className={off} onClick={() => setClocked((current) => ({ ...current, [name]: current[name] === "In" ? "Out" : "In" }))}>
            {name} · {status} · GPS pin
          </button>
        ))}
        <button type="button" data-testid="broadcast" className="h-11 w-full rounded-full bg-[#ff453a] text-sm font-bold text-black" onClick={() => setAlert(true)}>All-staff alert</button>
        <button type="button" className={off} onClick={() => window.print()}>Print backup packet</button>
        <button type="button" className={off} onClick={() => setHelp(true)}>30-second curb tutorial</button>
      </section>
      {help ? (
        <div className="rounded-card bg-white p-4 text-sm text-black" data-testid="tutorial">
          <p className="font-bold">1. Count the people at the door.</p>
          <p>2. Tap Loaded · Send Bus.</p>
          <p>3. If someone sprints up, tap +1 Late on the last bus, then copy the line.</p>
          <button type="button" className="mt-2 h-11 w-full rounded-full bg-black text-white" onClick={() => setHelp(false)}>Got it</button>
        </div>
      ) : null}
      <PillNav
        label="Staff"
        items={[
          { id: "home", label: "Home", icon: <Home />, active: section === "home", onSelect: () => setSection("home") },
          { id: "manifest", label: "Manifest", icon: <ClipboardList />, href: "/clipboard" },
          { id: "dispatch", label: "Dispatch", icon: <Radio />, href: "/team/dispatch" },
          { id: "more", label: "More", icon: <Plane />, active: section === "more", onSelect: () => setSection("more") },
        ]}
      />
    </div>
  );
}

function BusIcon() {
  return <span className="text-sm font-bold">R3</span>;
}

const on = "vd-press flex min-h-11 items-center justify-center rounded-full bg-white px-2 text-center text-sm font-bold text-black";
const off = "vd-press flex min-h-11 items-center justify-center rounded-2xl bg-[#1c1c1e] px-2 text-center text-sm font-semibold ring-1 ring-white/10";
