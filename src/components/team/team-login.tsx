"use client";

import { useEffect, useState } from "react";
import { APP_NAME } from "@/lib/brand";
import { VentureMark } from "@/components/marketing/logo";
import { field, onBtn } from "@/components/light/styles";
import { OwnerHub } from "@/components/team/owner-hub";

const CARDS = [
  { id: "lead", title: "Program Lead", body: "Schedules, staff, itinerary, and the day for one program.", hint: "Day code" },
  { id: "director", title: "Director", body: "My Day, your post, flights, and clipboard.", hint: "Day code" },
  { id: "dispatch", title: "Dispatch", body: "Loading, guest counts, and departures.", hint: "Day code" },
  { id: "driver", title: "Driver", body: "Your run and driver tools.", hint: "Day code" },
] as const;

type CardId = (typeof CARDS)[number]["id"];
type ProgramChoice = { id: string; name: string };

export function TeamLogin() {
  const [ready, setReady] = useState(false);
  const [gate, setGate] = useState<{ scope: string; programName: string } | null>(null);
  const [picked, setPicked] = useState<CardId | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [owner, setOwner] = useState(false);
  const [client, setClient] = useState(false);
  const [programs, setPrograms] = useState<ProgramChoice[] | null>(null);
  const [programId, setProgramId] = useState("");

  useEffect(() => {
    void fetch("/api/team/session")
      .then((response) => response.json())
      .then((json: { gate?: { scope: string; programName: string } | null; signedIn?: { kind?: string } | null; locked?: boolean }) => {
        setOwner(json.signedIn?.kind === "admin" || Boolean(json.locked));
        setGate(json.gate ?? null);
        setReady(true);
      })
      .catch(() => setReady(true));
  }, []);

  async function submit(step: "gate" | "portal" | "client" | "program") {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/team/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step, code, portal: picked, programId }),
      });
      const json = (await response.json()) as {
        error?: string;
        href?: string;
        programName?: string;
        scope?: string;
        owner?: boolean;
        staff?: boolean;
        chooseProgram?: boolean;
        programs?: ProgramChoice[];
      };
      if (!response.ok) {
        setError(json.error || "That code didn't match.");
        return;
      }
      if (step === "gate") {
        if (json.owner) {
          sessionStorage.removeItem("vd-day-code");
          setOwner(true);
        }
        setGate({ scope: json.scope || "program", programName: json.programName || "" });
        setCode("");
        return;
      }
      if (json.chooseProgram) {
        const list = json.programs || [];
        setPrograms(list);
        setProgramId(list[0]?.id || "");
        return;
      }
      if (step === "portal") sessionStorage.setItem("vd-day-code", code);
      window.location.assign(json.href || "/team");
    } catch {
      setError("The request didn't go through. Try again.");
    } finally {
      setPending(false);
    }
  }

  async function signOut() {
    await fetch("/api/team/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: "out" }),
    });
    setGate(null);
    setPicked(null);
    setPrograms(null);
    setCode("");
    setOwner(false);
  }

  const card = CARDS.find((item) => item.id === picked);

  if (ready && owner) return <OwnerHub />;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col px-5 py-10">
        <VentureMark className="size-12" />
        <h1 className="mt-6 text-4xl font-semibold tracking-tight">Team Login</h1>
        <p className="mt-2 text-sm text-white/70">Powered by {APP_NAME}, the tools for our crew.</p>
        {!ready ? <div className="mt-8 space-y-3" role="status" aria-label="Opening"><div className="vd-skeleton h-12 w-full" /><div className="vd-skeleton h-12 w-full" /><p className="sr-only">Opening…</p></div> : null}
        {ready && !gate && !client ? (
          <form className="mt-8 space-y-3" onSubmit={(event) => { event.preventDefault(); void submit("gate"); }}>
            <label className="block text-sm" htmlFor="entry-code">Enter your code</label>
            <input id="entry-code" type="password" className={field} autoComplete="off" aria-label="Code" value={code} onChange={(event) => setCode(event.target.value)} />
            <button className={`${onBtn} w-full`} type="submit" disabled={pending || code.trim().length < 2}>Continue</button>
            <button type="button" className="min-h-11 w-full text-sm text-[#9ecbff]" onClick={() => { setClient(true); setCode(""); setError(""); }}>Client</button>
            {error ? <p className="text-sm text-red-300">{error}</p> : null}
          </form>
        ) : null}
        {ready && client ? (
          <form className="mt-8 space-y-3" onSubmit={(event) => { event.preventDefault(); void submit("client"); }}>
            <button type="button" className="text-sm text-[#9ecbff]" onClick={() => { setClient(false); setCode(""); setError(""); }}>Team code</button>
            <h2 className="text-3xl font-semibold">Client</h2>
            <p className="text-sm text-white/70">Enter the client code for your program. You will see only what the owner turned on.</p>
            <label className="block text-sm" htmlFor="client-code">Client code</label>
            <input id="client-code" type="password" className={field} autoComplete="off" aria-label="Client code" value={code} onChange={(event) => setCode(event.target.value)} />
            <button className={`${onBtn} w-full`} type="submit" disabled={pending || code.trim().length < 2}>Open</button>
            {error ? <p className="text-sm text-red-300">{error}</p> : null}
          </form>
        ) : null}
        {ready && gate && !card && !programs ? (
          <div className="mt-8">
            <div className="flex items-center justify-between">
              <p className="text-sm text-white/70">{gate.scope === "all" ? "Choose your workspace" : gate.programName}</p>
              <button type="button" className="text-sm text-[#9ecbff]" onClick={() => void signOut()}>Sign out</button>
            </div>
            <p className="mt-3 text-sm text-white/60">Choose your role, then enter the day code from your check-in text.</p>
            <div className="mt-3 grid gap-3">
              {CARDS.map((item) => (
                <button key={item.id} type="button" className="vd-press flex min-h-24 flex-col justify-center rounded-tile bg-[#161618] px-5 py-4 text-left ring-1 ring-white/10" onClick={() => { setPicked(item.id); setCode(""); setError(""); }}>
                  <span className="text-2xl font-semibold">{item.title}</span>
                  <span className="mt-1 text-sm text-white/70">{item.body}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {ready && gate && card && !programs ? (
          <form className="mt-8 space-y-3" onSubmit={(event) => { event.preventDefault(); void submit("portal"); }}>
            <button type="button" className="text-sm text-[#9ecbff]" onClick={() => { setPicked(null); setCode(""); setError(""); }}>All desks</button>
            <h2 className="text-3xl font-semibold">{card.title}</h2>
            <p className="text-sm text-white/70">Enter the day code from your check-in text. The master day code also works after this sign-in.</p>
            <label className="block text-sm" htmlFor="second-code">{card.hint}</label>
            <input id="second-code" className={field} type="password" autoComplete="off" aria-label={card.hint} value={code} onChange={(event) => setCode(event.target.value)} />
            <button className={`${onBtn} w-full`} type="submit" disabled={pending || code.trim().length < 2}>Open</button>
            {error ? <p className="text-sm text-red-300">{error}</p> : null}
          </form>
        ) : null}
        {ready && programs ? (
          <form className="mt-8 space-y-3" onSubmit={(event) => { event.preventDefault(); void submit("program"); }}>
            <h2 className="text-3xl font-semibold">{card?.title || "Program"}</h2>
            <p className="text-sm text-white/70">Choose the program for this shift. DEMO sits next to the live samples.</p>
            <label className="block text-sm" htmlFor="program-choice">Program</label>
            <select id="program-choice" className={field} value={programId} onChange={(event) => setProgramId(event.target.value)}>
              {programs.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <button className={`${onBtn} w-full`} type="submit" disabled={pending || !programId}>Open</button>
            {error ? <p className="text-sm text-red-300">{error}</p> : null}
          </form>
        ) : null}
      </div>
    </div>
  );
}
