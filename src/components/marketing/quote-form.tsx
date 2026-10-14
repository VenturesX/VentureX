"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  LUGGAGE_OPTIONS,
  PROFILE_OPTIONS,
  SERVICE_OPTIONS,
  VEHICLE_OPTIONS,
  manifestError,
  parseQuoteFields,
  type QuoteProfile,
} from "@/lib/quotes";

const fieldClass =
  "h-12 w-full min-w-0 rounded-xl border border-white/15 bg-black px-3 text-base text-white outline-none placeholder:text-white/45 focus:border-[#1E90FF] focus:ring-2 focus:ring-[#1E90FF]/40";

export function QuoteForm() {
  const router = useRouter();
  const [profile, setProfile] = useState<QuoteProfile>("PLANNER");
  const [coordinator, setCoordinator] = useState("");
  const [manifestName, setManifestName] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const profileHint = useMemo(
    () => PROFILE_OPTIONS.find((option) => option.value === profile)?.hint,
    [profile],
  );
  const companyRequired = profile !== "GROUP";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = new FormData(form);
    const parsed = parseQuoteFields(body);
    const file = body.get("manifest");
    const nextErrors = parsed.ok ? {} : { ...parsed.fieldErrors };
    if (file instanceof File && file.size > 0) {
      const fileError = manifestError(file);
      if (fileError) nextErrors.manifest = fileError;
    }
    if (!parsed.ok || nextErrors.manifest) {
      setErrors(nextErrors);
      setFormError("Check the highlighted fields and try again.");
      scrollToError();
      return;
    }

    setPending(true);
    setErrors({});
    setFormError(null);
    try {
      const response = await fetch("/api/quotes", {
        method: "POST",
        body,
        headers: { Accept: "application/json" },
      });
      const json = (await response.json()) as { error?: string; fieldErrors?: Record<string, string>; reference?: string };
      if (!response.ok) {
        setErrors(json.fieldErrors ?? {});
        setFormError(json.error ?? "We couldn't save that request.");
        scrollToError();
        return;
      }
      router.push(`/quote/received?ref=${encodeURIComponent(json.reference ?? "")}`);
    } catch {
      setFormError("The request didn't go through. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="space-y-8" onSubmit={onSubmit} noValidate>
      <fieldset data-field-error={errors.profile ? "" : undefined}>
        <legend className="text-sm font-semibold">Who is this for?</legend>
        <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-white/5 p-1" role="radiogroup" aria-label="Profile">
          {PROFILE_OPTIONS.map((option) => {
            const selected = profile === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`min-h-14 rounded-lg px-1.5 py-2 text-center text-[12px] font-semibold leading-tight ${
                  selected ? "bg-[#1E90FF] text-white" : "text-white/70"
                }`}
                onClick={() => setProfile(option.value)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <input type="hidden" name="profile" value={profile} />
        <p className="mt-3 text-sm leading-relaxed text-white/65" aria-live="polite">
          {profileHint}
        </p>
        <FieldError message={errors.profile} />
      </fieldset>

      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1E90FF]">The move</h2>
        <Field label="Service" name="serviceType" error={errors.serviceType} required>
          <select id="serviceType" name="serviceType" className={inputClass(errors.serviceType)} defaultValue="" aria-invalid={Boolean(errors.serviceType)}>
            <option value="" disabled>
              Select a service
            </option>
            {SERVICE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date" name="startDate" error={errors.startDate} required>
            <input id="startDate" name="startDate" type="date" className={inputClass(errors.startDate)} aria-invalid={Boolean(errors.startDate)} />
          </Field>
          <Field label="Start time" name="startTime" error={errors.startTime} hint="Optional">
            <input id="startTime" name="startTime" type="time" className={inputClass(errors.startTime)} aria-invalid={Boolean(errors.startTime)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="End date" name="endDate" error={errors.endDate} hint="Optional">
            <input id="endDate" name="endDate" type="date" className={inputClass(errors.endDate)} aria-invalid={Boolean(errors.endDate)} />
          </Field>
          <Field label="End time" name="endTime" error={errors.endTime} hint="Optional">
            <input id="endTime" name="endTime" type="time" className={inputClass(errors.endTime)} aria-invalid={Boolean(errors.endTime)} />
          </Field>
        </div>
        <Field label="Pickup" name="pickup" error={errors.pickup} required>
          <input id="pickup" name="pickup" className={inputClass(errors.pickup)} placeholder="MCO Terminal C, baggage claim" autoComplete="off" aria-invalid={Boolean(errors.pickup)} />
        </Field>
        <Field label="Drop-off" name="dropoff" error={errors.dropoff} required>
          <input id="dropoff" name="dropoff" className={inputClass(errors.dropoff)} placeholder="Hotel or venue" autoComplete="off" aria-invalid={Boolean(errors.dropoff)} />
        </Field>
        <Field label="Passengers" name="passengerCount" error={errors.passengerCount} required>
          <input
            id="passengerCount"
            name="passengerCount"
            inputMode="numeric"
            className={inputClass(errors.passengerCount)}
            placeholder="24"
            aria-invalid={Boolean(errors.passengerCount)}
          />
        </Field>
      </section>

      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1E90FF]">The group</h2>
        <Field label="Vehicle preference" name="vehiclePreference" error={errors.vehiclePreference} required>
          <select id="vehiclePreference" name="vehiclePreference" className={inputClass(errors.vehiclePreference)} defaultValue="" aria-invalid={Boolean(errors.vehiclePreference)}>
            <option value="" disabled>
              Select a vehicle
            </option>
            {VEHICLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Luggage" name="luggage" error={errors.luggage} required>
          <select id="luggage" name="luggage" className={inputClass(errors.luggage)} defaultValue="" aria-invalid={Boolean(errors.luggage)}>
            <option value="" disabled>
              Select luggage
            </option>
            {LUGGAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <fieldset data-field-error={errors.coordinatorNeeded ? "" : undefined}>
          <legend className="text-sm font-medium">
            On-site coordinator needed <span className="text-[#1E90FF]">*</span>
          </legend>
          <div className="mt-2 grid grid-cols-2 gap-2" role="radiogroup" aria-label="On-site coordinator needed">
            {[
              ["yes", "Yes"],
              ["no", "No"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={coordinator === value}
                className={`h-12 rounded-xl border text-base font-semibold ${
                  coordinator === value ? "border-[#1E90FF] bg-[#1E90FF] text-white" : "border-white/15 bg-black text-white"
                }`}
                onClick={() => setCoordinator(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <input type="hidden" name="coordinatorNeeded" value={coordinator} />
          <FieldError message={errors.coordinatorNeeded} />
        </fieldset>
      </section>

      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1E90FF]">How to reach you</h2>
        <Field label="Name" name="contactName" error={errors.contactName} required>
          <input id="contactName" name="contactName" autoComplete="name" className={inputClass(errors.contactName)} aria-invalid={Boolean(errors.contactName)} />
        </Field>
        <Field label={companyRequired ? "Company" : "Group or company"} name="company" error={errors.company} required={companyRequired} hint={companyRequired ? undefined : "Optional"}>
          <input id="company" name="company" autoComplete="organization" className={inputClass(errors.company)} aria-invalid={Boolean(errors.company)} />
        </Field>
        <Field label="Email" name="email" error={errors.email} required>
          <input id="email" name="email" type="email" autoComplete="email" inputMode="email" className={inputClass(errors.email)} aria-invalid={Boolean(errors.email)} />
        </Field>
        <Field label="Phone" name="phone" error={errors.phone} required>
          <input id="phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" className={inputClass(errors.phone)} aria-invalid={Boolean(errors.phone)} />
        </Field>
        <Field label="Notes" name="notes" error={errors.notes} hint="Optional. Extra stops, flight numbers, hotel, or access needs.">
          <textarea id="notes" name="notes" className={`${inputClass(errors.notes)} min-h-28 py-3`} aria-invalid={Boolean(errors.notes)} />
        </Field>
        <div data-field-error={errors.manifest ? "" : undefined}>
          <label htmlFor="manifest" className="flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-dashed border-[#1E90FF]/50 px-3 py-3 text-center text-sm">
            {manifestName ?? "Add a flight manifest (optional)"}
          </label>
          <input
            id="manifest"
            name="manifest"
            type="file"
            accept=".csv,.xlsx,.pdf,text/csv,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              setManifestName(file ? file.name : null);
            }}
          />
          <p className="mt-2 text-xs text-white/55">CSV, Excel (.xlsx), or PDF. Up to 8 MB. Used only to price and plan the move.</p>
          <FieldError message={errors.manifest} />
        </div>
      </section>

      {formError ? (
        <p role="alert" className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-3 text-sm text-rose-100">
          {formError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-[#1E90FF] text-base font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Sending…" : "Submit request"}
      </button>
      <p className="text-xs leading-relaxed text-white/50">
        All transportation is provided by appropriately licensed operators; we manage planning, scheduling, and day-of coordination.
      </p>
    </form>
  );
}

function inputClass(error?: string) {
  return error ? `${fieldClass} border-rose-400` : fieldClass;
}

function Field({
  label,
  name,
  error,
  required,
  hint,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0" data-field-error={error ? "" : undefined}>
      <label htmlFor={name} className="mb-1.5 flex items-center gap-2 text-sm font-medium">
        {label}
        {required ? <span className="text-[#1E90FF]">*</span> : null}
      </label>
      {children}
      {hint ? <p className="mt-1.5 text-xs text-white/50">{hint}</p> : null}
      <FieldError message={error} />
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1.5 text-sm text-rose-200">
      {message}
    </p>
  );
}

function scrollToError() {
  requestAnimationFrame(() => {
    document.querySelector("[data-field-error]")?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}
