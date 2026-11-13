"use client";

import { useEffect, useState } from "react";
import { tripRedirectHref } from "@/lib/trip-redirect";
import { field, onBtn } from "@/components/light/styles";
import { ScreenSkeleton } from "@/components/premium/skeleton";
import { GuestHome } from "@/components/marketing/guest-home";

type Row = { id: string; title: string; time: string; summary: string; detail: string; spot: string; route: string; frequency: string; flight: string };
type Trip = {
  signedIn: boolean;
  program?: { name: string; city?: string };
  portal?: {
    flights: Row[];
    hotels: Row[];
    routes: Row[];
    waves: Row[];
    departs: Row[];
    today: Row[];
    hasArrival: boolean;
    hasTransport: boolean;
    hasDeparture: boolean;
  };
  card?: { phase: string; line: string; note: string; pickup: string };
  updatedAt?: string;
};

export function GuestTrip() {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function refresh() {
    const response = await fetch("/api/trip");
    setTrip((await response.json()) as Trip);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(); }, 0);
    const pulse = window.setInterval(() => { void refresh(); }, 60_000);
    return () => { window.clearTimeout(timer); window.clearInterval(pulse); };
  }, []);

  async function submit() {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "open", code }),
      });
      const json = (await response.json()) as { error?: string; href?: string };
      if (!response.ok) {
        setError(json.error || "That code didn't match. Check your welcome message or ask the team at your arrival area.");
        return;
      }
      setCode("");
      const next = tripRedirectHref(json.href);
      if (next) { window.location.assign(next); return; }
      await refresh();
    } catch {
      setError("The request didn't go through. Try again.");
    } finally {
      setPending(false);
    }
  }

  async function exitTrip() {
    await fetch("/api/trip", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ step: "out" }) });
    setTrip({ signedIn: false });
  }

  if (!trip) return <ScreenSkeleton />;

  if (!trip.signedIn) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10" data-testid="trip-entrance">
        <h1 className="text-4xl font-bold tracking-tight">Your trip starts here.</h1>
        <p className="mt-3 text-lg text-white">Enter your trip code.</p>
        <p className="mt-2 text-sm text-vd-muted">It&apos;s in your welcome message or on the sign.</p>
        <form className="mt-8 space-y-3" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
          <label className="sr-only" htmlFor="trip-code">Trip code</label>
          <input id="trip-code" className={`${field} text-center text-3xl font-bold tracking-[0.18em]`} autoComplete="off" aria-label="Trip code" value={code} onChange={(event) => setCode(event.target.value)} />
          <button className={`${onBtn} h-14 w-full text-base`} type="submit" disabled={pending || code.trim().length < 2}>Open my trip</button>
          {error ? <p className="text-sm text-[#ffb4b0]">{error}</p> : null}
        </form>
      </div>
    );
  }

  return <GuestHome trip={trip} onExit={() => void exitTrip()} />;
}
