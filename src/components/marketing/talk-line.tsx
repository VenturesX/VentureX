"use client";

import { useEffect, useState } from "react";
import { isLiveLineOpen, type OfficeHours } from "@/lib/guidance";

const TIMES = ["Morning", "Afternoon", "Evening", "Anytime"];

export function TalkLine() {
  const [phone, setPhone] = useState("");
  const [tel, setTel] = useState("");
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
      .then((json: { phone?: string; tel?: string; hours?: OfficeHours | null; hoursLabel?: string }) => {
        if (cancelled) return;
        setPhone(json.phone ?? "");
        setTel(json.tel ?? "");
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
    <div className="text-sm leading-relaxed text-white/55">
      <p>
        Prefer to talk?{" "}
        {phone ? (
          <a className="underline decoration-white/30" href={`tel:${tel}`}>
            Call {phone}
          </a>
        ) : null}
        {phone ? " or " : null}
        <button type="button" className="underline decoration-white/30" onClick={() => setOpen((current) => !current)}>
          request a call
        </button>
        .
      </p>
      {afterHours && hoursLabel ? <p className="mt-1 text-xs text-white/40">Live line {hoursLabel}.</p> : null}
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

export function FooterPhone() {
  const [phone, setPhone] = useState("");
  const [tel, setTel] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/help")
      .then((response) => response.json())
      .then((json: { phone?: string; tel?: string }) => {
        if (cancelled) return;
        setPhone(json.phone ?? "");
        setTel(json.tel ?? "");
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (!phone || !tel) return null;
  return (
    <a href={`tel:${tel}`} className="text-xs text-white/40 hover:text-white/70">
      {phone}
    </a>
  );
}

const fieldClass = "h-10 w-full rounded-lg border border-white/15 bg-black px-3 text-sm text-white outline-none focus:border-[#1E90FF]";
