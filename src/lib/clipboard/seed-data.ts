import { applyInitialClicker, siteCodeFromBusPuck } from "./logic";
import type { ClipboardDay, ClipboardProgram, DispatchRun, RosterRow } from "./types";

function roster(
  id: string,
  busPuck: string,
  driver: string,
  phone: string,
  breakText: string,
  siteCode = siteCodeFromBusPuck(busPuck),
): RosterRow {
  return { id, busPuck, driver, phone, breakText, siteCode };
}

function run(
  id: string,
  timeLabel: string,
  busPuck: string,
  driver: string,
  pax: number,
  site: string,
  stops?: { a: number; b: number },
): DispatchRun {
  const note = site === "--" || site.endsWith("✓") ? "" : site;
  const logged = site.endsWith("✓");
  const tagged = logged ? site.replace(/\s*✓$/, "").trim() : "";
  return {
    id,
    timeLabel,
    busPuck,
    driver,
    pax,
    stopAPax: stops ? stops.a : null,
    stopBPax: stops ? stops.b : null,
    siteCode: tagged || siteCodeFromBusPuck(busPuck),
    siteNote: note,
    logged,
  };
}

function day(partial: Omit<ClipboardDay, "clickerA" | "clickerB" | "pendingLogged" | "pendingNote" | "nextDispatch" | "activeRosterId"> & Partial<Pick<ClipboardDay, "nextDispatch" | "activeRosterId">>): ClipboardDay {
  return applyInitialClicker({
    nextDispatch: "",
    activeRosterId: null,
    clickerA: 0,
    clickerB: 0,
    pendingLogged: true,
    pendingNote: "",
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
            roster("clip-iacp-d3-r7", "8670", "Jose", "347-698-7166", "11:00-11:30 (quick break)", ""),
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
        day({
          id: "clip-iacp-d4",
          label: "Day 4 - Mon 10/26",
          notes:
            "Mon Oct 26, 2026 (Morning 6:30–11:30 AM EDT · Chief's Night 6:00 PM–12:00 AM EDT at Universal's Islands of Adventure). Curb: Donna Molina at Residence Inn · Aaron Molina at Element · Marissa Molina at SpringHill. Link pucks R3-01–R3-06 and floaters Stealth-01–03 on the live map.",
          splitMode: false,
          stopAName: "Hilton",
          stopBName: "Element",
          headwayMinutes: 20,
          nextDispatch: "7:00 AM",
          roster: [
            roster("clip-iacp-d4-r1", "3-1", "Open", "", "--", "R3-01"),
            roster("clip-iacp-d4-r2", "3-2", "Open", "", "--", "R3-02"),
            roster("clip-iacp-d4-r3", "3-3", "Open", "", "--", "R3-03"),
            roster("clip-iacp-d4-r4", "3-4", "Open", "", "--", "R3-04"),
            roster("clip-iacp-d4-r5", "3-5", "Open", "", "--", "R3-05"),
            roster("clip-iacp-d4-r6", "3-6", "Open", "", "--", "R3-06"),
          ],
          runs: [],
        }),
      ],
    },
  ];
}

export function withMonday(programs: ClipboardProgram[]) {
  const monday = buildSeedPrograms()[0]?.days.find((item) => item.id === "clip-iacp-d4");
  if (!monday) return { programs, changed: false };
  let changed = false;
  const next = programs.map((program) => {
    if (!/IACP 2026/i.test(program.name)) return program;
    if (program.days.some((item) => item.id === monday.id || item.label.includes("10/26"))) return program;
    changed = true;
    return { ...program, days: [...program.days, structuredClone(monday)] };
  });
  if (!next.some((program) => /IACP 2026/i.test(program.name))) {
    return { programs: [...buildSeedPrograms(), ...next], changed: true };
  }
  return { programs: next, changed };
}
