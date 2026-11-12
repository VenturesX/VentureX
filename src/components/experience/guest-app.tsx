"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Bus, FerrisWheel, Home, Hotel, Landmark, MessageCircle, Plane, UtensilsCrossed, UserRound } from "lucide-react";
import { COMPANY_PHONE, COMPANY_PHONE_TEL } from "@/lib/brand";
import { useWalk } from "@/lib/experience/store";
import { Accordion } from "@/components/premium/accordion";
import { PillNav } from "@/components/premium/pill-nav";
import { RideBar } from "@/components/premium/ride-bar";
import { ADD_RIDES, ORLANDO_PICKS } from "@/components/premium/rides";
import { Tile } from "@/components/premium/tile";

const HOTELS = [
  ["Residence Inn SeaWorld", "Main entrance. Donna is on the curb. Headway 15–20 min."],
  ["Hilton Grand Vacations", "Board at I-Ride trolley stop G16 on Westwood Blvd, outside the gate."],
  ["Element Orlando", "Main entrance. Aaron is on the curb. Walk-over from Aloft next door."],
  ["SpringHill Suites", "Near the main entrance. Marissa is on the curb. Fairfield, TownePlace, and Homewood walk over."],
  ["OCCC West", "West Building hub, 9800 International Dr. Buses start and end here."],
] as const;

type View = "home" | "trip" | "text" | "account";

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
  const [view, setView] = useState<View>("home");
  const [later, setLater] = useState(false);
  const [ride, setRide] = useState<string | null>(null);
  const note = useMemo(() => HOTELS[hotel][1], [hotel]);

  if (role === "client" && state.tiers.dashboard) {
    return (
      <div className="mx-auto w-full max-w-lg space-y-4 px-4 py-4 text-white" data-testid="client-dashboard">
        <h1 className="text-3xl font-bold tracking-tight">IACP 2026 Orlando</h1>
        <p className="text-sm text-vd-muted">VIP client command. Code 831519.</p>
        <div className="grid grid-cols-2 gap-3">
          <Tile icon={<Bus className="size-5" />} label="Live map" hint="Route 3 between the hotels" />
          <Tile icon={<Plane className="size-5" />} label="Arrivals" hint="Flights the crew is meeting" />
        </div>
        <p className="rounded-card bg-vd-card p-4 text-sm ring-1 ring-white/10">Live map: Route 3 buses between Residence Inn and OCCC West. Hotel notes update as curb staff send each bus.</p>
        <button type="button" className="h-12 w-full rounded-full bg-white text-sm font-bold text-black">Executive summary</button>
      </div>
    );
  }

  function chooseRide(title: string) {
    setRide(title);
    setLater(true);
    if (state.tiers.seatHold) setTab("hold");
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-5 px-4 pb-28 pt-4 text-white" data-testid="guest-app">
      <RideBar onOpen={() => setView("trip")} onLater={() => setLater((open) => !open)} laterOpen={later} />
      {later ? (
        <Accordion title={ride ? `Later · ${ride}` : "Book a later transfer"} open={later} onOpenChange={setLater}>
          <p>Choose the extra move. A seat hold, when this program has it on, still uses the curb timer.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {ADD_RIDES.map((item) => (
              <button key={item.id} type="button" className={ride === item.title ? on : off} onClick={() => chooseRide(item.title)}>{item.title}</button>
            ))}
          </div>
        </Accordion>
      ) : null}
      {view === "home" ? (
        <>
          <section className="space-y-3">
            <h2 className="text-xl font-bold">Your trips</h2>
            <div className="grid grid-cols-2 gap-3">
              <Tile icon={<Plane className="size-5" />} label="Next bus" hint="On the loop" onClick={() => setView("trip")} />
              <Tile icon={<Hotel className="size-5" />} label={HOTELS[hotel][0]} hint="Where to board" tone="green" onClick={() => setView("trip")} />
              <Tile icon={<Bus className="size-5" />} label="OCCC West" hint="End of the run" tone="amber" onClick={() => { setHotel(4); setView("trip"); }} />
            </div>
          </section>
          <section className="space-y-3">
            <h2 className="text-xl font-bold">Add a ride</h2>
            <div className="grid grid-cols-2 gap-3">
              {ADD_RIDES.map((item) => (
                <Tile key={item.id} icon={/dinner/i.test(item.title) ? <UtensilsCrossed className="size-5" /> : <FerrisWheel className="size-5" />} label={item.title} hint={ride === item.title ? "Selected" : "Request"} tone={ride === item.title ? "green" : "accent"} onClick={() => chooseRide(item.title)} />
              ))}
            </div>
          </section>
          <section className="space-y-3">
            <h2 className="text-xl font-bold">Orlando picks</h2>
            <div className="grid grid-cols-2 gap-3">
              {ORLANDO_PICKS.map((pick) => (
                <Tile key={pick.title} icon={<Landmark className="size-5" />} label={pick.title} hint={pick.subtitle} onClick={() => chooseRide(pick.title)} />
              ))}
            </div>
          </section>
        </>
      ) : null}
      {view === "trip" ? (
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight">IACP 2026 Orlando</h1>
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
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#4da3ff]">X marks the spot</p>
              <p className="rounded-card bg-vd-card p-4 text-lg font-bold leading-snug ring-1 ring-white/10">{note}</p>
              <p className="text-sm text-vd-muted">Next bus ETA about 6 min. Loop pace until a puck is linked.</p>
            </section>
          ) : null}
          {tab === "board" && !state.tiers.wayfinding ? <Locked /> : null}
          {tab === "hold" ? (
            <section className="space-y-2" data-testid="seat-hold">
              {hold === "none" ? <button type="button" className={on} onClick={() => setHold("held")}>Hold seat on next bus</button> : null}
              {hold === "held" ? (
                <>
                  <p className="text-center text-base font-semibold">Seat held. Check in at the curb.</p>
                  <p className="sr-only">{seconds} seconds remaining</p>
                  <p className="text-center text-sm text-vd-muted">Check in at the curb at least 3 minutes before the bus leaves, or the seat goes to standby.</p>
                  <button type="button" className={on} onClick={() => { setHold("curb"); setSeconds(0); }}>I&apos;m at the curb</button>
                </>
              ) : null}
              {hold === "curb" ? <p className="text-sm font-semibold">Checked in. Stay on the curb.</p> : null}
            </section>
          ) : null}
          {tab === "flight" ? (
            <section className="space-y-2" data-testid="prereg">
              <p className="text-sm text-vd-muted">Client-approved flights: DL 1098, AA 2144, or enter your own number.</p>
              <input aria-label="Flight number" placeholder="Flight number" className="h-12 w-full rounded-2xl border border-white/10 bg-[#141414] px-3" />
              <Accordion title="+ Add family / guests" open={openFamily} onOpenChange={setOpenFamily}>
                <Stepper label="Extra guests" value={family} setValue={setFamily} max={3} />
              </Accordion>
              <Accordion title="+ Add bags & gear" open={openBags} onOpenChange={setOpenBags}>
                <div className="space-y-2">
                  <Stepper label="Checked bags" value={bags} setValue={setBags} />
                  <Stepper label="Car seats" value={seats} setValue={setSeats} />
                  <Stepper label="Strollers / wheelchairs" value={gear} setValue={setGear} />
                </div>
              </Accordion>
            </section>
          ) : null}
        </div>
      ) : null}
      {view === "text" ? (
        <div className="space-y-3">
          <h1 className="text-3xl font-bold">Text us</h1>
          <a className="flex h-14 items-center justify-center rounded-full bg-white text-lg font-bold text-black" href={`tel:${COMPANY_PHONE_TEL}`}>{COMPANY_PHONE}</a>
        </div>
      ) : null}
      {view === "account" ? (
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Account</h1>
          <p className="text-sm text-vd-muted">IACP 2026 Orlando. Guest tools follow the tiers the owner unlocked.</p>
        </div>
      ) : null}
      <PillNav
        label="Guest"
        items={[
          { id: "home", label: "Home", icon: <Home />, active: view === "home", onSelect: () => setView("home") },
          { id: "trip", label: "My Trip", icon: <Bus />, active: view === "trip", onSelect: () => setView("trip") },
          { id: "text", label: "Text Us", icon: <MessageCircle />, active: view === "text", onSelect: () => setView("text") },
          { id: "account", label: "Account", icon: <UserRound />, active: view === "account", onSelect: () => setView("account") },
        ]}
      />
    </div>
  );
}

function Locked() {
  return <p className="rounded-card bg-vd-card p-4 text-sm text-vd-muted ring-1 ring-white/10">This feature is locked for this program.</p>;
}
function Stepper({ label, value, setValue, max = 9 }: { label: string; value: number; setValue: (n: number) => void; max?: number }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-black px-3 py-2">
      <span className="text-sm text-white">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" className="grid size-11 place-items-center rounded-xl bg-[#1c1c1e]" onClick={() => setValue(Math.max(0, value - 1))}>−</button>
        <span className="w-6 text-center font-bold text-white">{value}</span>
        <button type="button" className="grid size-11 place-items-center rounded-xl bg-[#1c1c1e]" onClick={() => setValue(Math.min(max, value + 1))}>+</button>
      </div>
    </div>
  );
}
const on = "vd-press flex min-h-11 items-center justify-center rounded-full bg-white px-2 text-center text-[12px] font-bold text-black";
const off = "vd-press flex min-h-11 items-center justify-center rounded-2xl bg-[#1c1c1e] px-2 text-center text-[12px] font-semibold text-white ring-1 ring-white/10";
