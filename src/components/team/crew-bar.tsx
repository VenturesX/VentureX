"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

type Person = { name: string; postCode: string; postLabel: string; textAlerts: boolean };
type Position = { code: string; label: string };

export function CrewBar({
  code,
  person,
  positions,
  onDay,
  owner = false,
}: {
  code: string;
  person: Person;
  positions: Position[];
  onDay: (day: unknown) => void;
  owner?: boolean;
}) {
  const path = usePathname();
  const router = useRouter();
  const [more, setMore] = useState(false);
  const tabs = [
    { href: "/team/director", label: "My Day" },
    { href: "/team/clipboard", label: "Clipboard" },
    { href: "/team/dispatch", label: "Dispatch" },
  ];

  async function save(body: { postCode?: string; textAlerts?: boolean; signOut?: boolean }) {
    const response = await fetch("/api/team/day", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, ...body }),
    });
    const json = await response.json();
    if (json.signedOut) {
      sessionStorage.removeItem("vd-day-code");
      router.push("/team/director");
      return;
    }
    if (response.ok) onDay(json);
  }

  return (
    <>
      {more ? (
        <div className="fixed inset-x-0 bottom-16 z-40 mx-auto max-w-lg rounded-t-2xl border border-white/10 bg-[#141820] p-4 text-white">
          <p className="text-sm text-white/70">{person.name} · {person.postLabel}</p>
          <label className="mt-3 block text-sm">Switch position
            <select className="mt-1 h-11 w-full rounded-xl border border-white/15 bg-black px-3" value={person.postCode} onChange={(event) => void save({ postCode: event.target.value })}>
              {positions.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
            </select>
          </label>
          <button type="button" className="mt-3 min-h-11 text-sm font-semibold text-[#9ecbff]" onClick={() => void save({ textAlerts: !person.textAlerts })}>
            Text alerts {person.textAlerts ? "on" : "off"}
          </button>
          <button type="button" className="mt-2 min-h-11 w-full rounded-xl bg-white/10 text-sm font-semibold" onClick={() => void save({ signOut: true })}>
            Sign out
          </button>
        </div>
      ) : null}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-white/10 bg-[#090b10] text-white" aria-label="Crew">
        {tabs.map((tab) => (
          <Link key={tab.href} href={tab.href} className={`flex min-h-16 items-center justify-center text-sm font-semibold ${path.startsWith(tab.href) ? "text-white" : "text-white/50"}`}>
            {tab.label}
          </Link>
        ))}
        {owner ? <Link href="/team" className="flex min-h-16 items-center justify-center text-sm font-semibold text-[#9ecbff]">Owner hub</Link> : <button type="button" className={`min-h-16 text-sm font-semibold ${more ? "text-white" : "text-white/50"}`} onClick={() => setMore((open) => !open)}>
          More
        </button>}
      </nav>
    </>
  );
}
