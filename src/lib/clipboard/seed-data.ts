import { applyInitialClicker, siteCodeFromBusPuck } from "./logic";
import type { BreakStatus, ClipboardDay, ClipboardProgram, DispatchRun, RosterRow } from "./types";

export const OFFICIAL_REVISION = "iacp-2026-10-27-curb";

function roster(
  id: string,
  busPuck: string,
  driver: string,
  phone: string,
  breakText: string,
  siteCode = siteCodeFromBusPuck(busPuck),
  extras: Partial<Pick<RosterRow, "isFillIn" | "breakStatus">> = {},
): RosterRow {
  return {
    id,
    busPuck,
    driver,
    phone,
    breakText,
    siteCode,
    isFillIn: extras.isFillIn ?? false,
    breakStatus: extras.breakStatus ?? (extras.isFillIn ? "fill-in" : "back"),
  };
}

function run(
  id: string,
  timeLabel: string,
  busPuck: string,
  driver: string,
  pax: number,
  site: string,
  stops?: { a: number; b: number },
  extras: Partial<Pick<DispatchRun, "synced" | "paxUnknown" | "advance" | "stopName">> = {},
): DispatchRun {
  const note = site === "--" || site.endsWith("✓") ? "" : site;
  const logged = site.endsWith("✓");
  const tagged = logged ? site.replace(/\s*✓$/, "").trim() : "";
  const fillIn = !siteCodeFromBusPuck(busPuck);
  const blocked = extras.paxUnknown || pax === 0 || fillIn;
  return {
    id,
    timeLabel,
    busPuck,
    driver,
    pax: extras.paxUnknown ? 0 : pax,
    stopAPax: stops ? stops.a : null,
    stopBPax: stops ? stops.b : null,
    siteCode: tagged || siteCodeFromBusPuck(busPuck),
    siteNote: note,
    logged,
    synced: extras.synced ?? !blocked,
    paxUnknown: extras.paxUnknown ?? false,
    advance: extras.advance ?? false,
    stopName: extras.stopName ?? "",
  };
}

function day(
  partial: Omit<ClipboardDay, "clickerA" | "clickerB" | "pendingLogged" | "pendingNote" | "nextDispatch" | "activeRosterId" | "mode" | "seedRevision" | "departureStop" | "ingress" | "overageEnabled"> &
    Partial<Pick<ClipboardDay, "nextDispatch" | "activeRosterId" | "mode" | "seedRevision" | "departureStop" | "ingress" | "overageEnabled">>,
): ClipboardDay {
  return applyInitialClicker({
    nextDispatch: "",
    activeRosterId: null,
    clickerA: 0,
    clickerB: 0,
    pendingLogged: true,
    pendingNote: "",
    mode: "loop",
    seedRevision: "",
    departureStop: "Residence Inn",
    ingress: [],
    overageEnabled: false,
    ...partial,
  });
}

export function buildSeedPrograms(): ClipboardProgram[] {
  return [
    {
      id: "clip-iacp-2026-r3",
      name: "IACP 2026 - Route 3",
      days: [
        day({
          id: "clip-iacp-d1",
          label: "Day 1 - Fri 10/23",
          notes: "Fri Oct 23, 2026 (1:00–4:30 PM | Mid-Route Count at Hilton & Element)",
          splitMode: true,
          stopAName: "Hilton",
          stopBName: "Element",
          headwayMinutes: 20,
          roster: [
            roster("clip-iacp-d1-r1", "0316\\3-1", "Blanca", "407-529-9874", "--"),
            roster("clip-iacp-d1-r2", "5607\\3-2", "Rafael", "407-393-0939", "--"),
            roster("clip-iacp-d1-r3", "243\\3-3", "Philip", "863-614-2436", "--"),
            roster("clip-iacp-d1-r4", "343\\3-4", "James", "801-200-2128", "--"),
            roster("clip-iacp-d1-r5", "260\\3-5", "Kevin", "978-417-2422", "--"),
            roster("clip-iacp-d1-r6", "219\\3-6", "David", "949-300-5076", "--"),
          ],
          runs: [
            run("clip-iacp-d1-n1", "1:10 PM", "5607\\3-2", "Rafael", 4, "--", { a: 1, b: 3 }),
            run("clip-iacp-d1-n2", "1:30 PM", "260\\3-5", "Kevin", 0, "--", { a: 0, b: 0 }),
            run("clip-iacp-d1-n3", "1:50 PM", "343\\3-4", "James", 0, "--", { a: 0, b: 0 }),
            run("clip-iacp-d1-n4", "2:10 PM", "219\\3-6", "David", 0, "--", { a: 0, b: 0 }),
            run("clip-iacp-d1-n5", "2:40 PM", "0316\\3-1", "Blanca", 0, "--", { a: 0, b: 0 }),
            run("clip-iacp-d1-n6", "3:05 PM", "243\\3-3", "Philip", 1, "--", { a: 0, b: 1 }),
            run("clip-iacp-d1-n7", "~3:25 PM", "5607\\3-2", "Rafael", 0, "--", { a: 0, b: 0 }),
            run("clip-iacp-d1-n8", "~4:15 PM", "260\\3-5", "Kevin", 3, "R3-05 ✓", { a: 0, b: 3 }),
            run("clip-iacp-d1-n9", "~4:24 PM", "0316\\3-1", "Blanca", 0, "--", { a: 0, b: 0 }),
          ],
        }),
        day({
          id: "clip-iacp-d2",
          label: "Day 2 - Sat 10/24",
          notes: "Sat Oct 24, 2026 (Residence Inn SeaWorld Dispatch)",
          splitMode: false,
          stopAName: "Hilton",
          stopBName: "Element",
          headwayMinutes: 20,
          roster: [
            roster("clip-iacp-d2-r1", "5607\\3-1", "Rafael", "407-393-0939", "8:00-9:20"),
            roster("clip-iacp-d2-r2", "0316\\3-2", "Blanca", "407-529-9874", "8:00-9:30"),
            roster("clip-iacp-d2-r3", "241\\3-3", "Edwin", "407-506-6670", "8:45-10:30"),
            roster("clip-iacp-d2-r4", "219\\3-4", "David", "949-300-5076", "--"),
            roster("clip-iacp-d2-r5", "260\\3-5", "Kevin", "978-417-2422", "--"),
            roster("clip-iacp-d2-r6", "243\\3-6", "Philip", "863-614-2436", "9:00-10:45"),
          ],
          runs: [
            run("clip-iacp-d2-n1", "6:55 AM", "5607\\3-1", "Rafael", 0, "Mid-route jump start"),
            run("clip-iacp-d2-n2", "7:00 AM", "0316\\3-2", "Blanca", 0, "--"),
            run("clip-iacp-d2-n3", "7:20 AM", "241\\3-3", "Edwin", 0, "--"),
            run("clip-iacp-d2-n4", "7:40 AM", "219\\3-4", "David", 6, "R3-04 ✓"),
            run("clip-iacp-d2-n5", "8:00 AM", "260\\3-5", "Kevin", 3, "R3-05 ✓"),
            run("clip-iacp-d2-n6", "8:15 AM", "243\\3-6", "Philip", 6, "R3-06 ✓"),
            run("clip-iacp-d2-n7", "8:30 AM", "241\\3-3", "Edwin", 15, "R3-03 ✓"),
            run("clip-iacp-d2-n8", "8:45 AM", "219\\3-4", "David", 4, "R3-04 ✓"),
            run("clip-iacp-d2-n9", "9:00 AM", "260\\3-5", "Kevin", 7, "R3-05 ✓"),
            run("clip-iacp-d2-n10", "9:20 AM", "5607\\3-1", "Rafael", 1, "R3-01 ✓"),
            run("clip-iacp-d2-n11", "9:40 AM", "219\\3-4", "David", 0, "--"),
            run("clip-iacp-d2-n12", "10:00 AM", "0316\\3-2", "Blanca", 6, "R3-02 ✓"),
            run("clip-iacp-d2-n13", "10:15 AM", "260\\3-5", "Kevin", 5, "R3-05 ✓"),
            run("clip-iacp-d2-n14", "10:30 AM", "241\\3-3", "Edwin", 0, "--"),
            run("clip-iacp-d2-n15", "10:45 AM", "5607\\3-1", "Rafael", 8, "R3-01 ✓"),
            run("clip-iacp-d2-n16", "11:00 AM", "243\\3-6", "Philip", 2, "R3-06 ✓"),
          ],
        }),
        day({
          id: "clip-iacp-d3",
          label: "Day 3 - Sun 10/25",
          notes: "Sun Oct 25, 2026 (Residence Inn SeaWorld Dispatch)",
          splitMode: false,
          stopAName: "Hilton",
          stopBName: "Element",
          headwayMinutes: 15,
          roster: [
            roster("clip-iacp-d3-r1", "241\\3.1", "Edwin", "407-506-6670", "8:00-9:30"),
            roster("clip-iacp-d3-r2", "5607\\3.2", "Rafael", "407-393-0939", "9:15-10:45"),
            roster("clip-iacp-d3-r3", "0316\\3.3", "Blanca", "407-529-9874", "10:45-12:15"),
            roster("clip-iacp-d3-r4", "343\\3.4", "Philip", "863-614-2436", "8:30-10:00"),
            roster("clip-iacp-d3-r5", "219\\3.5", "David", "949-300-5076", "11:00-12:30"),
            roster("clip-iacp-d3-r6", "260\\3.6", "Kevin", "978-417-2422", "9:45-11:15"),
            roster("clip-iacp-d3-r7", "8670", "Jose", "347-698-7166", "11:00-11:30 (quick break)", "", { isFillIn: true, breakStatus: "fill-in" }),
          ],
          runs: [
            run("clip-iacp-d3-n1", "7:00 AM", "241\\3.1", "Edwin", 8, "R3-01 ✓"),
            run("clip-iacp-d3-n2", "7:15 AM", "5607\\3.2", "Rafael", 3, "R3-02 ✓"),
            run("clip-iacp-d3-n3", "7:30 AM", "0316\\3.3", "Blanca", 3, "R3-03 ✓"),
            run("clip-iacp-d3-n4", "7:40 AM", "343\\3.4", "Philip", 9, "R3-04 ✓"),
            run("clip-iacp-d3-n5", "7:50 AM", "219\\3.5", "David", 2, "R3-05 ✓"),
            run("clip-iacp-d3-n6", "8:00 AM", "260\\3.6", "Kevin", 8, "R3-06 ✓"),
            run("clip-iacp-d3-n7", "8:15 AM", "5607\\3.2", "Rafael", 13, "R3-02 ✓"),
            run("clip-iacp-d3-n8", "8:30 AM", "0316\\3.3", "Blanca", 9, "R3-03 ✓"),
            run("clip-iacp-d3-n9", "8:45 AM", "219\\3.5", "David", 9, "R3-05 ✓"),
            run("clip-iacp-d3-n10", "9:00 AM", "260\\3.6", "Kevin", 8, "R3-06 ✓"),
            run("clip-iacp-d3-n11", "9:15 AM", "0316\\3.3", "Blanca", 3, "R3-03 ✓"),
            run("clip-iacp-d3-n12", "9:30 AM", "241\\3.1", "Edwin", 12, "R3-01 ✓"),
            run("clip-iacp-d3-n13", "9:45 AM", "219\\3.5", "David", 17, "R3-05 ✓"),
            run("clip-iacp-d3-n14", "10:00 AM", "0316\\3.3", "Blanca", 12, "R3-03 ✓"),
            run("clip-iacp-d3-n15", "10:45 AM", "241\\3.1", "Edwin", 3, "R3-01 ✓"),
          ],
        }),
        morningMonday(),
        nightMonday(),
        tuesday(),
      ],
    },
  ];
}

function morningMonday(): ClipboardDay {
  const stop = "Residence Inn";
  const back = { breakStatus: "back" as BreakStatus };
  return day({
    id: "clip-iacp-d4-am",
    label: "Day 4 - Mon 10/26 AM",
    notes: "Mon Oct 26, 2026 (6:30–11:30 AM | Residence Inn, Route 3 — 15/20-min headway)",
    splitMode: false,
    stopAName: "Hilton",
    stopBName: "Element",
    headwayMinutes: 15,
    seedRevision: OFFICIAL_REVISION,
    departureStop: stop,
    roster: [
      roster("clip-iacp-d4-am-r1", "241/3.1", "Edwin", "407-486-7494", "--", undefined, back),
      roster("clip-iacp-d4-am-r2", "343/3.2", "Philip", "321-276-9786", "--", undefined, back),
      roster("clip-iacp-d4-am-r3", "5607/3.3", "Rafael", "407-535-1037", "--", undefined, back),
      roster("clip-iacp-d4-am-r4", "0316/3.4", "Blanca", "407-692-6375", "--", undefined, back),
      roster("clip-iacp-d4-am-r5", "219/3.5", "David", "407-234-4399", "--", undefined, back),
      roster("clip-iacp-d4-am-r6", "260/3.6", "Kevin", "863-585-8306", "--", undefined, back),
      roster("clip-iacp-d4-am-r7", "1611", "Albaro", "321-240-0169", "--", "", { isFillIn: true, breakStatus: "fill-in" }),
    ],
    runs: [
      run("clip-iacp-d4-am-n1", "7:00 AM", "241/3.1", "Edwin", 7, "R3-01 ✓", undefined, { stopName: stop, synced: true }),
      run("clip-iacp-d4-am-n2", "7:15 AM", "343/3.2", "Philip", 1, "R3-02 ✓", undefined, { stopName: stop, synced: true }),
      run("clip-iacp-d4-am-n3", "7:30 AM", "5607/3.3", "Rafael", 6, "R3-03 ✓", undefined, { stopName: stop, synced: true }),
      run("clip-iacp-d4-am-n4", "7:45 AM", "0316/3.4", "Blanca", 1, "R3-04 ✓", undefined, { stopName: stop, synced: true }),
      run("clip-iacp-d4-am-n5", "8:00 AM", "219/3.5", "David", 0, "--", undefined, { stopName: stop, synced: false }),
      run("clip-iacp-d4-am-n6", "8:20 AM", "260/3.6", "Kevin", 4, "R3-06 ✓", undefined, { stopName: stop, synced: true }),
      run("clip-iacp-d4-am-n7", "8:40 AM", "343/3.2", "Philip", 3, "R3-02 ✓", undefined, { stopName: stop, synced: true }),
      run("clip-iacp-d4-am-n8", "9:00 AM", "0316/3.4", "Blanca", 7, "R3-04 ✓", undefined, { stopName: stop, synced: true }),
      run("clip-iacp-d4-am-n9", "9:15 AM", "260/3.6", "Kevin", 15, "R3-06 ✓", undefined, { stopName: stop, synced: true }),
      run("clip-iacp-d4-am-n10", "9:30 AM", "343/3.2", "Philip", 8, "R3-02 ✓", undefined, { stopName: stop, synced: true }),
      run("clip-iacp-d4-am-n11", "9:45 AM", "219/3.5", "David", 11, "R3-05 ✓", undefined, { stopName: stop, synced: true }),
      run("clip-iacp-d4-am-n12", "10:00 AM", "1611", "Albaro", 6, "--", undefined, { stopName: stop, synced: false }),
      run("clip-iacp-d4-am-n13", "10:15 AM", "241/3.1", "Edwin", 5, "R3-01 ✓", undefined, { stopName: stop, synced: true }),
      run("clip-iacp-d4-am-n14", "10:30 AM", "5607/3.3", "Rafael", 6, "R3-03 ✓", undefined, { stopName: stop, synced: true }),
      run("clip-iacp-d4-am-n15", "10:45 AM", "260/3.6", "Kevin", 7, "R3-06 ✓", undefined, { stopName: stop, synced: true }),
      run("clip-iacp-d4-am-n16", "10:50 AM", "1611", "Albaro", 0, "--", undefined, { stopName: stop, synced: false }),
      run("clip-iacp-d4-am-n17", "11:00 AM", "241/3.1", "Edwin", 3, "R3-01 ✓", undefined, { stopName: stop, synced: true }),
      run("clip-iacp-d4-am-n18", "11:15 AM", "5607/3.3", "Rafael", 2, "R3-03 ✓", undefined, { stopName: stop, synced: true }),
    ],
  });
}

function nightMonday(): ClipboardDay {
  const stop = "Universal";
  const buses: Array<[string, string, string]> = [
    ["clip-iacp-d4-night-r1", "MT3", "Curtes"],
    ["clip-iacp-d4-night-r2", "922", "Luis"],
    ["clip-iacp-d4-night-r3", "MT7", "Thomas"],
    ["clip-iacp-d4-night-r4", "MT10", "Sam"],
    ["clip-iacp-d4-night-r5", "MT19", "EJ"],
    ["clip-iacp-d4-night-r6", "M12", "Anthony"],
    ["clip-iacp-d4-night-r7", "971", "Antonio"],
    ["clip-iacp-d4-night-r8", "MT2", "Maria"],
    ["clip-iacp-d4-night-r9", "925", "Jose"],
  ];
  const logged = { stopName: stop, synced: true };
  return day({
    id: "clip-iacp-d4-night",
    label: "Day 4 - Mon 10/26 Night (Universal)",
    notes: "Mon Oct 26, 2026 (6:00 PM–12:00 AM | Chief's Night @ Universal's Islands of Adventure — 9 Maze Buses)",
    splitMode: false,
    stopAName: "Universal",
    stopBName: "Hotels",
    headwayMinutes: 20,
    mode: "special",
    seedRevision: OFFICIAL_REVISION,
    departureStop: stop,
    overageEnabled: true,
    ingress: [
      { id: "ri", name: "Residence Inn", count: 120, staffed: true },
      { id: "el", name: "Element", count: 66, staffed: true },
      { id: "sh", name: "SpringHill Suites", count: 160, staffed: true },
      { id: "hgv", name: "Hilton GV Trolley", count: 0, staffed: false },
    ],
    roster: buses.map(([id, bus, driver]) => roster(id, bus, driver, "", "--", "")),
    runs: [
      run("clip-iacp-d4-night-n1", "9:08 PM", "M12", "Anthony", 6, "--", undefined, logged),
      run("clip-iacp-d4-night-n2", "9:24 PM", "MT7", "Thomas", 13, "--", undefined, logged),
      run("clip-iacp-d4-night-n3", "9:46 PM", "971", "Antonio", 42, "--", undefined, logged),
      run("clip-iacp-d4-night-n4", "9:59 PM", "MT3", "Curtes", 27, "--", undefined, logged),
      run("clip-iacp-d4-night-n5", "10:10 PM", "M12", "Anthony", 48, "--", undefined, logged),
      run("clip-iacp-d4-night-n6", "10:23 PM", "MT10", "Sam", 51, "--", undefined, logged),
      run("clip-iacp-d4-night-n7", "10:30 PM", "MT2", "Maria", 0, "--", undefined, { stopName: stop, synced: false, paxUnknown: true }),
      run("clip-iacp-d4-night-n8", "10:45 PM", "MT19", "EJ", 50, "--", undefined, logged),
      run("clip-iacp-d4-night-n9", "11:00 PM", "925", "Jose", 48, "--", undefined, logged),
      run("clip-iacp-d4-night-n10", "11:08 PM", "MT3", "Curtes", 48, "--", undefined, logged),
      run("clip-iacp-d4-night-n11", "11:14 PM", "922", "Luis", 50, "--", undefined, logged),
      run("clip-iacp-d4-night-n12", "11:21 PM", "971", "Antonio", 47, "--", undefined, logged),
      run("clip-iacp-d4-night-n13", "11:25 PM", "M12", "Anthony", 47, "--", undefined, logged),
      run("clip-iacp-d4-night-n14", "11:32 PM", "MT7", "Thomas", 49, "--", undefined, logged),
      run("clip-iacp-d4-night-n15", "11:45 PM", "MT10", "Sam", 28, "--", undefined, logged),
      run("clip-iacp-d4-night-n16", "11:50 PM", "MT2", "Maria", 0, "--", undefined, { stopName: stop, synced: false }),
      run("clip-iacp-d4-night-n17", "12:00 AM", "MT19", "EJ", 0, "--", undefined, { stopName: stop, synced: false }),
    ],
  });
}

function tuesday(): ClipboardDay {
  const stop = "Residence Inn";
  const back = { breakStatus: "back" as BreakStatus };
  const logged = { stopName: stop, synced: true };
  return day({
    id: "clip-iacp-d5",
    label: "Day 5 - Tue 10/27",
    notes: "Tue Oct 27, 2026 (7:00–11:00 AM | Residence Inn, Route 3 — 20-min headway)",
    splitMode: false,
    stopAName: "Hilton",
    stopBName: "Element",
    headwayMinutes: 20,
    seedRevision: OFFICIAL_REVISION,
    departureStop: stop,
    roster: [
      roster("clip-iacp-d5-r1", "241/3.1", "Edwin", "407-486-7494", "--", undefined, back),
      roster("clip-iacp-d5-r2", "P3128/3.2", "Robbie", "321-332-3499", "--", undefined, back),
      roster("clip-iacp-d5-r3", "5215/3.3", "Blanca", "407-692-6375", "--", undefined, back),
      roster("clip-iacp-d5-r4", "219/3.4", "David", "407-234-4399", "--", undefined, back),
      roster("clip-iacp-d5-r5", "343/3.5", "Philip", "321-276-9786", "--", undefined, back),
      roster("clip-iacp-d5-r6", "260/3.6", "Kevin", "863-585-8306", "--", undefined, back),
    ],
    runs: [
      run("clip-iacp-d5-n1", "7:05 AM", "241/3.1", "Edwin", 0, "R3-01 ✓", undefined, { stopName: stop, synced: false }),
      run("clip-iacp-d5-n2", "7:20 AM", "P3128/3.2", "Robbie", 8, "R3-02 ✓", undefined, logged),
      run("clip-iacp-d5-n3", "7:40 AM", "5215/3.3", "Blanca", 1, "R3-03 ✓", undefined, logged),
      run("clip-iacp-d5-n4", "8:00 AM", "219/3.4", "David", 1, "R3-04 ✓", undefined, logged),
      run("clip-iacp-d5-n5", "8:20 AM", "343/3.5", "Philip", 2, "R3-05 ✓", undefined, logged),
      run("clip-iacp-d5-n6", "8:40 AM", "5215/3.3", "Blanca", 4, "R3-03 ✓", undefined, logged),
      run("clip-iacp-d5-n7", "9:00 AM", "260/3.6", "Kevin", 7, "R3-06 ✓", undefined, logged),
      run("clip-iacp-d5-n8", "9:20 AM", "219/3.4", "David", 6, "R3-04 ✓", undefined, logged),
      run("clip-iacp-d5-n9", "9:40 AM", "241/3.1", "Edwin", 6, "R3-01 ✓", undefined, logged),
      run("clip-iacp-d5-n10", "10:00 AM", "P3128/3.2", "Robbie", 11, "R3-02 ✓", undefined, logged),
      run("clip-iacp-d5-n11", "10:20 AM", "219/3.4", "David", 1, "R3-04 ✓", undefined, logged),
      run("clip-iacp-d5-n12", "10:40 AM", "343/3.5", "Philip", 4, "R3-05 ✓", undefined, logged),
      run("clip-iacp-d5-n13", "11:00 AM", "241/3.1", "Edwin", 6, "R3-01 ✓", undefined, logged),
    ],
  });
}

const OFFICIAL_IDS = ["clip-iacp-d4-am", "clip-iacp-d4-night", "clip-iacp-d5"] as const;

export function syncOfficialDays(programs: ClipboardProgram[]) {
  const officialProgram = buildSeedPrograms()[0];
  const official = new Map(officialProgram.days.filter((item) => OFFICIAL_IDS.includes(item.id as (typeof OFFICIAL_IDS)[number])).map((item) => [item.id, item]));
  if (!programs.some((program) => /IACP 2026/i.test(program.name))) {
    return { programs: [structuredClone(officialProgram), ...programs], changed: true };
  }
  let changed = false;
  const next = programs.map((program) => {
    if (!/IACP 2026/i.test(program.name)) return program;
    let days = program.days.map((item) => {
      const patched = patchJose(item);
      if (patched !== item) changed = true;
      return patched;
    });
    for (const id of OFFICIAL_IDS) {
      const source = official.get(id);
      if (!source) continue;
      const index = days.findIndex((item) => item.id === id);
      if (index === -1) {
        if (id === "clip-iacp-d4-am") {
          const old = days.findIndex(isOldMonday);
          if (old >= 0) {
            days = days.map((item, cursor) => (cursor === old ? structuredClone(source) : item));
            changed = true;
            continue;
          }
        }
        days = insertOfficial(days, structuredClone(source));
        changed = true;
      } else if (days[index].seedRevision !== OFFICIAL_REVISION && isOldMonday(days[index])) {
        days = days.map((item, cursor) => (cursor === index ? structuredClone(source) : item));
        changed = true;
      }
    }
    return { ...program, days };
  });
  return { programs: next, changed };
}

function isOldMonday(day: ClipboardDay) {
  if (day.seedRevision === OFFICIAL_REVISION) return false;
  if (day.id === "clip-iacp-d4-night" || /night/i.test(day.label)) return false;
  const monday = day.id === "clip-iacp-d4" || day.id === "clip-iacp-d4-am" || /10\/26/.test(day.label);
  if (!monday) return false;
  return day.runs.length === 0 || day.roster.every((row) => row.driver === "Open" || row.driver === "");
}

function patchJose(day: ClipboardDay) {
  let touched = false;
  const roster = day.roster.map((row) => {
    const bus = row.busPuck.replace(/\\/g, "/").split("/")[0];
    if (row.driver !== "Jose" || bus !== "8670" || row.isFillIn) return row;
    if (!row.breakText.includes("quick break")) return row;
    touched = true;
    return { ...row, isFillIn: true, breakStatus: "fill-in" as BreakStatus, siteCode: "" };
  });
  return touched ? { ...day, roster } : day;
}

function insertOfficial(days: ClipboardDay[], day: ClipboardDay) {
  if (day.id === "clip-iacp-d4-am") {
    const night = days.findIndex((item) => item.id === "clip-iacp-d4-night");
    const at = night >= 0 ? night : days.length;
    return [...days.slice(0, at), day, ...days.slice(at)];
  }
  if (day.id === "clip-iacp-d4-night") {
    const tuesdayIndex = days.findIndex((item) => item.id === "clip-iacp-d5");
    const at = tuesdayIndex >= 0 ? tuesdayIndex : days.length;
    return [...days.slice(0, at), day, ...days.slice(at)];
  }
  return [...days, day];
}
