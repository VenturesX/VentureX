"use client";

import { useEffect, useState } from "react";
import { Home, KeyRound, LayoutDashboard, LogOut, Radio, Ticket } from "lucide-react";
import { field } from "@/components/light/styles";
import { Accordion } from "@/components/premium/accordion";
import { DeskGrid, type DeskKey } from "@/components/premium/desk-grid";
import { HeroCard } from "@/components/premium/hero-card";
import { ListRow } from "@/components/premium/list-row";
import { PillNav } from "@/components/premium/pill-nav";
import { ProgressRing } from "@/components/premium/progress-ring";
import { ScreenSkeleton } from "@/components/premium/skeleton";

type Program = { id: string; name: string; code: string; status: string; _count: { trips: number; roster: number } };
const MORE = [
  ["admin", "Admin desk", "Reports, quotes, and program setup."],
  ["guest", "Open My Trip", "Preview this program as a general guest."],
  ["setup", "Manage programs & codes", "Program, client, group, and guest codes."],
] as const;
const OPEN: Record<DeskKey, string> = {
  manifest: "clipboard",
  flights: "director",
  dispatch: "dispatch",
  clipboard: "clipboard",
  shuttle: "shuttle",
  drive: "driver",
};

export function OwnerHub() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selected, setSelected] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [panel, setPanel] = useState<"home" | "more">("home");
  const [pickup, setPickup] = useState<{ done: number; total: number; sample: boolean } | null>(null);
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

  useEffect(() => {
    const program = programs.find((item) => item.id === selected);
    if (!program) return;
    let active = true;
    void fetch("/api/team/report").then(async (response) => {
      if (!response.ok) throw new Error("report");
      const data = await response.json() as { program?: { code?: string }; moved?: { pax?: number }; sheet?: { count?: number }[] };
      const total = (data.sheet ?? []).reduce((sum, row) => sum + Number(row.count || 0), 0);
      const done = Number(data.moved?.pax || 0);
      if (!active) return;
      if (data.program?.code === program.code && total > 0) setPickup({ done: Math.min(done, total), total, sample: false });
      else setPickup({ done: 38, total: 52, sample: true });
    }).catch(() => { if (active) setPickup({ done: 38, total: 52, sample: true }); });
    return () => { active = false; };
  }, [programs, selected]);

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
  const today = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", month: "short", day: "numeric" }).format(new Date());
  if (!loaded) return <ScreenSkeleton />;
  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 pb-28 pt-6 text-white" data-testid="owner-hub">
      <HeroCard kicker="Owner" title={program?.name || "Owner hub"} line={program ? `${program.status} · ${today}` : "Choose a program"}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-vd-muted">One login. Choose a program, then open your workspace.</p>
          <button type="button" onClick={() => void signOut()} className="inline-flex min-h-11 shrink-0 items-center gap-1 text-sm font-semibold text-[#4da3ff]">
            <LogOut className="size-4" aria-hidden="true" /> Sign out
          </button>
        </div>
      </HeroCard>
      {error ? <p role="alert" className="text-sm text-[#ffb4b0]">{error}</p> : null}
      {programs.length ? <section className="space-y-3 rounded-card bg-vd-card p-4 ring-1 ring-white/10">
        <label htmlFor="owner-program" className="block text-sm font-semibold">Program</label>
        <select id="owner-program" value={selected} disabled={pending} onChange={(event) => { setSelected(event.target.value); sessionStorage.setItem("vd-owner-program", event.target.value); }} className={field}>
          {programs.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.code}</option>)}
        </select>
        {program ? <><p className="text-sm text-vd-muted">{program._count.trips} trips · {program._count.roster} staff · {program.status}</p><p className="text-sm">Guest program number: <strong className="text-lg tracking-wider text-[#4da3ff]">{program.code}</strong></p><p className="text-xs text-vd-muted">Guests enter this program number in Open My Trip. Personal text codes unlock their own ride.</p></> : null}
      </section> : !error ? <div className="rounded-card bg-vd-card p-5 ring-1 ring-white/10"><p>No programs yet.</p><button type="button" className="mt-4 h-11 rounded-full bg-white px-4 text-sm font-bold text-black" onClick={() => void open("setup")} disabled={pending}>Add your first program</button></div> : null}
      {program && panel === "home" ? (
        <>
          <DeskGrid disabled={pending} onOpen={(key) => void open(OPEN[key])} />
          {pickup ? <ProgressRing done={pickup.done} total={pickup.total} label="guests picked up" sample={pickup.sample} /> : <div className="vd-skeleton h-24 w-full" role="status" aria-label="Loading counts" />}
        </>
      ) : null}
      {program && panel === "more" ? (
        <section className="overflow-hidden rounded-card bg-vd-card ring-1 ring-white/10">
          <h2 className="px-4 pt-4 text-lg font-bold">More</h2>
          {MORE.map(([desk, title, description]) => (
            <ListRow key={desk} icon={desk === "guest" ? <Ticket className="size-5" /> : desk === "admin" ? <LayoutDashboard className="size-5" /> : <KeyRound className="size-5" />} title={title} subtitle={description} onClick={() => void open(desk)} disabled={pending} />
          ))}
          <ListRow icon={<LogOut className="size-5" />} title="Sign out" subtitle="End this owner session" onClick={() => void signOut()} />
        </section>
      ) : null}
      <Accordion title="How to change your codes">
        <p>The owner code is OWNER_HUB_CODE in Vercel. While that is set, the older owner code does not open this hub. The staff code never opens it. The hub locks after 15 minutes without using the desk, and the session ends at midnight Eastern. Signing back in keeps the program you had open.</p>
        <p className="mt-3">Use Manage programs &amp; codes to change program and client codes, reset staff day codes, and manage group or guest text codes. Keep your owner code private.</p>
      </Accordion>
      <p className="text-xs text-vd-muted">Driver and shuttle clipboard are shared workspaces with their own selectors. Airport desks use the program selected above. Changing programs here changes the active owner program across browser tabs.</p>
      <PillNav
        label="Owner"
        items={[
          { id: "home", label: "Home", icon: <Home />, active: panel === "home", onSelect: () => setPanel("home") },
          { id: "dispatch", label: "Dispatch", icon: <Radio />, onSelect: () => void open("dispatch") },
          { id: "trip", label: "My Trip", icon: <Ticket />, onSelect: () => void open("guest") },
          { id: "more", label: "More", icon: <KeyRound />, active: panel === "more", onSelect: () => setPanel("more") },
        ]}
      />
    </div>
  );
}
