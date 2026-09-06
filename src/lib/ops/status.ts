import type { GuestStatus, MovementStatus, VehicleStatus } from "@prisma/client";

const guestNext: Record<GuestStatus, GuestStatus[]> = {
  EXPECTED: ["ARRIVED", "FOUND", "CHECKED_IN", "NO_SHOW", "CANCELLED", "NEEDS_ASSISTANCE"],
  ARRIVED: ["FOUND", "CHECKED_IN", "NO_SHOW", "CANCELLED", "NEEDS_ASSISTANCE"],
  FOUND: ["CHECKED_IN", "QUEUED", "CANCELLED", "NEEDS_ASSISTANCE"],
  CHECKED_IN: ["QUEUED", "CANCELLED", "NEEDS_ASSISTANCE"],
  QUEUED: ["ASSIGNED", "CHECKED_IN", "CANCELLED", "NEEDS_ASSISTANCE"],
  ASSIGNED: ["BOARDED", "QUEUED", "CANCELLED", "NEEDS_ASSISTANCE"],
  BOARDED: ["DEPARTED", "ASSIGNED"],
  DEPARTED: ["COMPLETED"],
  COMPLETED: [],
  NO_SHOW: ["EXPECTED", "FOUND"],
  CANCELLED: ["EXPECTED"],
  NEEDS_ASSISTANCE: ["FOUND", "CHECKED_IN", "QUEUED", "CANCELLED"],
};

const vehicleNext: Record<VehicleStatus, VehicleStatus[]> = {
  OFFLINE: ["AVAILABLE", "REMOVED"],
  AVAILABLE: ["ASSIGNED", "OFFLINE", "REMOVED"],
  ASSIGNED: ["EN_ROUTE", "AVAILABLE", "DELAYED", "BREAKDOWN"],
  EN_ROUTE: ["STAGED", "ARRIVED", "DELAYED", "BREAKDOWN"],
  STAGED: ["ARRIVED", "DELAYED", "BREAKDOWN"],
  ARRIVED: ["LOADING", "DELAYED", "BREAKDOWN"],
  LOADING: ["IN_SERVICE", "BREAKDOWN"],
  IN_SERVICE: ["COMPLETED", "BREAKDOWN"],
  COMPLETED: ["AVAILABLE"],
  DELAYED: ["EN_ROUTE", "STAGED", "ARRIVED", "BREAKDOWN", "AVAILABLE"],
  BREAKDOWN: ["REMOVED", "AVAILABLE", "OFFLINE"],
  REMOVED: ["OFFLINE"],
};

const movementNext: Record<MovementStatus, MovementStatus[]> = {
  PLANNED: ["OPEN", "CANCELLED"],
  OPEN: ["ASSIGNED", "HOLD", "CANCELLED"],
  ASSIGNED: ["ACTIVE", "HOLD", "CANCELLED"],
  ACTIVE: ["COMPLETED", "HOLD", "INCIDENT", "CANCELLED"],
  COMPLETED: [],
  HOLD: ["OPEN", "ASSIGNED", "ACTIVE", "CANCELLED"],
  CANCELLED: ["PLANNED", "OPEN"],
  INCIDENT: ["ACTIVE", "HOLD", "CANCELLED"],
};

export function canTransitionGuest(from: GuestStatus, to: GuestStatus, override = false) {
  if (from === to) return true;
  if (override) return true;
  return guestNext[from]?.includes(to) ?? false;
}

export function canTransitionVehicle(from: VehicleStatus, to: VehicleStatus, override = false) {
  if (from === to) return true;
  if (override) return true;
  return vehicleNext[from]?.includes(to) ?? false;
}

export function canTransitionMovement(from: MovementStatus, to: MovementStatus, override = false) {
  if (from === to) return true;
  if (override) return true;
  return movementNext[from]?.includes(to) ?? false;
}

export function guestTimestampField(status: GuestStatus): string | null {
  switch (status) {
    case "FOUND":
    case "ARRIVED":
      return "foundAt";
    case "CHECKED_IN":
      return "checkedInAt";
    case "QUEUED":
      return "queuedAt";
    case "ASSIGNED":
      return "assignedAt";
    case "BOARDED":
      return "boardedAt";
    case "DEPARTED":
      return "departedAt";
    case "COMPLETED":
      return "completedAt";
    default:
      return null;
  }
}
