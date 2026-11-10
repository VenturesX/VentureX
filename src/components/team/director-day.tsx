"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { field, onBtn } from "@/components/light/styles";
import { CrewBar } from "@/components/team/crew-bar";

type Party = { id: string; vehicle: string; notes: string; carSeats: number; boosters: number; count: number; names: string[]; cells: string[] };
type Line = { flightCode: string; time: string; airline: string; flight: string; status: string; postCodes: string[]; mine: boolean; parties: Party[] };
type Day = {
  owner?: boolean;
  person: { name: string; postCode: string; postLabel: string; textAlerts: boolean; wide: boolean };
  program: { code: string; name: string };
  positions: { code: string; label: string }[];
  lines: Line[];
  staff: { name: string; post: string; in: boolean }[];
};

const TABS = ["Mine", "All", "Posts", "Staff"] as const;

export function DirectorGate() {
  const [code, setCode] = useState("");
  const [day, setDay] = useState<Day | null>(null);
  const [error, setError] = useState("");

  async function open(value = code) {
    const response = await fetch(`/api/team/day?code=${encodeURIComponent(value)}`);
    const json = (await response.json()) as Day & { error?: string };
    if (!response.ok) {
      setError(json.error || "That day code is not active.");
      setDay(null);
      return;
    }
    setError("");
    if (!json.owner) sessionStorage.setItem("vd-day-code", value);
    setCode(value);
    setDay(json);
  }

  useEffect(() => {
    void fetch("/api/team/session").then((response) => response.json()).then((session) => {
      if (session.signedIn?.kind === "admin") { void open(""); return; }
      const saved = sessionStorage.getItem("vd-day-code");
      if (saved) { setCode(saved); void open(saved); }
    }).catch(() => setError("Could not check your session. Return to Team Login."));
  }, []);

  if (!day) {
    return (
      <form className="mx-auto max-w-lg space-y-3 px-5 py-10 text-white" onSubmit={(event) => { event.preventDefault(); void open(); }}>
        <Link href="/team" className="text-sm text-[#9ecbff]">Team Login</Link>
        <h1 className="text-3xl font-semibold">Director</h1>
        <p className="text-sm text-white/70">Enter the day code from your check-in text.</p>
        <input className={field} inputMode="numeric" aria-label="Day code" value={code} onChange={(event) => setCode(event.target.value)} placeholder="Day code" />
        <button className={`${onBtn} w-full`} type="submit">Open my day</button>
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        <p className="text-sm text-white/50">Demo code for Marissa: 4821</p>
      </form>
    );
  }

  return <MyDay day={day} code={code} onChange={setDay} />;
}

function MyDay({ day, code, onChange }: { day: Day; code: string; onChange: (day: Day) => void }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Mine");
  const [post, setPost] = useState(day.person.postCode);
  const mine = day.lines.filter((line) => line.mine);
  const shown = tab === "All" ? day.lines : tab === "Posts" ? day.lines.filter((line) => line.postCodes.some((item) => item === post || (post === "B2" && item === "B_LOW") || (post === "B1" && item === "B_HIGH") || (post === "B_LOW" && item === "B2") || (post === "B_HIGH" && item === "B1"))) : mine;

  async function save(body: { postCode?: string; textAlerts?: boolean }) {
    const response = await fetch("/api/team/day", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, ...body }),
    });
    if (response.ok) onChange((await response.json()) as Day);
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-6 text-white" data-testid="my-day">
      {day.owner ? <Link href="/team" className="mb-3 inline-block min-h-11 text-sm text-[#9ecbff]">← Owner hub</Link> : null}
      <h1 className="text-3xl font-semibold">{day.person.name}</h1>
      <p className="text-sm text-white/70">{day.program.name} · {day.person.postLabel}</p>
      <div className="mt-4 grid grid-cols-4 gap-1">
        {TABS.map((item) => (
          <button key={item} type="button" className={`h-11 rounded-xl text-sm font-semibold ${tab === item ? "bg-gradient-to-r from-[#1E90FF] to-[#8B5CF6]" : "bg-white/10"}`} onClick={() => setTab(item)}>
            {item === "Mine" ? "My Day" : item}
          </button>
        ))}
      </div>
      {!day.owner ? <><label className="mt-3 block text-sm">Switch position
        <select className={`${field} mt-1`} value={day.person.postCode} onChange={(event) => void save({ postCode: event.target.value })}>
          {day.positions.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
        </select>
      </label>
      <button type="button" className="mt-2 min-h-11 text-sm font-semibold text-[#9ecbff]" onClick={() => void save({ textAlerts: !day.person.textAlerts })}>
        Text alerts {day.person.textAlerts ? "on" : "off"}
      </button>
      </> : null}
      {tab === "Staff" ? (
        <ul className="mt-4 divide-y divide-white/10">
          {day.staff.map((person) => (
            <li key={person.name} className="flex min-h-14 items-center justify-between text-lg">
              <span>{person.name}</span>
              <span className="text-base text-white/70">{person.post}{person.in ? " · In" : ""}</span>
            </li>
          ))}
        </ul>
      ) : (
        <>
          {tab === "Posts" ? (
            <div className="mt-3 flex flex-wrap gap-1">
              {day.positions.map((item) => (
                <button key={item.code} type="button" className={`h-10 rounded-full px-3 text-sm ${post === item.code ? "bg-white text-black" : "bg-white/10"}`} onClick={() => setPost(item.code)}>
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
          <ul className="mt-2 divide-y divide-white/10" data-testid="flight-lines">
            {shown.map((line) => {
              const count = line.parties.reduce((sum, party) => sum + party.count, 0);
              return (
                <li key={line.flightCode}>
                  <Link href={`/team/clipboard?flight=${line.flightCode}`} className="flex min-h-14 items-baseline gap-3 py-3 text-lg font-semibold">
                    <span className="w-24 shrink-0">{line.time}</span>
                    <span className="flex-1">{line.airline} {line.flight}</span>
                    <span className="text-base font-medium text-white/80">{line.status}</span>
                    <span className="w-8 text-right">{count}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {shown.length === 0 ? <p className="mt-6 text-base text-white/70">No flights on this post.</p> : null}
        </>
      )}
      <CrewBar owner={day.owner} code={code} person={day.person} positions={day.positions} onDay={(next) => onChange(next as Day)} />
    </div>
  );
}
