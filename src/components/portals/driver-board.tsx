"use client";

import { ExternalLink, MapPinned } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { GuestStatusBadge, PriorityBadge, VehicleStatusBadge } from "@/components/status-badge";
import { postJson, useLive } from "@/hooks/use-live";
import { DRIVER_SEQUENCE_LABEL, nextDriverStatus } from "@/lib/labels";
import { fullName } from "@/lib/utils";
import type { VehicleStatus } from "@prisma/client";

type DriverView = {
  assignment: {
    id: string;
    vehicle: { fleetNumber: string; type: string; status: VehicleStatus; capacity: number };
    driver: { status: VehicleStatus; user: { name: string } };
    guests: { guest: { id: string; firstName: string; lastName: string; partySize: number; priority: string; status: string; hotelName: string | null } }[];
    movement: {
      name: string;
      origin: { name: string };
      destination: { name: string };
      event: { name: string };
    };
  };
  nav: { google: string; apple: string; previewLabel: string };
} | { assignment: null };

export function DriverBoard() {
  const { data, error, loading, refresh } = useLive<DriverView>("/api/ops/driver/status");

  async function advance(to: VehicleStatus) {
    try {
      await postJson("/api/ops/driver/status", { to });
      toast.success(DRIVER_SEQUENCE_LABEL[to] ?? to);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update status");
    }
  }

  if (loading && !data) {
    return <p className="text-muted-foreground text-center py-16">Looking for your movement…</p>;
  }
  if (error) return <p className="text-rose-400">{error}</p>;
  if (!data?.assignment) {
    return (
      <div className="rounded-3xl border border-dashed border-white/15 p-10 text-center space-y-3">
        <p className="text-xl font-semibold">No assignment yet</p>
        <p className="text-muted-foreground">Stay staged. Dispatch will push a job to this device.</p>
      </div>
    );
  }

  const { assignment, nav } = data;
  const next = nextDriverStatus(assignment.vehicle.status);
  const pax = assignment.guests.reduce((n, g) => n + g.guest.partySize, 0);

  return (
    <div className="space-y-4 pb-8">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.18em] text-primary">Driver</p>
        <h1 className="text-2xl font-semibold mt-1">{assignment.vehicle.fleetNumber}</h1>
        <div className="mt-2 flex justify-center">
          <VehicleStatusBadge status={assignment.vehicle.status} />
        </div>
      </div>

      <section className="rounded-3xl border border-white/10 bg-card p-5 space-y-2">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Pickup</div>
        <div className="text-lg font-medium">{assignment.movement.origin.name}</div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground pt-2">Drop</div>
        <div className="text-lg font-medium">{assignment.movement.destination.name}</div>
        <p className="text-sm text-muted-foreground">
          {pax} pax · {assignment.guests.length} {assignment.guests.length === 1 ? "guest" : "guests"} · {assignment.vehicle.capacity} seats
        </p>
      </section>

      <a
        href={nav.google}
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-between rounded-3xl bg-primary px-5 py-4 text-primary-foreground"
      >
        <span className="flex items-center gap-3">
          <MapPinned className="size-6" />
          <span>
            <span className="block font-semibold">Open maps</span>
            <span className="block text-sm text-primary-foreground/80">{nav.previewLabel}</span>
          </span>
        </span>
        <ExternalLink className="size-5" />
      </a>

      <ul className="space-y-2">
        {assignment.guests.map(({ guest }) => (
          <li key={guest.id} className="rounded-2xl border border-white/10 bg-card px-4 py-3 flex items-center justify-between gap-2">
            <div>
              <div className="font-medium">{fullName(guest.firstName, guest.lastName)}</div>
              <div className="text-xs text-muted-foreground">{guest.partySize} pax · {guest.hotelName}</div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <PriorityBadge priority={guest.priority} />
              <GuestStatusBadge status={guest.status} />
            </div>
          </li>
        ))}
      </ul>

      {next ? (
        <Button className="w-full h-16 text-lg" onClick={() => void advance(next)}>
          Mark {DRIVER_SEQUENCE_LABEL[next]}
        </Button>
      ) : (
        <p className="text-center text-emerald-300">Movement complete. You are available.</p>
      )}
      <p className="text-center text-xs text-muted-foreground">
        Sequence: En Route → Arrived → Loading → Departed → Complete
      </p>
    </div>
  );
}
