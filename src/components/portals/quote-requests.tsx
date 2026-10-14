"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn, formatDateTime } from "@/lib/utils";
import {
  LUGGAGE_OPTIONS,
  PROFILE_OPTIONS,
  SERVICE_OPTIONS,
  STATUS_OPTIONS,
  VEHICLE_OPTIONS,
  formatQuoteDate,
  formatQuoteTime,
  labelFor,
  type QuoteStatus,
} from "@/lib/quotes";

type QuoteRow = {
  id: string;
  reference: string;
  profile: (typeof PROFILE_OPTIONS)[number]["value"];
  serviceType: (typeof SERVICE_OPTIONS)[number]["value"];
  startDate: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  pickup: string;
  dropoff: string;
  passengerCount: number;
  vehiclePreference: (typeof VEHICLE_OPTIONS)[number]["value"];
  luggage: (typeof LUGGAGE_OPTIONS)[number]["value"];
  coordinatorNeeded: boolean;
  contactName: string;
  company: string | null;
  email: string;
  phone: string;
  notes: string | null;
  manifestFileName: string | null;
  status: QuoteStatus;
  createdAt: string;
};

export function QuoteRequestsBoard() {
  const [rows, setRows] = useState<QuoteRow[]>([]);
  const [filter, setFilter] = useState<QuoteStatus | "ALL">("ALL");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function load() {
    const response = await fetch("/api/quotes");
    const json = (await response.json()) as { rows?: QuoteRow[]; error?: string };
    if (!response.ok) throw new Error(json.error ?? "Could not load quote requests");
    setRows(json.rows ?? []);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await load();
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load quote requests");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(
    () => (filter === "ALL" ? rows : rows.filter((row) => row.status === filter)),
    [rows, filter],
  );

  async function setStatus(row: QuoteRow, status: QuoteStatus) {
    if (row.status === status) return;
    const previous = row.status;
    setPendingId(row.id);
    setRows((current) => current.map((item) => (item.id === row.id ? { ...item, status } : item)));
    try {
      const response = await fetch(`/api/quotes/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error ?? "Could not update status");
      toast.success(`${row.reference} marked ${labelFor(STATUS_OPTIONS, status)}`);
    } catch (err) {
      setRows((current) => current.map((item) => (item.id === row.id ? { ...item, status: previous } : item)));
      toast.error(err instanceof Error ? err.message : "Could not update status");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-primary">Intake</p>
          <h1 className="mt-1 text-2xl font-semibold">Quote Requests</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Public quote form submissions. Mark each one New, Quoted, Won, or Lost.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            void load().catch((err: unknown) => {
              toast.error(err instanceof Error ? err.message : "Refresh failed");
            });
          }}
        >
          Refresh
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <FilterChip label="All" count={rows.length} active={filter === "ALL"} onClick={() => setFilter("ALL")} />
        {STATUS_OPTIONS.map((option) => (
          <FilterChip
            key={option.value}
            label={option.label}
            count={rows.filter((row) => row.status === option.value).length}
            active={filter === option.value}
            onClick={() => setFilter(option.value)}
          />
        ))}
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading quote requests…</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {!loading && !error && visible.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-card px-4 py-6 text-sm text-muted-foreground">
          No quote requests{filter === "ALL" ? " yet" : " in this status"}. New submissions from the public form land here.
        </p>
      ) : null}

      <div className="grid gap-3">
        {visible.map((row) => {
          const when = [formatQuoteDate(row.startDate), formatQuoteTime(row.startTime)].filter(Boolean).join(" · ");
          const until = row.endDate ? [formatQuoteDate(row.endDate), formatQuoteTime(row.endTime)].filter(Boolean).join(" · ") : null;
          return (
            <article key={row.id} className="rounded-2xl border border-white/10 bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-xs uppercase tracking-[0.16em] text-primary">{row.reference}</div>
                  <h2 className="mt-1 text-lg font-semibold">{labelFor(SERVICE_OPTIONS, row.serviceType)}</h2>
                  <p className="text-sm text-muted-foreground">{labelFor(PROFILE_OPTIONS, row.profile)}</p>
                </div>
                <div className="text-right text-xs text-muted-foreground">{formatDateTime(row.createdAt)}</div>
              </div>
              <dl className="mt-3 grid gap-2 text-sm">
                <div>
                  <dt className="text-muted-foreground">When</dt>
                  <dd>
                    {when}
                    {until ? ` → ${until}` : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Route</dt>
                  <dd>
                    {row.pickup} → {row.dropoff}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Group</dt>
                  <dd>
                    {row.passengerCount.toLocaleString()} passengers · {labelFor(VEHICLE_OPTIONS, row.vehiclePreference)} · luggage {labelFor(LUGGAGE_OPTIONS, row.luggage).toLowerCase()} · coordinator {row.coordinatorNeeded ? "yes" : "no"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Contact</dt>
                  <dd>
                    {row.contactName}
                    {row.company ? ` · ${row.company}` : ""}
                    <span className="mt-0.5 block text-muted-foreground">
                      <a className="underline" href={`mailto:${row.email}`}>{row.email}</a>
                      {" · "}
                      <a className="underline" href={`tel:${row.phone}`}>{row.phone}</a>
                    </span>
                  </dd>
                </div>
                {row.notes ? (
                  <div>
                    <dt className="text-muted-foreground">Notes</dt>
                    <dd className="whitespace-pre-wrap">{row.notes}</dd>
                  </div>
                ) : null}
                {row.manifestFileName ? (
                  <div>
                    <dt className="text-muted-foreground">Manifest</dt>
                    <dd>
                      <a className="underline" href={`/api/quotes/${row.id}/manifest`}>
                        {row.manifestFileName}
                      </a>
                    </dd>
                  </div>
                ) : null}
              </dl>
              <div className="mt-4 grid grid-cols-4 gap-1" role="group" aria-label={`Status for ${row.reference}`}>
                {STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    disabled={pendingId === row.id}
                    className={cn(
                      "h-10 rounded-lg text-xs font-medium",
                      row.status === option.value ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
                    )}
                    onClick={() => void setStatus(row, option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-3 py-1.5 text-xs",
        active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
      )}
    >
      {label} {count}
    </button>
  );
}
