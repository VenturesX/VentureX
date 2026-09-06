import type {
  AlertConfig,
  Assignment,
  AuditLog,
  Client,
  Driver,
  Event,
  Exception,
  Geofence,
  Guest,
  Location,
  Movement,
  Operator,
  Route,
  TimingPreset,
  User,
  Vehicle,
} from "@prisma/client";

export type LiveSnapshot = {
  event: Event & {
    client: Client;
    alertConfig: AlertConfig | null;
    timingPresets: TimingPreset[];
    geofences: Geofence[];
    locations: Location[];
  };
  queue: {
    count: number;
    pax: number;
    longestWait: number;
    avgWait: number;
    vipCount: number;
    assistanceCount: number;
    waitTargetMinutes: number;
  };
  queued: Guest[];
  guests: Guest[];
  vehicles: (Vehicle & {
    currentDriver: (Driver & { user: User }) | null;
    operator: Operator | null;
  })[];
  drivers: (Driver & { user: User; currentVehicle: Vehicle | null; operator: Operator | null })[];
  movements: (Movement & { origin: Location; destination: Location; route: Route | null })[];
  exceptions: Exception[];
  audit: (AuditLog & { actor: User | null })[];
  assignments: (Assignment & {
    vehicle: Vehicle;
    driver: Driver & { user: User };
    guests: { guest: Guest }[];
    assignedBy: User;
    movement: Movement & { origin: Location; destination: Location };
  })[];
  nav: { google: string; apple: string; previewLabel: string } | null;
  generatedAt: string;
};
