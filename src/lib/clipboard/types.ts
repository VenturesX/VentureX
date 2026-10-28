export type HeadwayMinutes = 15 | 20;

export type BreakStatus = "back" | "on" | "need" | "fill-in";

export type DayMode = "loop" | "special";

export type IngressStop = {
  id: string;
  name: string;
  count: number;
  staffed: boolean;
};

export type RosterRow = {
  id: string;
  busPuck: string;
  driver: string;
  phone: string;
  breakText: string;
  siteCode: string;
  isFillIn: boolean;
  breakStatus: BreakStatus | "";
};

export type DispatchRun = {
  id: string;
  timeLabel: string;
  busPuck: string;
  driver: string;
  pax: number;
  stopAPax: number | null;
  stopBPax: number | null;
  siteCode: string;
  siteNote: string;
  logged: boolean;
  synced: boolean;
  paxUnknown: boolean;
  advance: boolean;
  stopName: string;
};

export type ClipboardDay = {
  id: string;
  label: string;
  notes: string;
  splitMode: boolean;
  stopAName: string;
  stopBName: string;
  headwayMinutes: HeadwayMinutes;
  nextDispatch: string;
  activeRosterId: string | null;
  clickerA: number;
  clickerB: number;
  pendingLogged: boolean;
  pendingNote: string;
  mode: DayMode;
  seedRevision: string;
  departureStop: string;
  ingress: IngressStop[];
  overageEnabled: boolean;
  roster: RosterRow[];
  runs: DispatchRun[];
};

export type ClipboardProgram = {
  id: string;
  name: string;
  days: ClipboardDay[];
};

export type DayTotals = {
  runs: number;
  pax: number;
  stopA: number;
  stopB: number;
};
