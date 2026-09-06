import { Badge } from "@/components/ui/badge";
import { GUEST_STATUS_LABEL, MOVEMENT_STATUS_LABEL, PRIORITY_LABEL, VEHICLE_STATUS_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { GuestStatus, MovementStatus, Priority, VehicleStatus } from "@prisma/client";

const guestTone: Record<string, string> = {
  EXPECTED: "bg-slate-700/70 text-slate-100",
  ARRIVED: "bg-sky-900 text-sky-100",
  FOUND: "bg-indigo-800 text-indigo-100",
  CHECKED_IN: "bg-violet-800 text-violet-100",
  QUEUED: "bg-amber-700 text-amber-50",
  ASSIGNED: "bg-purple-700 text-purple-50",
  BOARDED: "bg-blue-700 text-blue-50",
  DEPARTED: "bg-cyan-800 text-cyan-50",
  COMPLETED: "bg-emerald-800 text-emerald-50",
  NO_SHOW: "bg-rose-800 text-rose-50",
  CANCELLED: "bg-zinc-700 text-zinc-100",
  NEEDS_ASSISTANCE: "bg-orange-700 text-orange-50",
};

const vehicleTone: Record<string, string> = {
  OFFLINE: "bg-zinc-700 text-zinc-100",
  AVAILABLE: "bg-emerald-800 text-emerald-50",
  ASSIGNED: "bg-purple-700 text-purple-50",
  EN_ROUTE: "bg-sky-800 text-sky-50",
  STAGED: "bg-indigo-800 text-indigo-50",
  ARRIVED: "bg-blue-800 text-blue-50",
  LOADING: "bg-amber-700 text-amber-50",
  IN_SERVICE: "bg-cyan-800 text-cyan-50",
  COMPLETED: "bg-emerald-800 text-emerald-50",
  DELAYED: "bg-orange-700 text-orange-50",
  BREAKDOWN: "bg-rose-800 text-rose-50",
  REMOVED: "bg-zinc-800 text-zinc-300",
};

export function GuestStatusBadge({ status }: { status: GuestStatus | string }) {
  return (
    <Badge className={cn("border-0 font-medium", guestTone[status] ?? "bg-slate-700")}>
      {GUEST_STATUS_LABEL[status as GuestStatus] ?? status}
    </Badge>
  );
}

export function VehicleStatusBadge({ status }: { status: VehicleStatus | string }) {
  return (
    <Badge className={cn("border-0 font-medium", vehicleTone[status] ?? "bg-slate-700")}>
      {VEHICLE_STATUS_LABEL[status as VehicleStatus] ?? status}
    </Badge>
  );
}

export function MovementStatusBadge({ status }: { status: MovementStatus | string }) {
  return (
    <Badge className={cn("border-0 font-medium", vehicleTone[status] ?? guestTone[status] ?? "bg-slate-700")}>
      {MOVEMENT_STATUS_LABEL[status as MovementStatus] ?? status}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: Priority | string }) {
  const tone =
    priority === "VIP"
      ? "bg-fuchsia-700 text-fuchsia-50"
      : priority === "ACCESSIBILITY"
        ? "bg-orange-800 text-orange-50"
        : "bg-slate-700 text-slate-100";
  return <Badge className={cn("border-0", tone)}>{PRIORITY_LABEL[priority as Priority] ?? priority}</Badge>;
}
