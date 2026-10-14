"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { PlaceField } from "@/components/marketing/place-field";
import { TalkLine } from "@/components/marketing/talk-line";
import { manifestError, PROFILE_OPTIONS, type QuoteProfile } from "@/lib/quotes";
import type { QuotePlan } from "@/lib/guidance";

const MOVES = [
  ["AIRPORT_TRANSFER", "Airport transfer"],
  ["SHUTTLE_LOOP", "Shuttle loop"],
  ["POINT_TO_POINT", "Point-to-point"],
  ["DINE_AROUND", "Dine-around"],
] as const;

const GUEST_CHOICES = [
  ["15", "Under 15"],
  ["30", "15 to 30"],
  ["56", "31 to 56"],
  ["100", "57 to 100"],
] as const;

const WAITS = ["15", "20", "30"] as const;

export function QuoteForm() {
  const router = useRouter();
  const [service, setService] = useState("");
  const [guestBand, setGuestBand] = useState("");
  const [guestExact, setGuestExact] = useState("");
  const [vehiclePreference, setVehiclePreference] = useState("");
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [stops, setStops] = useState<{ id: string; value: string }[]>([]);
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [waitMinutes, setWaitMinutes] = useState("");
  const [driveMinutes, setDriveMinutes] = useState("");
  const [profile, setProfile] = useState<QuoteProfile | "">("");
  const [repBump, setRepBump] = useState(0);
  const [plan, setPlan] = useState<QuotePlan | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [manifestName, setManifestName] = useState<string | null>(null);

  const guestCount = guestExact || guestBand;
  const ready = Boolean(service && guestCount && pickup.trim().length >= 2 && dropoff.trim().length >= 2 && startTime && (service !== "SHUTTLE_LOOP" || waitMinutes));
  const repTotal = plan ? plan.repCount + repBump : 0;
  const stopValues = stops.map((stop) => stop.value.trim()).filter((stop) => stop.length >= 2);
  const stopKey = stopValues.join("|");

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const response = await fetch("/api/quotes/preview", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              serviceType: service,
              passengerCount: guestCount,
              pickup,
              dropoff,
              stops: stopKey ? stopKey.split("|") : [],
              waitMinutes,
              driveMinutes,
              vehiclePreference,
              startDate,
              endDate,
              startTime,
              endTime,
              representativeCount: repTotal,
            }),
          });
          const json = (await response.json()) as QuotePlan;
          if (!cancelled) setPlan(json);
        } catch {
          if (!cancelled) setPlan(null);
        }
      })();
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [ready, service, guestCount, pickup, dropoff, stopKey, waitMinutes, driveMinutes, vehiclePreference, startDate, endDate, startTime, endTime, repTotal]);

  function chooseService(value: string) {
    setService(value);
    if (value === "SHUTTLE_LOOP" && !waitMinutes) setWaitMinutes("20");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = new FormData(form);
    const file = body.get("manifest");
    if (file instanceof File && file.size > 0) {
      const fileError = manifestError(file);
      if (fileError) {
        setErrors({ manifest: fileError });
        setFormError(fileError);
        return;
      }
    }
    setPending(true);
    setErrors({});
    setFormError(null);
    try {
      const response = await fetch("/api/quotes", { method: "POST", body, headers: { Accept: "application/json" } });
      const json = (await response.json()) as { error?: string; fieldErrors?: Record<string, string>; reference?: string; needsExpertCall?: boolean };
      if (!response.ok) {
        setErrors(json.fieldErrors ?? {});
        setFormError(json.error ?? "We couldn't save that request.");
        return;
      }
      const expert = json.needsExpertCall ? "&expert=1" : "";
      router.push(`/quote/received?ref=${encodeURIComponent(json.reference ?? "")}${expert}`);
    } catch {
      setFormError("The request didn't go through. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form id="quote-form" className="space-y-8" onSubmit={onSubmit}>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">The move</h2>
        <div className="grid grid-cols-2 gap-2">
          {MOVES.map(([value, label]) => (
            <Choice key={value} selected={service === value} onClick={() => chooseService(value)}>
              {label}
            </Choice>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Guests</h2>
        <div className="grid grid-cols-2 gap-2">
          {GUEST_CHOICES.map(([value, label]) => (
            <Choice key={value} selected={guestBand === value && !guestExact} onClick={() => { setGuestBand(value); setGuestExact(""); }}>
              {label}
            </Choice>
          ))}
        </div>
        <label className="block text-sm" htmlFor="guestExact">Exact count, if you have it</label>
        <input id="guestExact" inputMode="numeric" value={guestExact} onChange={(event) => setGuestExact(event.target.value.replace(/\D/g, "").slice(0, 5))} className={fieldClass} placeholder="80" />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">When</h2>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={`h-10 rounded-full px-3 text-sm font-semibold ${startDate === tomorrowET() ? "bg-[#1E90FF] text-white" : "border border-white/15"}`} onClick={() => setStartDate(tomorrowET())}>
            Tomorrow
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date" name="startDateVisible">
            <input id="startDateVisible" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className={fieldClass} />
          </Field>
          <Field label="Start time" name="startTimeVisible">
            <input id="startTimeVisible" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} className={fieldClass} />
          </Field>
          <Field label="End date" name="endDateVisible">
            <input id="endDateVisible" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className={fieldClass} />
          </Field>
          <Field label="End time" name="endTimeVisible">
            <input id="endTimeVisible" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} className={fieldClass} />
          </Field>
        </div>
        {service === "SHUTTLE_LOOP" ? (
          <div>
            <p className="text-sm">Acceptable wait</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {WAITS.map((minutes) => (
                <Choice key={minutes} selected={waitMinutes === minutes} onClick={() => setWaitMinutes(minutes)}>
                  {minutes} min
                </Choice>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Places</h2>
        <label className="text-sm font-medium" htmlFor="pickup">Pickup</label>
        <PlaceField id="pickup" name="pickup-visible" value={pickup} onChange={setPickup} placeholder="Hotel, airport, or address" />
        <div className="mt-3 flex items-center justify-between">
          <p className="text-sm font-medium">Stops</p>
          <button type="button" className="text-sm font-semibold text-[#1E90FF]" onClick={() => setStops((current) => current.length >= 8 ? current : [...current, { id: crypto.randomUUID(), value: "" }])}>
            Add stop
          </button>
        </div>
        <ol className="space-y-2">
          {stops.map((stop, stopIndex) => (
            <li key={stop.id} className="rounded-xl border border-white/10 p-2">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-[#1E90FF]">STOP {stopIndex + 1}</span>
                <span className="flex gap-1">
                  <button type="button" className="h-10 px-2 text-xs disabled:opacity-30" disabled={stopIndex === 0} onClick={() => moveStop(stopIndex, -1)}>Up</button>
                  <button type="button" className="h-10 px-2 text-xs disabled:opacity-30" disabled={stopIndex === stops.length - 1} onClick={() => moveStop(stopIndex, 1)}>Down</button>
                  <button type="button" className="h-10 px-2 text-xs text-rose-200" onClick={() => setStops((current) => current.filter((item) => item.id !== stop.id))}>Remove</button>
                </span>
              </div>
              <PlaceField id={`stop-${stop.id}`} name="stop-visible" value={stop.value} onChange={(value) => setStops((current) => current.map((item) => item.id === stop.id ? { ...item, value } : item))} placeholder="Hotel, venue, or address" />
            </li>
          ))}
        </ol>
        <label className="text-sm font-medium" htmlFor="dropoff">Drop-off</label>
        <PlaceField id="dropoff" name="dropoff-visible" value={dropoff} onChange={setDropoff} placeholder="Hotel, venue, or address" />
      </section>

      <section aria-live="polite" className="rounded-2xl border border-[#1E90FF]/40 bg-[#1E90FF]/10 p-4">
        {ready && plan ? (
          <div className="space-y-2">
            <p className="text-lg font-semibold">{plan.headline}</p>
            {plan.math ? <p className="text-sm leading-relaxed">{plan.math}</p> : null}
            {plan.repCount > 0 ? (
              <div>
                <p className="text-sm">Venture Reps on site. You can add more.</p>
                <div className="mt-2 flex items-center gap-2">
                  <button type="button" className="grid size-11 place-items-center rounded-lg border border-white/20 disabled:opacity-30" disabled={repBump <= 0} onClick={() => setRepBump((current) => Math.max(0, current - 1))} aria-label="Fewer Venture Reps">−</button>
                  <span className="min-w-12 text-center text-2xl font-semibold">{repTotal}</span>
                  <button type="button" className="grid size-11 place-items-center rounded-lg border border-white/20" onClick={() => setRepBump((current) => current + 1)} aria-label="More Venture Reps">+</button>
                </div>
              </div>
            ) : null}
            <p className="text-sm font-semibold">{plan.priceLabel}</p>
            <p className="text-xs text-white/60">A recommendation, not a confirmed plan.</p>
            {plan.driveSource === "missing" ? (
              <div>
                <label className="text-sm" htmlFor="driveFix">Drive minutes each way</label>
                <input id="driveFix" inputMode="numeric" value={driveMinutes} onChange={(event) => setDriveMinutes(event.target.value.replace(/\D/g, "").slice(0, 3))} className={fieldClass} placeholder="12" />
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-white/75">Add the guests, a start time, a pickup, and a drop-off. The plan shows up here and updates as the stops change.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">How should we follow up?</h2>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-white/5 p-1">
          {PROFILE_OPTIONS.map((option) => (
            <button key={option.value} type="button" className={`min-h-12 rounded-lg px-1 text-[12px] font-semibold ${profile === option.value ? "bg-[#1E90FF] text-white" : "text-white/70"}`} onClick={() => setProfile(option.value)}>
              {option.label}
            </button>
          ))}
        </div>
        <label className="block text-sm" htmlFor="contactName">Name</label>
        <input id="contactName" name="contactName" className={fieldClass} autoComplete="name" />
        <label className="block text-sm" htmlFor="company">Company or group</label>
        <input id="company" name="company" className={fieldClass} autoComplete="organization" />
        <label className="block text-sm" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" className={fieldClass} autoComplete="email" />
        <label className="block text-sm" htmlFor="phone">Phone</label>
        <input id="phone" name="phone" type="tel" className={fieldClass} autoComplete="tel" />
        <label className="block text-sm" htmlFor="notes">Notes</label>
        <textarea id="notes" name="notes" className={`${fieldClass} min-h-24 py-3`} />
        <label htmlFor="manifest" className="flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-dashed border-[#1E90FF]/50 px-3 text-sm">
          {manifestName ?? "Add a flight manifest (optional)"}
        </label>
        <input id="manifest" name="manifest" type="file" accept=".csv,.xlsx,.pdf,text/csv,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={(event) => setManifestName(event.target.files?.[0]?.name ?? null)} />
        {errors.manifest ? <p className="text-sm text-rose-200">{errors.manifest}</p> : null}
        <p className="text-sm text-white/60">Vehicle, if you have a preference. Otherwise we choose.</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            ["", "You choose"],
            ["COACH", "Motorcoach"],
            ["MINIBUS", "Minicoach"],
            ["SPRINTER", "Sprinter"],
            ["SUV", "SUV"],
          ].map(([value, label]) => (
            <Choice key={label} selected={vehiclePreference === value} onClick={() => setVehiclePreference(value)}>
              {label}
            </Choice>
          ))}
        </div>
      </section>

      <input type="hidden" name="profile" value={profile} />
      <input type="hidden" name="serviceType" value={service} />
      <input type="hidden" name="passengerCount" value={guestCount} />
      <input type="hidden" name="vehiclePreference" value={vehiclePreference} />
      <input type="hidden" name="pickup" value={pickup} />
      <input type="hidden" name="dropoff" value={dropoff} />
      {stopValues.map((stop, index) => <input key={`${stop}-${index}`} type="hidden" name="stops" value={stop} />)}
      <input type="hidden" name="startDate" value={startDate} />
      <input type="hidden" name="startTime" value={startTime} />
      <input type="hidden" name="endDate" value={endDate} />
      <input type="hidden" name="endTime" value={endTime} />
      <input type="hidden" name="waitMinutes" value={waitMinutes} />
      <input type="hidden" name="driveMinutes" value={driveMinutes} />
      <input type="hidden" name="luggage" value="NONE" />
      <input type="hidden" name="vehicleCount" value={plan?.vehicleCount ?? 0} />
      <input type="hidden" name="coordinatorNeeded" value={repTotal > 0 ? "yes" : "no"} />
      <input type="hidden" name="representativeCount" value={repTotal} />
      <input type="hidden" name="unsureSteps" value="[]" />

      {formError ? <p className="text-sm text-rose-200">{formError}</p> : null}
      <button type="submit" disabled={pending} className="h-12 w-full rounded-lg bg-[#1E90FF] text-base font-semibold text-white disabled:opacity-60">
        {pending ? "Sending…" : "Get my quote"}
      </button>
      <TalkLine />
    </form>
  );

  function moveStop(stopIndex: number, delta: number) {
    setStops((current) => {
      const next = [...current];
      const [item] = next.splice(stopIndex, 1);
      next.splice(stopIndex + delta, 0, item);
      return next;
    });
  }
}

function tomorrowET() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const [year, month, day] = parts.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function Field({ label, name, children }: { label: string; name: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm" htmlFor={name}>{label}</label>
      {children}
    </div>
  );
}

function Choice({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`min-h-14 w-full rounded-xl border px-3 text-left text-sm font-semibold ${selected ? "border-[#1E90FF] bg-[#1E90FF] text-white" : "border-white/15 bg-black text-white"}`}>
      {children}
    </button>
  );
}

const fieldClass = "h-12 w-full rounded-xl border border-white/15 bg-black px-3 text-base text-white outline-none focus:border-[#1E90FF]";
