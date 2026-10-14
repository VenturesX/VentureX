"use client";

import { useEffect, useState } from "react";
import { isLiveLineOpen, type OfficeHours } from "@/lib/guidance";

const TIMES = ["Morning", "Afternoon", "Evening", "Anytime"];

export function ExpertHelp({ variant = "panel" }: { variant?: "panel" | "bar" }) {
  const [phone, setPhone] = useState("");
  const [tel, setTel] = useState("");
  const [hours, setHours] = useState<OfficeHours | null>(null);
  const [hoursLabel, setHoursLabel] = useState("");
  const [ready, setReady] = useState(false);
  const [bestTime, setBestTime] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/help")
      .then((response) => response.json())
      .then((json: { phone?: string; tel?: string; hours?: OfficeHours | null; hoursLabel?: string }) => {
        if (cancelled) return;
        const nextHours = json.hours ?? null;
        setPhone(json.phone ?? "");
        setTel(json.tel ?? "");
        setHours(nextHours);
        setHoursLabel(json.hoursLabel ?? "");
        setOpenForm(isLiveLineOpen(nextHours) !== true);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const lineOpen = isLiveLineOpen(hours);
  if (!ready) return null;
  const afterHours = lineOpen === false;
  const showCall = Boolean(phone && tel) && lineOpen !== false;

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
    <section className={variant === "panel" ? "rounded-3xl border border-[#1E90FF]/40 bg-[#1E90FF]/10 p-5" : "rounded-2xl border border-white/10 p-4"}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1E90FF]">Talk to a Venture Expert</p>
      {afterHours ? (
        <p className="mt-2 text-sm leading-relaxed text-white/85">
          Our live line is open {hoursLabel}. Request a call and a Venture Expert will reach out.
        </p>
      ) : (
        <p className="mt-2 text-sm leading-relaxed text-white/75">
          A real person can walk through the move with you. The quote form can wait.
        </p>
      )}
      <div className="mt-4 space-y-3">
        {showCall ? (
          <a href={`tel:${tel}`} className="flex h-14 w-full items-center justify-center rounded-lg bg-[#1E90FF] text-lg font-semibold text-white">
            Call {phone}
          </a>
        ) : null}
        {afterHours ? (
          <button type="button" className="flex h-14 w-full items-center justify-center rounded-lg bg-[#1E90FF] text-lg font-semibold text-white" onClick={() => setOpenForm(true)}>
            Request a call
          </button>
        ) : null}
        {phone && afterHours ? (
          <a href={`tel:${tel}`} className="block text-center text-sm text-white/70">
            Or call {phone}
          </a>
        ) : null}
        {!afterHours && phone ? (
          <button type="button" className="text-sm font-semibold text-[#1E90FF]" onClick={() => setOpenForm((current) => !current)}>
            {openForm ? "Hide the callback form" : "Request a call"}
          </button>
        ) : null}
        {!phone ? <p className="text-sm text-white/70">Request a call and a Venture Expert will reach out.</p> : null}
      </div>
      {openForm ? (
        done ? (
          <p className="mt-4 text-sm text-white">Thanks. A Venture Expert will call you.</p>
        ) : (
          <form className="mt-4 space-y-3" onSubmit={submit}>
            <label className="block text-sm font-medium" htmlFor={`${variant}-name`}>
              Name
            </label>
            <input id={`${variant}-name`} name="name" required className={fieldClass} autoComplete="name" />
            <label className="block text-sm font-medium" htmlFor={`${variant}-phone`}>
              Phone
            </label>
            <input id={`${variant}-phone`} name="phone" type="tel" required className={fieldClass} autoComplete="tel" />
            <p className="text-sm font-medium">Best time</p>
            <div className="grid grid-cols-2 gap-2">
              {TIMES.map((time) => (
                <button
                  key={time}
                  type="button"
                  className={`h-12 rounded-xl border text-sm font-semibold ${bestTime === time ? "border-[#1E90FF] bg-[#1E90FF] text-white" : "border-white/15"}`}
                  onClick={() => setBestTime(time)}
                >
                  {time}
                </button>
              ))}
            </div>
            {error ? <p className="text-sm text-rose-200">{error}</p> : null}
            <button type="submit" disabled={pending || !bestTime} className="h-12 w-full rounded-lg bg-white text-base font-semibold text-black disabled:opacity-50">
              {pending ? "Sending…" : "Request a call"}
            </button>
          </form>
        )
      ) : null}
    </section>
  );
}

const fieldClass =
  "h-12 w-full rounded-xl border border-white/15 bg-black px-3 text-base text-white outline-none focus:border-[#1E90FF]";
