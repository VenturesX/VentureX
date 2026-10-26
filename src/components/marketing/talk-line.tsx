"use client";

import { useEffect, useState } from "react";
import { BusinessPhone } from "@/components/marketing/business-phone";
import { isLiveLineOpen, type OfficeHours } from "@/lib/guidance";

const TIMES = ["Morning", "Afternoon", "Evening", "Anytime"];

export function TalkLine() {
  const [hours, setHours] = useState<OfficeHours | null>(null);
  const [hoursLabel, setHoursLabel] = useState("");
  const [open, setOpen] = useState(false);
  const [bestTime, setBestTime] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/help")
      .then((response) => response.json())
      .then((json: { hours?: OfficeHours | null; hoursLabel?: string }) => {
        if (cancelled) return;
        setHours(json.hours ?? null);
        setHoursLabel(json.hoursLabel ?? "");
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const lineOpen = isLiveLineOpen(hours);
  const afterHours = lineOpen === false;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/callbacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(form.get("name") ?? ""),
          phone: String(form.get("phone") ?? ""),
          bestTime,
        }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(json.error ?? "We couldn't save that request.");
        return;
      }
      setDone(true);
    } catch {
      setError("The request didn't go through. Try again in a moment.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div id="contact" className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-relaxed">
      <BusinessPhone className="min-h-11 text-base" />
      {afterHours && hoursLabel ? <p className="mt-2 text-xs text-white/50">Live line {hoursLabel}.</p> : null}
      <p className="mt-2 text-white/60">
        Prefer a callback?{" "}
        <button type="button" className="font-medium text-white underline decoration-white/30" onClick={() => setOpen((current) => !current)}>
          Request a call
        </button>
        .
      </p>
      {open ? (
        done ? (
          <p className="mt-3 text-white/80">Thanks. A Venture Expert will call you.</p>
        ) : (
          <form className="mt-3 space-y-2" onSubmit={submit}>
            <input name="name" required placeholder="Name" autoComplete="name" className={fieldClass} aria-label="Name" />
            <input name="phone" type="tel" required placeholder="Phone" autoComplete="tel" className={fieldClass} aria-label="Phone" />
            <div className="grid grid-cols-2 gap-2">
              {TIMES.map((time) => (
                <button
                  key={time}
                  type="button"
                  className={`h-10 rounded-lg border text-xs font-semibold ${bestTime === time ? "border-[#1E90FF] text-white" : "border-white/15 text-white/70"}`}
                  onClick={() => setBestTime(time)}
                >
                  {time}
                </button>
              ))}
            </div>
            {error ? <p className="text-xs text-rose-200">{error}</p> : null}
            <button type="submit" disabled={pending || !bestTime} className="text-sm font-semibold text-[#1E90FF] disabled:opacity-50">
              {pending ? "Sending…" : "Request a call"}
            </button>
          </form>
        )
      ) : null}
    </div>
  );
}

const fieldClass = "h-10 w-full rounded-lg border border-white/15 bg-black px-3 text-sm text-white outline-none focus:border-[#1E90FF]";
