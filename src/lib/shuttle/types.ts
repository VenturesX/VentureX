export type RouteMode = "loop" | "chiefs";

export type WalkOver = {
  name: string;
  address: string;
  lat?: number;
  lng?: number;
};

export type ShuttleStop = {
  id: string;
  code: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  boarding: string;
  staffName: string;
  staffPhone: string;
  walkOvers: WalkOver[];
  kind: "hub" | "stop" | "event" | "depot";
  custom?: boolean;
};

export type RouteLeg = {
  from: string;
  to: string;
  minutes: number;
};

export type PuckLink = {
  puckId: string;
  shift: "morning" | "night";
  shuttleNumber: string;
  carrier: string;
  coachNumber: string;
  driver: string;
  phone: string;
  checkIn: string;
  release: string;
  breakText: string;
};

export type LiveFix = {
  puckId: string;
  lat: number;
  lng: number;
  heading: number | null;
  speedMps: number | null;
  source: "beacon" | "falcon" | "checkin" | "sim";
  stopId: string | null;
  at: number;
};

export type Relay = {
  id: string;
  at: number;
  puckId: string;
  stopId: string;
  kind: "arrive" | "depart";
  pax: number;
  text: string;
};

export type ShuttleDesk = {
  mode: RouteMode;
  eventCode: string;
  stops: ShuttleStop[];
  loopOrder: string[];
  nightOrder: string[];
  loopLegs: RouteLeg[];
  nightLegs: RouteLeg[];
  links: PuckLink[];
  fixes: LiveFix[];
  relays: Relay[];
};
