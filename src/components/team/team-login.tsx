"use client";

import { useEffect, useState } from "react";
import { APP_NAME } from "@/lib/brand";
import { VentureMark } from "@/components/marketing/logo";
import { field, onBtn } from "@/components/light/styles";
import { OwnerHub } from "@/components/team/owner-hub";

const CARDS = [
  { id: "director", title: "Director", body: "Your day. Your post. The flights in front of you.", hint: "Day code", numeric: true },
  { id: "driver", title: "Driver", body: "Your run, and nothing else.", hint: "Day code", numeric: true },
  { id: "clipboard", title: "Clipboard", body: "The curb sheet.", hint: "Day code", numeric: true },
  { id: "dispatch", title: "Dispatch", body: "The loading queue.", hint: "Day code", numeric: true },
  { id: "admin", title: "Admin", body: "Owner and lead.", hint: "Admin code", numeric: false },
  { id: "client", title: "Client", body: "A read-only look at the day.", hint: "Client code", numeric: false },
] as const;

type CardId = (typeof CARDS)[number]["id"];

export function TeamLogin() {
  const [ready, setReady] = useState(false);
  const [gate, setGate] = useState<{ scope: string; programName: string } | null>(null);
  const [picked, setPicked] = useState<CardId | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [owner, setOwner] = useState(false);

  useEffect(() => {
    void fetch("/api/team/session")
      .then((response) => response.json())
      .then((json: { gate?: { scope: string; programName: string } | null; signedIn?: { kind?: string } | null }) => {
        setOwner(json.signedIn?.kind === "admin");
        setGate(json.gate ?? null);
        setReady(true);
      })
      .catch(() => setReady(true));
  }, []);

  async function submit(step: "gate" | "portal") {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/team/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step, code, portal: picked }),
      });
      const json = (await response.json()) as { error?: string; href?: string; programName?: string; scope?: string; owner?: boolean };
      if (!response.ok) {
        setError(json.error || "That code didn't match.");
        return;
      }
      if (step === "gate") {
        if (json.owner) { sessionStorage.removeItem("vd-day-code"); setOwner(true); }
        setGate({ scope: json.scope || "program", programName: json.programName || "" });
        setCode("");
        return;
      }
      const card = CARDS.find((item) => item.id === picked);
      if (card?.numeric) sessionStorage.setItem("vd-day-code", code);
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
    setCode("");
  }

  const card = CARDS.find((item) => item.id === picked);

  if (ready && owner) return <OwnerHub />;

  return (
    <div className="min-h-screen bg-[#090b10] text-white">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col px-5 py-10">
        <VentureMark className="size-12" />
        <h1 className="mt-6 text-4xl font-semibold tracking-tight">Team Login</h1>
        <p className="mt-2 text-sm text-white/70">Powered by {APP_NAME}, the tools for our crew.</p>
        {!ready ? <p className="mt-8 text-sm text-white/60">Opening…</p> : null}
        {ready && !gate ? (
          <form className="mt-8 space-y-3" onSubmit={(event) => { event.preventDefault(); void submit("gate"); }}>
            <label className="block text-sm" htmlFor="entry-code">Enter your code</label>
            <input id="entry-code" type="password" className={field} autoComplete="off" aria-label="Code" value={code} onChange={(event) => setCode(event.target.value)} />
            <button className={`${onBtn} w-full`} type="submit" disabled={pending || code.trim().length < 2}>Continue</button>
            {error ? <p className="text-sm text-red-300">{error}</p> : null}
          </form>
        ) : null}
        {ready && gate && !card ? (
          <div className="mt-8">
            <div className="flex items-center justify-between">
              <p className="text-sm text-white/70">{gate.scope === "all" ? "All programs" : gate.programName}</p>
              <button type="button" className="text-sm text-[#9ecbff]" onClick={() => void signOut()}>Sign out</button>
            </div>
            <div className="mt-3 grid gap-3">
              {CARDS.map((item) => (
                <button key={item.id} type="button" className="flex min-h-24 flex-col justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-left" onClick={() => { setPicked(item.id); setCode(""); setError(""); }}>
                  <span className="text-2xl font-semibold">{item.title}</span>
                  <span className="mt-1 text-sm text-white/70">{item.body}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {ready && gate && card ? (
          <form className="mt-8 space-y-3" onSubmit={(event) => { event.preventDefault(); void submit("portal"); }}>
            <button type="button" className="text-sm text-[#9ecbff]" onClick={() => { setPicked(null); setCode(""); setError(""); }}>All desks</button>
            <h2 className="text-3xl font-semibold">{card.title}</h2>
            <label className="block text-sm" htmlFor="second-code">{card.hint}</label>
            <input
              id="second-code"
              className={field}
              type="password"
              autoComplete="off"
              inputMode={card.numeric ? "numeric" : "text"}
              aria-label={card.hint}
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
            <button className={`${onBtn} w-full`} type="submit" disabled={pending || code.trim().length < 2}>Open</button>
            {error ? <p className="text-sm text-red-300">{error}</p> : null}
          </form>
        ) : null}
      </div>
    </div>
  );
}
