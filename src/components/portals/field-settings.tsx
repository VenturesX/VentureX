"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { centsToDollars, type DrivePair, type FleetVehicle, type OfficeHours, type QuickAnswer, type RateCardRow, type TimingSettings } from "@/lib/guidance";

type Faq = { id: string; category: string; question: string; answer: string };
type RateDraft = { id: string; label: string; hourly: string; minimum: string; transfer: string; rep: string };

const RATE_LABELS: Record<string, string> = {
  COACH: "Motorcoach",
  MINIBUS: "Minicoach",
  SPRINTER: "Sprinter",
  SUV: "SUV",
};

const DAYS: Array<[number, string]> = [
  [1, "Mon"],
  [2, "Tue"],
  [3, "Wed"],
  [4, "Thu"],
  [5, "Fri"],
  [6, "Sat"],
  [0, "Sun"],
];

export function FieldSettings({ eventId }: { eventId: string }) {
  const [expertPhone, setExpertPhone] = useState("");
  const [directLine, setDirectLine] = useState("");
  const [eventLine, setEventLine] = useState("");
  const [guestPhone, setGuestPhone] = useState(false);
  const [hoursOn, setHoursOn] = useState(true);
  const [start, setStart] = useState("06:00");
  const [end, setEnd] = useState("18:00");
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [fleet, setFleet] = useState<FleetVehicle[]>([]);
  const [timing, setTiming] = useState<TimingSettings | null>(null);
  const [table, setTable] = useState<DrivePair[]>([]);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [rates, setRates] = useState<RateDraft[]>([]);
  const [quickAnswers, setQuickAnswers] = useState<QuickAnswer[]>([]);
  const [faqCategory, setFaqCategory] = useState("PICKUP");
  const [faqQuestion, setFaqQuestion] = useState("");
  const [faqAnswer, setFaqAnswer] = useState("");

  async function load() {
    const response = await fetch("/api/ops/settings");
    const json = await response.json();
    if (!response.ok) throw new Error(json.error ?? "Could not load settings");
    setExpertPhone(json.expertPhone ?? "");
    setDirectLine(json.defaultDirectLine ?? "");
    setEventLine(json.eventDirectLine ?? "");
    setGuestPhone(Boolean(json.guestPhoneEnabled));
    const hours = json.officeHours as OfficeHours | null;
    setHoursOn(Boolean(hours?.configured));
    setStart(hours?.start ?? "06:00");
    setEnd(hours?.end ?? "18:00");
    setDays(hours?.days ?? [1, 2, 3, 4, 5]);
    setFleet(json.fleet ?? []);
    setTiming(json.timing ?? null);
    setTable(json.driveTable ?? []);
    setFaqs(json.faqs ?? []);
    setRates(((json.rates ?? []) as RateCardRow[]).map((row) => ({
      id: row.id,
      label: RATE_LABELS[row.id] ?? row.id,
      hourly: centsToDollars(row.hourlyCents),
      minimum: row.minimumHours == null ? "" : String(row.minimumHours),
      transfer: centsToDollars(row.transferCents),
      rep: centsToDollars(row.repCents),
    })));
    setQuickAnswers(json.quickAnswers ?? []);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await load();
      } catch (error) {
        if (!cancelled) toast.error(error instanceof Error ? error.message : "Could not load settings");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(body: Record<string, unknown>, message: string) {
    const response = await fetch("/api/ops/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await response.json();
    if (!response.ok) {
      toast.error(json.error ?? "Could not save");
      return;
    }
    toast.success(message);
    await load();
  }

  return (
    <div className="mb-8 space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-primary">Settings</p>
        <h2 className="text-xl font-semibold">Lines, vehicles, and loop timing</h2>
      </div>
      <section className="space-y-3 rounded-2xl border border-white/10 bg-card p-4">
        <h3 className="font-semibold">Rate card</h3>
        <p className="text-xs text-muted-foreground">Leave a box blank until you have a rate. Empty rates show &ldquo;Price sent shortly&rdquo; on the quote. Transfers use the flat rate. Shuttle loops and dine-arounds use the hourly rate, at least the minimum hours.</p>
        {rates.map((row) => (
          <div key={row.id} className="space-y-2 rounded-xl bg-secondary/50 p-3">
            <p className="text-sm font-medium">{row.label}</p>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-muted-foreground">Hourly
                <Input className="mt-1" inputMode="decimal" value={row.hourly} placeholder="Blank" onChange={(event) => updateRate(row.id, "hourly", event.target.value)} />
              </label>
              <label className="text-xs text-muted-foreground">Minimum hours
                <Input className="mt-1" inputMode="decimal" value={row.minimum} placeholder="Blank" onChange={(event) => updateRate(row.id, "minimum", event.target.value)} />
              </label>
              <label className="text-xs text-muted-foreground">Transfer flat
                <Input className="mt-1" inputMode="decimal" value={row.transfer} placeholder="Blank" onChange={(event) => updateRate(row.id, "transfer", event.target.value)} />
              </label>
              <label className="text-xs text-muted-foreground">Per rep
                <Input className="mt-1" inputMode="decimal" value={row.rep} placeholder="Blank" onChange={(event) => updateRate(row.id, "rep", event.target.value)} />
              </label>
            </div>
          </div>
        ))}
        <Button className="h-11" onClick={() => void save({ rateCard: rates.map((row) => ({ id: row.id, hourly: row.hourly, minimum: row.minimum, transfer: row.transfer, rep: row.rep })) }, "Rate card saved")}>Save rate card</Button>
      </section>
      <section className="space-y-3 rounded-2xl border border-white/10 bg-card p-4">
        <h3 className="font-semibold">Quick answers</h3>
        <p className="text-xs text-muted-foreground">Shown on the quote page and the guest page. The bus-count chip still uses usable seats. No dollar amounts belong here.</p>
        {quickAnswers.map((row) => (
          <div key={row.id} className="space-y-2">
            <Input aria-label="Chip" value={row.chip} onChange={(event) => updateQuick(row.id, "chip", event.target.value)} />
            <Input aria-label="Answer" value={row.answer} onChange={(event) => updateQuick(row.id, "answer", event.target.value)} />
          </div>
        ))}
        <Button className="h-11" onClick={() => void save({ quickAnswers }, "Quick answers saved")}>Save quick answers</Button>
      </section>
      <section className="space-y-3 rounded-2xl border border-white/10 bg-card p-4">
        <h3 className="font-semibold">Venture Expert line</h3>
        <Input value={expertPhone} onChange={(event) => setExpertPhone(event.target.value)} placeholder="(407) 655-9795" />
        <Button className="h-11" onClick={() => void save({ expertPhone }, "Expert line saved")}>Save expert line</Button>
        <h3 className="pt-2 font-semibold">Default client direct line</h3>
        <Input value={directLine} onChange={(event) => setDirectLine(event.target.value)} placeholder="(407) 655-9795" />
        <Button className="h-11" onClick={() => void save({ defaultDirectLine: directLine }, "Direct line saved")}>Save direct line</Button>
        <h3 className="pt-2 font-semibold">This event&apos;s direct line</h3>
        <p className="text-xs text-muted-foreground">Leave blank to use the default. The client portal always shows this number, day or night.</p>
        <Input value={eventLine} onChange={(event) => setEventLine(event.target.value)} placeholder="Use the default" />
        <label className="flex min-h-12 items-center gap-3 text-sm">
          <input type="checkbox" checked={guestPhone} onChange={(event) => setGuestPhone(event.target.checked)} className="size-5" />
          Show the number on the guest page
        </label>
        <Button className="h-11" onClick={() => void save({ eventDirectLine: eventLine, guestPhoneEnabled: guestPhone }, "Event line saved")}>Save event line</Button>
      </section>
      <section className="space-y-3 rounded-2xl border border-white/10 bg-card p-4">
        <h3 className="font-semibold">Live call hours</h3>
        <p className="text-xs text-muted-foreground">Eastern time. The quote page keeps a quiet call line. During these hours the number is a link. Outside them it stays visible and request a call is the action.</p>
        <div className="grid grid-cols-2 gap-2">
          <Input type="time" value={start} onChange={(event) => setStart(event.target.value)} />
          <Input type="time" value={end} onChange={(event) => setEnd(event.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          {DAYS.map(([value, label]) => (
            <button key={value} type="button" className={`h-10 rounded-full px-3 text-sm ${days.includes(value) ? "bg-primary text-white" : "bg-secondary"}`} onClick={() => setDays((current) => current.includes(value) ? current.filter((day) => day !== value) : [...current, value])}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button className="h-11" onClick={() => void save({ officeHours: { start, end, days, configured: true } }, "Hours saved")}>Save hours</Button>
          <Button variant="outline" className="h-11" onClick={() => void save({ officeHours: null }, "Hours cleared")}>Clear hours</Button>
        </div>
        {!hoursOn ? <p className="text-xs text-muted-foreground">No hours are set. Call and callback both stay up.</p> : null}
      </section>
      <section className="space-y-3 rounded-2xl border border-white/10 bg-card p-4">
        <h3 className="font-semibold">Usable seats</h3>
        {fleet.map((row) => (
          <div key={row.id} className="grid grid-cols-[1fr_5rem_5rem] items-center gap-2 text-sm">
            <span>{row.label} {row.isDefault ? <em className="text-xs text-primary">Default</em> : null}</span>
            <Input inputMode="numeric" aria-label={`${row.label} seats`} value={row.seats} onChange={(event) => updateFleet(row.id, "seats", event.target.value)} />
            <Input inputMode="numeric" aria-label={`${row.label} usable`} value={row.usable} onChange={(event) => updateFleet(row.id, "usable", event.target.value)} />
          </div>
        ))}
        <p className="text-xs text-muted-foreground">Seats, then usable seats. A 56-seat motorcoach plans on 50 unless you change it.</p>
        {timing ? (
          <div className="grid gap-2 pt-2">
            <NumberRow label={`Curb buffer minutes${timing.bufferIsDefault ? " (default 4)" : ""}`} value={timing.curbBufferMinutes} onChange={(value) => setTiming({ ...timing, curbBufferMinutes: value, bufferIsDefault: false })} />
            <NumberRow label={`Load minutes${timing.loadIsDefault ? " (default 5)" : ""}`} value={timing.loadMinutes} onChange={(value) => setTiming({ ...timing, loadMinutes: value, loadIsDefault: false })} />
            <NumberRow label={`Unload minutes${timing.unloadIsDefault ? " (default 5)" : ""}`} value={timing.unloadMinutes} onChange={(value) => setTiming({ ...timing, unloadMinutes: value, unloadIsDefault: false })} />
          </div>
        ) : null}
        <Button className="h-11" onClick={() => void save({ fleet, timing }, "Vehicle rules saved")}>Save vehicle rules</Button>
      </section>
      <section className="space-y-3 rounded-2xl border border-white/10 bg-card p-4">
        <h3 className="font-semibold">Drive minutes</h3>
        <p className="text-xs text-muted-foreground">Used when no maps key is set. Each leg is this drive time plus the curb buffer.</p>
        {table.map((row) => (
          <div key={row.id} className="grid grid-cols-[1fr_1fr_4.5rem_auto] items-center gap-2">
            <Input aria-label="From" value={row.from} onChange={(event) => updatePair(row.id, { from: event.target.value, isDefault: false })} />
            <Input aria-label="To" value={row.to} onChange={(event) => updatePair(row.id, { to: event.target.value, isDefault: false })} />
            <Input aria-label="Minutes" inputMode="numeric" value={row.minutes} onChange={(event) => updatePair(row.id, { minutes: Number(event.target.value) || 0, isDefault: false })} />
            <button type="button" className="h-10 px-2 text-xs text-rose-300" onClick={() => setTable((current) => current.filter((item) => item.id !== row.id))}>Remove</button>
            {row.isDefault ? <p className="col-span-4 text-xs text-primary">Default</p> : null}
          </div>
        ))}
        <Button variant="outline" className="h-11" onClick={() => setTable((current) => [...current, { id: crypto.randomUUID(), from: "", to: "", minutes: 15, isDefault: false }])}>Add route pair</Button>
        <Button className="h-11" onClick={() => void save({ driveTable: table }, "Drive times saved")}>Save drive times</Button>
      </section>
      <section className="space-y-3 rounded-2xl border border-white/10 bg-card p-4">
        <h3 className="font-semibold">Guest answers for {eventId ? "this event" : "the event"}</h3>
        {faqs.map((faq) => (
          <div key={faq.id} className="rounded-xl bg-secondary/60 p-3 text-sm">
            <p className="font-medium">{faq.question}</p>
            <p className="mt-1 text-muted-foreground">{faq.answer}</p>
            <button type="button" className="mt-2 text-xs text-rose-300" onClick={() => void removeFaq(faq.id)}>Remove</button>
          </div>
        ))}
        <select className="h-12 w-full rounded-lg border border-white/10 bg-background px-3" value={faqCategory} onChange={(event) => setFaqCategory(event.target.value)}>
          <option value="PICKUP">Pickup spot</option>
          <option value="SCHEDULE">Schedule</option>
          <option value="LOST">Lost item</option>
          <option value="ACCESSIBILITY">Accessibility</option>
          <option value="OTHER">Something else</option>
        </select>
        <Input value={faqQuestion} onChange={(event) => setFaqQuestion(event.target.value)} placeholder="Question" />
        <Input value={faqAnswer} onChange={(event) => setFaqAnswer(event.target.value)} placeholder="Answer" />
        <Button className="h-11" onClick={() => void addFaq()}>Add answer</Button>
      </section>
    </div>
  );

  function updateRate(id: string, key: "hourly" | "minimum" | "transfer" | "rep", value: string) {
    setRates((current) => current.map((row) => (row.id === id ? { ...row, [key]: value } : row)));
  }

  function updateQuick(id: string, key: "chip" | "answer", value: string) {
    setQuickAnswers((current) => current.map((row) => (row.id === id ? { ...row, [key]: value } : row)));
  }

  function updateFleet(id: string, key: "seats" | "usable", value: string) {
    setFleet((current) => current.map((row) => (row.id === id ? { ...row, [key]: Number(value) || 0, isDefault: false } : row)));
  }

  function updatePair(id: string, patch: Partial<DrivePair>) {
    setTable((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  async function addFaq() {
    const response = await fetch("/api/ops/faqs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: faqCategory, question: faqQuestion, answer: faqAnswer }),
    });
    const json = await response.json();
    if (!response.ok) {
      toast.error(json.error ?? "Could not add that answer");
      return;
    }
    setFaqQuestion("");
    setFaqAnswer("");
    await load();
  }

  async function removeFaq(id: string) {
    await fetch(`/api/ops/faqs?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await load();
  }
}

function NumberRow({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="grid grid-cols-[1fr_5rem] items-center gap-2 text-sm">
      {label}
      <Input inputMode="numeric" value={value} onChange={(event) => onChange(Number(event.target.value) || 0)} />
    </label>
  );
}
