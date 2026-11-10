"use client";

import { useEffect, useState } from "react";
import { field, onBtn } from "@/components/light/styles";

type Program = { id: string; name: string; code: string; status: string; _count: { trips: number; roster: number } };
const DESKS = [
  ["admin", "Admin desk", "Reports, quotes, and program setup."],
  ["dispatch", "Dispatch", "Guest counts, loading, and departures."],
  ["director", "Director", "Flights, posts, and staff for this program."],
  ["clipboard", "Airport clipboard", "Flight lines and guest check-in."],
  ["shuttle", "Shuttle clipboard", "The existing shuttle planning board."],
  ["driver", "Driver", "The existing driver workspace."],
  ["guest", "Open My Trip", "Preview this program as a general guest."],
  ["setup", "Manage programs & codes", "Program, client, group, and guest codes."],
] as const;

export function OwnerHub() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selected, setSelected] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/team/owner");
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load programs.");
        if (!active) return;
        setPrograms(data.programs);
        const saved = sessionStorage.getItem("vd-owner-program") || "";
        const ids = data.programs.map((item: Program) => item.id);
        setSelected((current) => current && ids.includes(current) ? current : ids.includes(saved) ? saved : ids.includes(data.selectedProgramId) ? data.selectedProgramId : data.programs[0]?.id || "");
        setError("");
        setLoaded(true);
      } catch (reason) {
        if (active) { setError(reason instanceof Error ? reason.message : "Could not load programs."); setLoaded(true); }
      }
    }
    void load();
    function again() { void load(); }
    window.addEventListener("vd-owner-unlocked", again);
    return () => { active = false; window.removeEventListener("vd-owner-unlocked", again); };
  }, []);

  async function open(desk: string) {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/team/owner", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ programId: selected, desk }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not open that desk.");
      sessionStorage.removeItem("vd-day-code");
      if (selected) sessionStorage.setItem("vd-owner-program", selected);
      window.location.assign(data.href);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not open that desk.");
      setPending(false);
    }
  }

  async function signOut() {
    const response = await fetch("/api/team/unlock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ step: "out" }) });
    if (response.ok) { sessionStorage.removeItem("vd-day-code"); window.location.assign("/team"); }
    else setError("Could not sign out. Try again.");
  }
  const program = programs.find((item) => item.id === selected);
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-5 py-10 text-white" data-testid="owner-hub">
      <header className="flex items-start justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9ecbff]">Venture Directors</p><h1 className="mt-2 text-4xl font-semibold">Owner hub</h1><p className="mt-3 text-sm text-white/70">One login. Choose a program, then open your workspace.</p></div>
        <button type="button" onClick={() => void signOut()} className="min-h-11 shrink-0 text-sm text-[#9ecbff]">Sign out</button>
      </header>
      {error ? <p role="alert" className="text-sm text-red-300">{error}</p> : null}
      {!loaded ? <p role="status">Loading your programs…</p> : null}
      {loaded && programs.length ? <section className="space-y-3 rounded-2xl border border-[#1E90FF]/30 bg-[#1E90FF]/5 p-5">
        <label htmlFor="owner-program" className="block text-sm font-semibold">Program</label>
        <select id="owner-program" value={selected} disabled={pending} onChange={(event) => { setSelected(event.target.value); sessionStorage.setItem("vd-owner-program", event.target.value); }} className={field}>
          {programs.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.code}</option>)}
        </select>
        {program ? <><p className="text-sm text-white/70">{program._count.trips} trips · {program._count.roster} staff · {program.status}</p><p className="text-sm">Guest program number: <strong className="text-lg tracking-wider text-[#9ecbff]">{program.code}</strong></p><p className="text-xs text-white/60">Guests enter this program number in Open My Trip. Personal text codes unlock their own ride.</p></> : null}
      </section> : loaded && !error ? <div className="rounded-2xl border border-white/10 p-5"><p>No programs yet.</p><button type="button" className={`${onBtn} mt-4 px-4`} onClick={() => void open("setup")} disabled={pending}>Add your first program</button></div> : null}
      {program ? <nav aria-label="Owner workspaces" className="grid gap-3 sm:grid-cols-2">
        {DESKS.map(([desk, title, description]) => <button key={desk} type="button" disabled={pending} onClick={() => void open(desk)} className="min-h-28 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left hover:border-[#1E90FF]/60 disabled:opacity-50"><span className="text-lg font-semibold">{title}</span><span className="mt-2 block text-sm text-white/65">{description}</span></button>)}
      </nav> : null}
      <details className="rounded-2xl border border-white/10 p-5 text-sm leading-relaxed text-white/75"><summary className="cursor-pointer font-semibold text-white">How to change your codes</summary><p className="mt-3">The owner code is OWNER_HUB_CODE in Vercel. While that is set, the older owner code does not open this hub. The staff code never opens it. The hub locks after 15 minutes without using the desk, and the session ends at midnight Eastern. Signing back in keeps the program you had open.</p><p className="mt-3">Use Manage programs &amp; codes to change program and client codes, reset staff day codes, and manage group or guest text codes. Keep your owner code private.</p></details>
      <p className="text-xs text-white/50">Driver and shuttle clipboard are shared workspaces with their own selectors. Airport desks use the program selected above. Changing programs here changes the active owner program across browser tabs.</p>
    </div>
  );
}
