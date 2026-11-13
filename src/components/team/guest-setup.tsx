"use client";

import { useEffect, useState } from "react";
import { field } from "@/components/light/styles";

type Group = { id: string; name: string; kind: string; memberIds: string[]; code: string };
type Item = { id: string; title: string; kind: string; timeLabel: string; groupIds: string[]; paxId: string; guestVisible?: boolean };
type Guest = { id: string; name: string; flight: string; code: string };
type Office = { clientManagesGroups: boolean; groups: Group[]; items: Item[]; guests: Guest[] };

export function GuestSetup({ programId, owner }: { programId: string; owner: boolean }) {
  const [data, setData] = useState<Office | null>(null);
  const [error, setError] = useState("");
  const [fresh, setFresh] = useState("");
  const [name, setName] = useState("");

  async function load() {
    const response = await fetch(`/api/team/guest-portal?programId=${encodeURIComponent(programId)}`);
    const json = (await response.json()) as Office & { error?: string };
    if (!response.ok) {
      setError(json.error || "Could not open groups.");
      return;
    }
    setData(json);
  }

  useEffect(() => {
    void load();
  }, [programId]);

  async function act(body: Record<string, string>) {
    setError("");
    const response = await fetch("/api/team/guest-portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ programId, ...body }),
    });
    const json = (await response.json()) as Office & { error?: string; fresh?: string };
    if (!response.ok) {
      setError(json.error || "Could not save that.");
      return;
    }
    setData(json);
    setFresh(json.fresh || "");
    setName("");
  }

  if (!data) return <p className="text-sm text-white/60">Opening groups…</p>;

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 p-4">
      <div>
        <p className="font-semibold">Guest portal</p>
        <p className="text-xs text-white/50">View or reset codes here. They are hidden from guests who do not have them.</p>
      </div>
      {owner ? (
        <button type="button" className="h-11 rounded-xl bg-white/10 px-4 text-sm font-semibold" onClick={() => void act({ action: "toggle-client", value: data.clientManagesGroups ? "no" : "yes" })}>
          Client can manage groups: {data.clientManagesGroups ? "on" : "off"}
        </button>
      ) : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {fresh ? <p className="rounded-xl bg-white/10 p-3 text-sm">New code, copy it now: {fresh}</p> : null}
      <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); void act({ action: "save-group", name }); }}>
        <input className={field} aria-label="New group" placeholder="New group" value={name} onChange={(event) => setName(event.target.value)} />
        <button className="h-11 shrink-0 rounded-xl bg-white/10 px-3 text-sm font-semibold" type="submit">Add</button>
      </form>
      <ul className="space-y-3">
        {data.groups.map((group) => (
          <li key={group.id} className="rounded-xl bg-white/[0.03] p-3">
            <p className="font-semibold">{group.name}</p>
            {group.kind !== "EVERYONE" ? (
              <p className="text-sm text-white/70">{group.code ? `Code ${group.code}` : "No group code yet."}</p>
            ) : <p className="text-sm text-white/70">Opens with the program number.</p>}
            {group.kind !== "EVERYONE" ? (
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" className="text-sm text-[#9ecbff]" onClick={() => void act({ action: "set-group-code", id: group.id })}>New code</button>
                <button type="button" className="text-sm text-[#9ecbff]" onClick={() => void act({ action: "clear-group-code", id: group.id })}>Clear</button>
                <button type="button" className="text-sm text-red-300" onClick={() => void act({ action: "delete-group", id: group.id })}>Remove</button>
              </div>
            ) : null}
            <label className="mt-2 block text-xs text-white/60">Guests in this group
              <select multiple className={`${field} mt-1 h-28`} aria-label={`${group.name} guests`} value={group.memberIds} onChange={(event) => {
                const paxIds = [...event.target.selectedOptions].map((option) => option.value).join(",");
                void act({ action: "set-members", groupId: group.id, paxIds });
              }}>
                {data.guests.map((guest) => <option key={guest.id} value={guest.id}>{guest.name} · {guest.flight}</option>)}
              </select>
            </label>
          </li>
        ))}
      </ul>
      <div>
        <p className="font-semibold">Trip codes</p>
        <ul className="mt-2 divide-y divide-white/10">
          {data.guests.map((guest) => (
            <li key={guest.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span>{guest.name}<span className="block text-white/50">{guest.flight}{guest.code ? ` · ${guest.code}` : ""}</span></span>
              <span className="flex gap-2">
                <button type="button" className="text-[#9ecbff]" onClick={() => void act({ action: "issue-pass", paxId: guest.id })}>New</button>
                <button type="button" className="text-white/60" onClick={() => void act({ action: "clear-pass", paxId: guest.id })}>Clear</button>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="font-semibold">Moves</p>
        <ul className="mt-2 space-y-2 text-sm">
          {data.items.map((item) => (
            <li key={item.id} className="space-y-2 rounded-xl bg-white/[0.03] p-3">
              <div className="flex items-center justify-between gap-3">
                <span>{item.timeLabel} {item.title}</span>
                <button type="button" className="text-red-300" onClick={() => void act({ action: "delete-item", id: item.id })}>Remove</button>
              </div>
              <button type="button" className="min-h-11 rounded-full bg-white px-4 text-sm font-bold text-black" onClick={() => void act({ action: "show-guests", id: item.id, value: item.guestVisible === false ? "yes" : "no" })}>
                Show to guests: {item.guestVisible === false ? "Off" : "On"}
              </button>
              <label className="block text-xs text-white/60">Only for group
                <select className={`${field} mt-1`} aria-label={`${item.title} group`} value={item.groupIds[0] || ""} onChange={(event) => void act({ action: "only-group", id: item.id, groupId: event.target.value })}>
                  <option value="">Everyone who has the trip code</option>
                  {data.groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                </select>
              </label>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
