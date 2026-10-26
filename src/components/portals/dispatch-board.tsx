"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GuestStatusBadge, MovementStatusBadge, PriorityBadge, VehicleStatusBadge } from "@/components/status-badge";
import { postJson, useLive } from "@/hooks/use-live";
import { formatDateTime, formatWait, fullName, minutesBetween } from "@/lib/utils";
import type { LiveSnapshot } from "@/components/portals/types";

export function DispatchBoard({ eventId }: { eventId: string }) {
  const { data, error, loading, refresh } = useLive<LiveSnapshot>(`/api/ops/live?eventId=${eventId}`, eventId);
  const [selected, setSelected] = useState<string[]>([]);
  const [vehicleId, setVehicleId] = useState<string>("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const available = useMemo(
    () => data?.vehicles.filter((v) => ["AVAILABLE", "COMPLETED"].includes(v.status)) ?? [],
    [data],
  );

  const selectedVehicle = data?.vehicles.find((v) => v.id === vehicleId);
  const pairedDriver = selectedVehicle?.currentDriver ?? data?.drivers.find((d) => d.currentVehicleId === vehicleId);

  function toggle(id: string) {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  async function assign() {
    if (!vehicleId || !pairedDriver) {
      toast.error("Pick an available vehicle with a paired driver");
      return;
    }
    setBusy(true);
    try {
      await postJson("/api/ops/assign", {
        guestIds: selected,
        vehicleId,
        driverId: pairedDriver.id,
      });
      toast.success("Assignment published to driver and client");
      setSelected([]);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Assign failed");
    } finally {
      setBusy(false);
    }
  }

  async function ack(id: string, status: string) {
    try {
      await postJson("/api/ops/exceptions", { id, status });
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function correct(entityType: string, entityId: string, to: string) {
    if (!reason.trim()) {
      toast.error("Status corrections need a reason — it hits the audit trail");
      return;
    }
    try {
      await postJson("/api/ops/correct", { entityType, entityId, to, reason });
      toast.success("Override recorded");
      setReason("");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Override failed");
    }
  }

  if (loading && !data) return <p className="text-muted-foreground">Opening dispatch…</p>;
  if (error) return <p className="text-rose-400">{error}</p>;
  if (!data) return null;

  const movement = data.movements[0];
  const zone = data.event.geofences[0];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-primary">Dispatch</p>
          <h1 className="text-2xl font-semibold mt-1">Curb queue and metal</h1>
          {movement ? (
            <p className="text-sm text-muted-foreground mt-1 flex flex-wrap items-center gap-2">
              {movement.name}
              <MovementStatusBadge status={movement.status} />
              {movement.origin.name} → {movement.destination.name}
            </p>
          ) : null}
        </div>
        {zone ? (
          <div className="text-xs text-muted-foreground rounded-xl border border-white/10 px-3 py-2">
            Queue zone {zone.name} · {zone.radiusMeters}m circle
          </div>
        ) : null}
      </div>
      <Link
        href="/clipboard"
        className="flex items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-primary/10 px-4 py-3"
      >
        <span>
          <span className="block text-[11px] uppercase tracking-[0.16em] text-primary">On the curb</span>
          <span className="font-medium">Open the staff clipboard</span>
        </span>
        <span className="text-sm text-primary">Roster, count, log</span>
      </Link>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card label="In queue" value={data.queue.count} sub={`${data.queue.pax} pax`} />
        <Card label="Longest wait" value={formatWait(data.queue.longestWait)} warn={data.queue.longestWait >= data.queue.waitTargetMinutes} />
        <Card label="Avg wait" value={formatWait(data.queue.avgWait)} />
        <Card label="VIP waiting" value={data.queue.vipCount} />
      </div>

      <div className="grid xl:grid-cols-[1.15fr_0.95fr_0.85fr] gap-4">
        <section className="rounded-2xl border border-white/10 bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Queue</h2>
            <span className="text-xs text-muted-foreground">{selected.length} selected</span>
          </div>
          {data.queued.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Queue is empty. Meet & Greet will fill it.</p>
          ) : (
            <ul className="space-y-2">
              {data.queued.map((g) => (
                <li key={g.id} className="flex items-start gap-3 rounded-xl bg-secondary/60 p-3">
                  <Checkbox checked={selected.includes(g.id)} onCheckedChange={() => toggle(g.id)} className="mt-1" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{fullName(g.firstName, g.lastName)}</span>
                      <PriorityBadge priority={g.priority} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {g.partyCode} · {g.partySize} pax · {g.flightNumber} · wait {g.queuedAt ? formatWait(minutesBetween(g.queuedAt)) : "—"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="space-y-2 pt-2">
            <label className="text-xs text-muted-foreground">Available vehicle</label>
            <select
              className="w-full h-10 rounded-lg bg-background border border-white/10 px-3 text-sm"
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
            >
              <option value="">Select vehicle…</option>
              {available.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.fleetNumber} · {v.type} · {v.capacity} pax · {v.currentDriver?.user.name ?? "unpaired"}
                </option>
              ))}
            </select>
            <Button className="w-full" disabled={busy || selected.length === 0} onClick={() => void assign()}>
              Assign to {selectedVehicle?.fleetNumber ?? "vehicle"}
            </Button>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-card p-4 space-y-3">
          <h2 className="font-semibold">Vehicle board</h2>
          <div className="space-y-2">
            {data.vehicles.map((v) => (
              <div key={v.id} className="rounded-xl bg-secondary/50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">{v.fleetNumber} · {v.type}</div>
                  <VehicleStatusBadge status={v.status} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {v.capacity} pax · {v.currentDriver?.user.name ?? "No driver paired"}
                </p>
              </div>
            ))}
          </div>
          <div className="pt-2 space-y-2">
            <h3 className="text-sm font-medium">Active assignments</h3>
            {data.assignments.filter((a) => a.status === "ACTIVE").length === 0 ? (
              <p className="text-xs text-muted-foreground">No live assignments.</p>
            ) : (
              data.assignments
                .filter((a) => a.status === "ACTIVE")
                .map((a) => (
                  <div key={a.id} className="text-xs rounded-lg border border-white/10 p-2">
                    {a.vehicle.fleetNumber} · {a.driver.user.name} · {a.guests.length} guests
                    <div className="text-muted-foreground">{formatDateTime(a.assignedAt)} by {a.assignedBy.name}</div>
                  </div>
                ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-card p-4 space-y-3">
          <h2 className="font-semibold">Exceptions</h2>
          {data.exceptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open exceptions.</p>
          ) : (
            <ul className="space-y-2">
              {data.exceptions.map((ex) => (
                <li key={ex.id} className="rounded-xl bg-secondary/50 p-3 space-y-2">
                  <div className="text-xs uppercase tracking-wide text-amber-300">{ex.severity} · {ex.type}</div>
                  <div className="text-sm font-medium">{ex.title}</div>
                  <p className="text-xs text-muted-foreground">{ex.detail}</p>
                  <div className="flex gap-2">
                    <Button size="xs" variant="secondary" onClick={() => void ack(ex.id, "ACK")}>Ack</Button>
                    <Button size="xs" variant="ghost" onClick={() => void ack(ex.id, "RESOLVED")}>Resolve</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <h3 className="text-sm font-medium">Human override</h3>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason required for audit (reassign, status correction)…"
            />
            <Input
              placeholder="Selected queued guest will be sent back to CHECKED_IN"
              readOnly
              value={selected[0] ? "Correction target: first selected queued guest" : ""}
            />
            <Button
              variant="outline"
              size="sm"
              disabled={!selected[0]}
              onClick={() => selected[0] && void correct("GUEST", selected[0], "CHECKED_IN")}
            >
              Pull selected guest off queue
            </Button>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-white/10 bg-card p-4">
        <h2 className="font-semibold mb-3">Audit trail</h2>
        <div className="max-h-64 overflow-auto text-sm space-y-2">
          {data.audit.length === 0 ? (
            <p className="text-muted-foreground">No audit events yet.</p>
          ) : (
            data.audit.map((row) => (
              <div key={row.id} className="flex flex-wrap justify-between gap-2 border-b border-white/5 pb-2">
                <span>
                  <span className="text-primary">{row.action}</span>{" "}
                  <span className="text-muted-foreground">
                    {row.entityType} · {row.actor?.name ?? "system"}
                    {row.reason ? ` — ${row.reason}` : ""}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">{formatDateTime(row.createdAt)}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function Card({
  label,
  value,
  sub,
  warn,
}: {
  label: string;
  value: string | number;
  sub?: string;
  warn?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-card px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold tabular-nums ${warn ? "text-amber-300" : ""}`}>{value}</div>
      {sub ? <div className="text-xs text-muted-foreground">{sub}</div> : null}
    </div>
  );
}
