"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TripCodeForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/guest/code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const json = (await response.json()) as { error?: string; token?: string };
      if (!response.ok || !json.token) {
        setError(json.error ?? "That code didn't work. Check the code from your planner and try again.");
        setPending(false);
        return;
      }
      router.push(`/t/${json.token}`);
    } catch {
      setError("That code didn't work. Check the code from your planner and try again.");
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-5 py-10">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#1E90FF]">Traveling with us now</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Enter your event code.</h1>
      <p className="mt-3 text-sm leading-relaxed text-white/70">
        Your planner gave you a short code. It opens only your group&apos;s trip.
      </p>
      <form className="mt-8 space-y-3" onSubmit={submit}>
        <label className="block text-sm font-medium" htmlFor="event-code">Event code</label>
        <input
          id="event-code"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={8}
          placeholder="ABC234"
          className="h-14 w-full rounded-xl border border-white/15 bg-black px-3 text-center text-2xl font-semibold tracking-[0.28em] outline-none focus:border-[#1E90FF]"
        />
        {error ? <p id="code-error" role="alert" className="text-sm text-rose-200">{error}</p> : null}
        <button type="submit" disabled={pending} className="h-12 w-full rounded-lg bg-[#1E90FF] text-base font-semibold text-white disabled:opacity-60">
          {pending ? "Checking…" : "Open trip"}
        </button>
      </form>
    </div>
  );
}
