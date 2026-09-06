"use client";

import { GuestStatusBadge, MovementStatusBadge, PriorityBadge, VehicleStatusBadge } from "@/components/status-badge";
import { useLive } from "@/hooks/use-live";
import { formatDateTime, formatWait, fullName, minutesBetween } from "@/lib/utils";
import type { LiveSnapshot } from "@/components/portals/types";

export function ClientBoard({ eventId }: { eventId: string }) {
  const { data, error, loading } = useLive<LiveSnapshot>(`/api/ops/live?eventId=${eventId}`, eventId);

  if (loading && !data) return <p className="text-muted-foreground">Loading movement…</p>;
  if (error) return <p className="text-rose-400">{error}</p>;
  if (!data) return null;

  const movement = data.movements[0];
  const stages = [
    { key: "EXPECTED", label: "Expected" },
    { key: "CHECKED_IN", label: "On property / checked in" },
    { key: "QUEUED", label: "In curb queue" },
    { key: "ASSIGNED", label: "Vehicle assigned" },
    { key: "BOARDED", label: "Boarded" },
    { key: "DEPARTED", label: "En route to hotel" },
    { key: "COMPLETED", label: "Completed" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-primary">Client · {data.event.client.name}</p>
        <h1 className="text-2xl font-semibold mt-1">{data.event.name}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Read-only operational truth. No booking, no quotes — just where the group is.
        </p>
      </div>

      {movement ? (
        <section className="rounded-2xl border border-white/10 bg-card p-5 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold">{movement.name}</h2>
            <MovementStatusBadge status={movement.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {movement.origin.name} → {movement.destination.name}
          </p>
        </section>
      ) : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile label="Queued now" value={data.queue.count} />
        <Tile label="Longest wait" value={formatWait(data.queue.longestWait)} />
        <Tile label="Vehicles live" value={data.vehicles.filter((v) => !["OFFLINE", "AVAILABLE", "REMOVED"].includes(v.status)).length} />
        <Tile label="Wait target" value={`${data.queue.waitTargetMinutes}m`} />
      </div>

      <section className="grid sm:grid-cols-7 gap-2">
        {stages.map((s) => {
          const count = data.guests.filter((g) => {
            if (s.key === "CHECKED_IN") return ["FOUND", "CHECKED_IN"].includes(g.status);
            if (s.key === "EXPECTED") return ["EXPECTED", "ARRIVED"].includes(g.status);
            return g.status === s.key;
          }).length;
          return (
            <div key={s.key} className="rounded-xl border border-white/10 bg-card px-3 py-3">
              <div className="text-2xl font-semibold tabular-nums">{count}</div>
              <div className="text-[11px] text-muted-foreground leading-tight">{s.label}</div>
            </div>
          );
        })}
      </section>

      <section className="rounded-2xl border border-white/10 bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Guest</th>
              <th className="px-3 py-2 font-medium hidden sm:table-cell">Flight</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium hidden md:table-cell">Wait</th>
            </tr>
          </thead>
          <tbody>
            {data.guests
              .filter((g) => !["EXPECTED"].includes(g.status) || g.priority !== "NORMAL")
              .slice(0, 40)
              .map((g) => (
                <tr key={g.id} className="border-t border-white/5">
                  <td className="px-3 py-2">
                    <div className="font-medium">{fullName(g.firstName, g.lastName)}</div>
                    <div className="text-xs text-muted-foreground">{g.partyCode}</div>
                  </td>
                  <td className="px-3 py-2 hidden sm:table-cell text-muted-foreground">{g.flightNumber}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      <GuestStatusBadge status={g.status} />
                      {g.priority !== "NORMAL" ? <PriorityBadge priority={g.priority} /> : null}
                    </div>
                  </td>
                  <td className="px-3 py-2 hidden md:table-cell text-muted-foreground">
                    {g.queuedAt && g.status === "QUEUED" ? formatWait(minutesBetween(g.queuedAt)) : "—"}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-2xl border border-white/10 bg-card p-4 space-y-2">
        <h2 className="font-semibold">Vehicles on this movement</h2>
        {data.assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No assignments yet.</p>
        ) : (
          data.assignments.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>
                {a.vehicle.fleetNumber} · {a.driver.user.name} · {a.guests.map((g) => fullName(g.guest.firstName, g.guest.lastName)).join(", ")}
              </span>
              <span className="flex items-center gap-2">
                <VehicleStatusBadge status={a.vehicle.status} />
                <span className="text-xs text-muted-foreground">{formatDateTime(a.assignedAt)}</span>
              </span>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-card px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
