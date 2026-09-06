import type { GuestStatus, MovementStatus, Priority, VehicleStatus } from "@prisma/client";

export const GUEST_STATUS_LABEL: Record<GuestStatus, string> = {
  EXPECTED: "Expected",
  ARRIVED: "Arrived",
  FOUND: "Found",
  CHECKED_IN: "Checked In",
  QUEUED: "Queued",
  ASSIGNED: "Assigned",
  BOARDED: "Boarded",
  DEPARTED: "Departed",
  COMPLETED: "Completed",
  NO_SHOW: "No Show",
  CANCELLED: "Cancelled",
  NEEDS_ASSISTANCE: "Needs Assistance",
};

export const VEHICLE_STATUS_LABEL: Record<VehicleStatus, string> = {
  OFFLINE: "Offline",
  AVAILABLE: "Available",
  ASSIGNED: "Assigned",
  EN_ROUTE: "En Route",
  STAGED: "Staged",
  ARRIVED: "Arrived",
  LOADING: "Loading",
  IN_SERVICE: "In Service",
  COMPLETED: "Completed",
  DELAYED: "Delayed",
  BREAKDOWN: "Breakdown",
  REMOVED: "Removed",
};

export const MOVEMENT_STATUS_LABEL: Record<MovementStatus, string> = {
  PLANNED: "Planned",
  OPEN: "Open",
  ASSIGNED: "Assigned",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  HOLD: "Hold",
  CANCELLED: "Cancelled",
  INCIDENT: "Incident",
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  NORMAL: "Normal",
  VIP: "VIP / Priority",
  ACCESSIBILITY: "Accessibility",
};

export const DRIVER_SEQUENCE: VehicleStatus[] = [
  "ASSIGNED",
  "EN_ROUTE",
  "ARRIVED",
  "LOADING",
  "IN_SERVICE",
  "COMPLETED",
];

export const DRIVER_SEQUENCE_LABEL: Record<string, string> = {
  ASSIGNED: "Accept / assigned",
  EN_ROUTE: "En Route",
  ARRIVED: "Arrived",
  LOADING: "Loading",
  IN_SERVICE: "Departed",
  COMPLETED: "Complete",
};

export function nextDriverStatus(current: VehicleStatus): VehicleStatus | null {
  const i = DRIVER_SEQUENCE.indexOf(current);
  if (i < 0 || i === DRIVER_SEQUENCE.length - 1) return null;
  return DRIVER_SEQUENCE[i + 1];
}
