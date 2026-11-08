"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { PlaceField } from "@/components/marketing/place-field";
import { TalkLine } from "@/components/marketing/talk-line";
import { OTHER_CITY } from "@/lib/brand";
import { requiresMarketCity } from "@/lib/service-area";
import { manifestError, PROFILE_OPTIONS, QUOTE_MARKETS, type QuoteProfile } from "@/lib/quotes";
import { GUEST_COUNT_MAX, GUEST_RANGES, formatGuestCount, guestRangeFor, type QuotePlan } from "@/lib/guidance";

const MOVES = [
  ["AIRPORT_TRANSFER", "Airport transfer"],
  ["SHUTTLE_LOOP", "Shuttle loop"],
  ["POINT_TO_POINT", "Point-to-point"],
  ["DINE_AROUND", "Dine-around"],
] as const;

const WAITS = [
  ["15", "15 min"],
  ["20", "20 min"],
  ["30", "30 min"],
  ["varies", "Varies / mix"],
] as const;

export function QuoteForm({ initialMarket }: { initialMarket?: (typeof QUOTE_MARKETS)[number] }) {
  const router = useRouter();
  const [market, setMarket] = useState<(typeof QUOTE_MARKETS)[number]>(initialMarket ?? "Orlando");
  const [marketCity, setMarketCity] = useState("");
  const [service, setService] = useState("");
  const [guestExact, setGuestExact] = useState("");
  const [guestRangeId, setGuestRangeId] = useState<string | null>(null);
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

  const selectedRange = GUEST_RANGES.find((range) => range.id === guestRangeId);
  const guestCount = guestExact || (selectedRange?.size ? String(selectedRange.size) : "");
  const guestNumber = Number(guestCount) || 0;
  const activeRange = guestExact ? guestRangeFor(Number(guestExact)) : selectedRange;
  const usesGuestEstimate = !guestExact && Boolean(selectedRange?.size);
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
              waitMinutes: waitMinutes === "varies" ? undefined : Number(waitMinutes) || undefined,
              waitVaries: waitMinutes === "varies",
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
    if (usesGuestEstimate && selectedRange) {
      const notes = String(body.get("notes") ?? "").trim();
      body.set("notes", `${notes}${notes ? "\n\n" : ""}Guest count is a planning estimate of ${guestCount} from the selected ${selectedRange.label} range; exact count to be confirmed.`);
    }
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
        <h2 className="text-xl font-semibold">Market</h2>
        <div className="grid grid-cols-2 gap-2">
          {QUOTE_MARKETS.map((item) => (
            <Choice key={item} selected={market === item} onClick={() => setMarket(item)}>
              {item}
            </Choice>
          ))}
        </div>
        <input type="hidden" name="market" value={market} />
        {requiresMarketCity(market) ? (
          <label className="block text-sm" htmlFor="marketCity">City and state
            <input id="marketCity" value={marketCity} onChange={(event) => setMarketCity(event.target.value)} placeholder={market === OTHER_CITY ? "City, state" : "City, FL"} required className={`${fieldClass} mt-1`} />
          </label>
        ) : null}
        <input type="hidden" name="marketCity" value={requiresMarketCity(market) ? marketCity : ""} />
        {market === OTHER_CITY ? <p className="text-sm text-white/60">Tell us your city. We will confirm availability and follow up with you.</p> : null}
      </section>
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

      <section id="guests" className="space-y-3">
        <h2 className="text-xl font-semibold">Guests</h2>
        <p id="guest-count-help" className="text-sm text-white/70">Choose a range for a planning estimate, or enter your guest count. For 1,000+ guests, enter a count so we can size your program.</p>
        <div className="grid grid-cols-2 gap-2">
          {GUEST_RANGES.map((range) => (
            <Choice key={range.id} selected={activeRange?.id === range.id} onClick={() => { setGuestRangeId(range.id); setGuestExact(""); }}>
              {range.label}
            </Choice>
          ))}
        </div>
        <label className="block text-sm" htmlFor="guestExact">Guest count, if known</label>
        <input
          id="guestExact"
          inputMode="numeric"
          pattern="[0-9]*"
          enterKeyHint="done"
          autoComplete="off"
          required={selectedRange?.size === null}
          aria-describedby="guest-count-help"
          value={guestExact}
          onChange={(event) => setGuestExact(readGuestCount(event.target.value))}
          className="h-14 w-full rounded-xl border border-white/15 bg-black px-3 text-2xl font-semibold tracking-wide text-white outline-none focus:border-[#1E90FF]"
          placeholder="500"
        />
        {usesGuestEstimate ? <p className="text-sm text-white/70">Planning for up to {formatGuestCount(guestNumber)} guests. Enter a count above to refine the estimate.</p> : null}
        {selectedRange?.size === null && !guestExact ? <p className="text-sm text-white/70">Enter your expected guest count above. An estimate is welcome; we will confirm the final count with you.</p> : null}
        {errors.passengerCount ? <p role="alert" className="text-sm text-rose-200">{errors.passengerCount}</p> : null}
        {guestNumber >= 1000 ? <p className="text-sm text-white/60">{formatGuestCount(guestNumber)} guests</p> : null}
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
            <p className="text-sm font-medium">Average guest wait time</p>
            <p className="mt-1 text-sm text-white/60">How long a guest waits at the stop for the next shuttle.</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {WAITS.map(([value, label]) => (
                <Choice key={value} selected={waitMinutes === value} onClick={() => setWaitMinutes(value)}>
                  {label}
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

      <section id="live-plan" aria-live="polite" className="rounded-2xl border border-[#1E90FF]/40 bg-[#1E90FF]/10 p-4">
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
        <textarea id="notes" name="notes" maxLength={3800} className={`${fieldClass} min-h-24 py-3`} />
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
      <input type="hidden" name="waitMinutes" value={waitMinutes === "varies" ? "" : waitMinutes} />
      <input type="hidden" name="waitVaries" value={waitMinutes === "varies" ? "yes" : ""} />
      <input type="hidden" name="driveMinutes" value={driveMinutes} />
      <input type="hidden" name="luggage" value="NONE" />
      <input type="hidden" name="vehicleCount" value={plan?.vehicleCount ?? 0} />
      <input type="hidden" name="coordinatorNeeded" value={repTotal > 0 ? "yes" : "no"} />
      <input type="hidden" name="representativeCount" value={repTotal} />
      <input type="hidden" name="unsureSteps" value="[]" />

      {formError ? <p className="text-sm text-rose-200">{formError}</p> : null}
      <button type="submit" disabled={pending} className="h-12 w-full rounded-full bg-gradient-to-r from-[#1E90FF] to-[#8B5CF6] text-base font-semibold text-white disabled:opacity-60">
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

function readGuestCount(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 5);
  if (!digits) return "";
  const count = Number(digits);
  if (count > GUEST_COUNT_MAX) return String(GUEST_COUNT_MAX);
  return String(count);
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
    <button type="button" aria-pressed={selected} onClick={onClick} className={`min-h-14 w-full rounded-xl border px-3 text-left text-sm font-semibold ${selected ? "border-[#1E90FF] bg-[#1E90FF] text-white" : "border-white/15 bg-black text-white"}`}>
      {children}
    </button>
  );
}

const fieldClass = "h-12 w-full rounded-xl border border-white/15 bg-black px-3 text-base text-white outline-none focus:border-[#1E90FF]";
