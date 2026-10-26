export type HeadwayMinutes = 15 | 20;

export type RosterRow = {
  id: string;
  busPuck: string;
  driver: string;
  phone: string;
  breakText: string;
  siteCode: string;
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
