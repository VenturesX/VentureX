"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ClipboardList, Home, MoreHorizontal, Radio } from "lucide-react";
import { PillNav } from "@/components/premium/pill-nav";

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
        <div className="fixed inset-x-4 bottom-24 z-40 mx-auto max-w-lg rounded-card bg-[#1c1c1e] p-4 text-white ring-1 ring-white/10">
          <p className="text-sm text-vd-muted">{person.name} · {person.postLabel}</p>
          <label className="mt-3 block text-sm">Switch position
            <select className="mt-1 h-12 w-full rounded-2xl border border-white/10 bg-black px-3" value={person.postCode} onChange={(event) => void save({ postCode: event.target.value })}>
              {positions.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
            </select>
          </label>
          <button type="button" className="mt-3 min-h-11 text-sm font-semibold text-[#4da3ff]" onClick={() => void save({ textAlerts: !person.textAlerts })}>
            Text alerts {person.textAlerts ? "on" : "off"}
          </button>
          <button type="button" className="mt-2 min-h-11 w-full rounded-full bg-white text-sm font-bold text-black" onClick={() => void save({ signOut: true })}>
            Sign out
          </button>
        </div>
      ) : null}
      <PillNav
        label="Crew"
        items={[
          { id: "day", label: "Home", icon: <Home />, href: "/team/director", active: path.startsWith("/team/director") },
          { id: "clip", label: "Clipboard", icon: <ClipboardList />, href: "/team/clipboard", active: path.startsWith("/team/clipboard") },
          { id: "dispatch", label: "Dispatch", icon: <Radio />, href: "/team/dispatch", active: path.startsWith("/team/dispatch") },
          owner
            ? { id: "owner", label: "Owner", icon: <MoreHorizontal />, href: "/team", active: path === "/team" }
            : { id: "more", label: "More", icon: <MoreHorizontal />, active: more, onSelect: () => setMore((open) => !open) },
        ]}
      />
    </>
  );
}
