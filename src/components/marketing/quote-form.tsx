"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { PlaceField } from "@/components/marketing/place-field";
import { ExpertHelp } from "@/components/marketing/expert-help";
import { manifestError, PROFILE_OPTIONS, type QuoteProfile } from "@/lib/quotes";
import type { QuotePlan } from "@/lib/guidance";

const MOVES = [
  ["AIRPORT_TRANSFER", "Airport transfers"],
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

type StepId = "move" | "guests" | "places" | "when" | "wait" | "suggestion" | "contact";

export function QuoteForm({ repPriceLabel }: { repPriceLabel: string }) {
  const router = useRouter();
  const [step, setStep] = useState<StepId>("move");
  const [service, setService] = useState("");
  const [unsure, setUnsure] = useState<string[]>([]);
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
  const [planError, setPlanError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [manifestName, setManifestName] = useState<string | null>(null);

  const steps = useMemo<StepId[]>(() => {
    const list: StepId[] = ["move", "guests", "places", "when"];
    if (service === "SHUTTLE_LOOP") list.push("wait");
    list.push("suggestion", "contact");
    return list;
  }, [service]);
  const index = Math.max(0, steps.indexOf(step));
  const guestCount = guestExact || guestBand;

  function markUnsure() {
    setUnsure((current) => (current.includes(step) ? current : [...current, step]));
    go(1);
  }

  function go(delta: number) {
    const next = steps[index + delta];
    if (!next) return;
    setStep(next);
    if (next === "suggestion") void loadPlan();
  }

  async function loadPlan(overrides?: { driveMinutes?: string; waitMinutes?: string; guestCount?: string }) {
    setPlanError(null);
    try {
      const response = await fetch("/api/quotes/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceType: service,
          passengerCount: overrides?.guestCount ?? guestCount,
          pickup,
          dropoff,
          stops: stops.map((stop) => stop.value),
          waitMinutes: overrides?.waitMinutes ?? waitMinutes,
          driveMinutes: overrides?.driveMinutes ?? driveMinutes,
          vehiclePreference,
          startDate,
          unsureSteps: unsure,
        }),
      });
      const json = (await response.json()) as QuotePlan;
      setPlan(json);
      setRepBump(0);
    } catch {
      setPlanError("We couldn't build a suggestion just now. You can still send what you have.");
    }
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

  const repTotal = plan ? plan.repCount + repBump : 0;

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <ExpertHelp variant="bar" />
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1E90FF]">
          Step {index + 1} of {steps.length}
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full bg-[#1E90FF]" style={{ width: `${((index + 1) / steps.length) * 100}%` }} />
        </div>
      </div>

      {step === "move" ? (
        <Step title="What kind of move is this?">
          {MOVES.map(([value, label]) => (
            <Choice key={value} selected={service === value} onClick={() => { setService(value); setStep(value === "SHUTTLE_LOOP" ? "guests" : "guests"); }}>
              {label}
            </Choice>
          ))}
        </Step>
      ) : null}

      {step === "guests" ? (
        <Step title="About how many guests?">
          <div className="grid grid-cols-2 gap-2">
            {GUEST_CHOICES.map(([value, label]) => (
              <Choice key={value} selected={guestBand === value && !guestExact} onClick={() => { setGuestBand(value); setGuestExact(""); }}>
                {label}
              </Choice>
            ))}
          </div>
          <label className="mt-3 block text-sm" htmlFor="guestExact">Exact count, if you have it</label>
          <input id="guestExact" inputMode="numeric" value={guestExact} onChange={(event) => setGuestExact(event.target.value.replace(/\D/g, "").slice(0, 5))} className={fieldClass} placeholder="80" />
          <p className="mt-4 text-sm text-white/70">A vehicle in mind? Skip this if you don&apos;t.</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
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
        </Step>
      ) : null}

      {step === "places" ? (
        <Step title="Where does the group go?">
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
                    <IconButton label="Move stop up" disabled={stopIndex === 0} onClick={() => moveStop(stopIndex, -1)}>Up</IconButton>
                    <IconButton label="Move stop down" disabled={stopIndex === stops.length - 1} onClick={() => moveStop(stopIndex, 1)}>Down</IconButton>
                    <button type="button" className="h-10 px-2 text-xs text-rose-200" onClick={() => setStops((current) => current.filter((item) => item.id !== stop.id))}>Remove</button>
                  </span>
                </div>
                <PlaceField id={`stop-${stop.id}`} name="stop-visible" value={stop.value} onChange={(value) => setStops((current) => current.map((item) => item.id === stop.id ? { ...item, value } : item))} placeholder="Hotel, venue, or address" />
              </li>
            ))}
          </ol>
          <label className="mt-3 block text-sm font-medium" htmlFor="dropoff">Final drop-off</label>
          <PlaceField id="dropoff" name="dropoff-visible" value={dropoff} onChange={setDropoff} placeholder="Hotel, venue, or address" />
        </Step>
      ) : null}

      {step === "when" ? (
        <Step title="When does it happen?">
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
        </Step>
      ) : null}

      {step === "wait" ? (
        <Step title="How long can guests wait?">
          <div className="grid grid-cols-3 gap-2">
            {WAITS.map((minutes) => (
              <Choice key={minutes} selected={waitMinutes === minutes} onClick={() => setWaitMinutes(minutes)}>
                {minutes} min
              </Choice>
            ))}
          </div>
          <label className="mt-4 block text-sm" htmlFor="driveMinutesVisible">Drive minutes each way, if you know them</label>
          <input id="driveMinutesVisible" inputMode="numeric" value={driveMinutes} onChange={(event) => setDriveMinutes(event.target.value.replace(/\D/g, "").slice(0, 3))} className={fieldClass} placeholder="12" />
          <p className="mt-2 text-xs leading-relaxed text-white/55">Leave this blank if you don&apos;t. We&apos;ll use a saved drive time when we recognize the stops.</p>
        </Step>
      ) : null}

      {step === "suggestion" ? (
        <Step title="Here's what we'd suggest">
          {plan ? (
            <div className="rounded-2xl border border-[#1E90FF]/40 bg-[#1E90FF]/10 p-4">
              <p className="text-lg font-semibold">{plan.headline}</p>
              {plan.math ? <p className="mt-2 text-sm leading-relaxed text-white">{plan.math}</p> : null}
              <p className="mt-2 text-sm leading-relaxed text-white/75">{plan.detail}</p>
              {plan.repCount > 0 ? (
                <div className="mt-4">
                  <p className="text-sm">Venture Reps on site. You can add more.</p>
                  <div className="mt-2 flex items-center gap-2">
                    <button type="button" className="grid size-11 place-items-center rounded-lg border border-white/20 disabled:opacity-30" disabled={repBump <= 0} onClick={() => setRepBump((current) => Math.max(0, current - 1))} aria-label="Fewer Venture Reps">−</button>
                    <span className="min-w-12 text-center text-2xl font-semibold">{repTotal}</span>
                    <button type="button" className="grid size-11 place-items-center rounded-lg border border-white/20" onClick={() => setRepBump((current) => current + 1)} aria-label="More Venture Reps">+</button>
                  </div>
                  <p className="mt-2 text-sm text-white/70">{repPriceLabel}</p>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-white/70">{planError ?? "Working out a suggestion…"}</p>
          )}
          {service === "SHUTTLE_LOOP" && plan?.driveSource === "missing" ? (
            <div className="mt-3">
              <label className="text-sm" htmlFor="driveFix">Drive minutes each way</label>
              <input id="driveFix" inputMode="numeric" value={driveMinutes} onChange={(event) => setDriveMinutes(event.target.value.replace(/\D/g, "").slice(0, 3))} className={fieldClass} placeholder="12" />
              <button type="button" className="mt-2 text-sm font-semibold text-[#1E90FF]" onClick={() => void loadPlan()}>Update the suggestion</button>
            </div>
          ) : null}
        </Step>
      ) : null}

      {step === "contact" ? (
        <Step title="How can we reach you?">
          <p className="text-sm text-white/65">All of this can wait. Send what you have and a Venture Expert will help fill the gaps.</p>
          <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-white/5 p-1">
            {PROFILE_OPTIONS.map((option) => (
              <button key={option.value} type="button" className={`min-h-14 rounded-lg px-1 text-[12px] font-semibold ${profile === option.value ? "bg-[#1E90FF] text-white" : "text-white/70"}`} onClick={() => setProfile(option.value)}>
                {option.label}
              </button>
            ))}
          </div>
          <label className="mt-3 block text-sm" htmlFor="contactName">Name</label>
          <input id="contactName" name="contactName" className={fieldClass} autoComplete="name" />
          <label className="mt-3 block text-sm" htmlFor="company">Company or group</label>
          <input id="company" name="company" className={fieldClass} autoComplete="organization" />
          <label className="mt-3 block text-sm" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" className={fieldClass} autoComplete="email" />
          <label className="mt-3 block text-sm" htmlFor="phone">Phone</label>
          <input id="phone" name="phone" type="tel" className={fieldClass} autoComplete="tel" />
          <label className="mt-3 block text-sm" htmlFor="notes">Notes</label>
          <textarea id="notes" name="notes" className={`${fieldClass} min-h-24 py-3`} />
          <label htmlFor="manifest" className="mt-3 flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-dashed border-[#1E90FF]/50 px-3 text-sm">
            {manifestName ?? "Add a flight manifest (optional)"}
          </label>
          <input id="manifest" name="manifest" type="file" accept=".csv,.xlsx,.pdf,text/csv,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={(event) => setManifestName(event.target.files?.[0]?.name ?? null)} />
          {errors.manifest ? <p className="text-sm text-rose-200">{errors.manifest}</p> : null}
        </Step>
      ) : null}

      <input type="hidden" name="profile" value={profile} />
      <input type="hidden" name="serviceType" value={service} />
      <input type="hidden" name="passengerCount" value={guestCount} />
      <input type="hidden" name="vehiclePreference" value={vehiclePreference} />
      <input type="hidden" name="pickup" value={pickup} />
      <input type="hidden" name="dropoff" value={dropoff} />
      {stops.filter((stop) => stop.value.trim().length >= 2).map((stop) => <input key={stop.id} type="hidden" name="stops" value={stop.value} />)}
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
      <input type="hidden" name="unsureSteps" value={JSON.stringify(unsure)} />

      {formError ? <p className="text-sm text-rose-200">{formError}</p> : null}

      <div className="flex flex-col gap-2">
        {step !== "contact" ? (
          <button type="button" className="h-12 w-full rounded-lg bg-[#1E90FF] text-base font-semibold text-white" onClick={() => go(1)}>
            Continue
          </button>
        ) : (
          <button type="submit" disabled={pending} className="h-12 w-full rounded-lg bg-[#1E90FF] text-base font-semibold text-white disabled:opacity-60">
            {pending ? "Sending…" : "Send request"}
          </button>
        )}
        {step !== "suggestion" && step !== "contact" ? (
          <button type="button" className="h-12 w-full rounded-xl border border-white/20 text-sm font-semibold" onClick={markUnsure}>
            I&apos;m not sure, help me
          </button>
        ) : null}
        {step !== "contact" ? (
          <button type="submit" className="text-sm font-semibold text-[#1E90FF]">
            Send what I have
          </button>
        ) : null}
        {index > 0 ? (
          <button type="button" className="text-sm text-white/60" onClick={() => go(-1)}>
            Back
          </button>
        ) : null}
      </div>
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

function Step({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
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
    <button type="button" onClick={onClick} className={`min-h-14 w-full rounded-xl border px-4 text-left text-base font-semibold ${selected ? "border-[#1E90FF] bg-[#1E90FF] text-white" : "border-white/15 bg-black text-white"}`}>
      {children}
    </button>
  );
}

function IconButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} disabled={disabled} onClick={onClick} className="h-10 px-2 text-xs disabled:opacity-30">
      {children}
    </button>
  );
}

const fieldClass = "h-12 w-full rounded-xl border border-white/15 bg-black px-3 text-base text-white outline-none focus:border-[#1E90FF]";
