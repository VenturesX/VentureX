import type { Role } from "@prisma/client";

export const ROLE_HOME: Record<Role, string> = {
  ADMIN: "/admin",
  DISPATCHER: "/dispatch",
  MEET_GREET: "/meet-greet",
  DRIVER: "/driver",
  CLIENT: "/client",
};

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Admin",
  DISPATCHER: "Dispatch",
  MEET_GREET: "Meet & Greet",
  DRIVER: "Driver",
  CLIENT: "Client",
};

export const PORTAL_ROLES: Record<string, Role[]> = {
  "/admin": ["ADMIN"],
  "/dispatch": ["ADMIN", "DISPATCHER"],
  "/meet-greet": ["ADMIN", "MEET_GREET"],
  "/driver": ["ADMIN", "DRIVER"],
  "/client": ["ADMIN", "CLIENT"],
};

export function canAccessPath(role: Role, pathname: string) {
  const match = Object.entries(PORTAL_ROLES).find(([prefix]) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (!match) return true;
  return match[1].includes(role);
}

export function canMutate(role: Role, action: string) {
  const admin = role === "ADMIN";
  switch (action) {
    case "admin.crud":
      return admin;
    case "ops.check_in":
    case "ops.queue":
    case "ops.find":
      return admin || role === "MEET_GREET";
    case "ops.assign":
    case "ops.reassign":
    case "ops.correct":
    case "ops.exception":
      return admin || role === "DISPATCHER";
    case "ops.driver_status":
      return admin || role === "DRIVER" || role === "DISPATCHER";
    case "clipboard.write":
      return admin || role === "DISPATCHER" || role === "MEET_GREET";
    case "ops.read":
      return true;
    default:
      return admin;
  }
}
