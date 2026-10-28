import type { BreakStatus, ClipboardDay, DayTotals, DispatchRun, HeadwayMinutes, IngressStop, RosterRow } from "./types";

export const BREAK_ORDER: BreakStatus[] = ["back", "on", "need", "fill-in"];

export const BREAK_LABEL: Record<BreakStatus, string> = {
  back: "Back from Break",
  on: "Currently on Break",
  need: "Still Need Break",
  "fill-in": "Fill-in",
};

export function breakStatusOf(row: { breakStatus?: RosterRow["breakStatus"]; isFillIn?: boolean }): BreakStatus {
  if (row.breakStatus === "back" || row.breakStatus === "on" || row.breakStatus === "need" || row.breakStatus === "fill-in") {
    return row.breakStatus;
  }
  return row.isFillIn ? "fill-in" : "back";
}

export function displayBus(row: { busPuck: string; isFillIn?: boolean; breakStatus?: RosterRow["breakStatus"] }) {
  const normalized = row.busPuck.trim().replace(/\\/g, "/");
  if (row.isFillIn || breakStatusOf(row) === "fill-in") return normalized.split("/")[0]?.trim() || normalized;
  return normalized;
}

export function busNumber(busPuck: string) {
  return busPuck.trim().replace(/\\/g, "/").split("/")[0]?.trim() ?? "";
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

export function newId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `clip-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function siteCodeFromBusPuck(busPuck: string) {
  const parts = busPuck.trim().split(/[/\\]/);
  if (parts.length < 2) return "";
  const puck = parts.slice(1).join("");
  const match = puck.match(/(\d+)\s*[.\-]\s*(\d+)/);
  if (!match) return "";
  const route = parseInt(match[1], 10);
  const slot = parseInt(match[2], 10);
  if (!Number.isFinite(route) || !Number.isFinite(slot)) return "";
  return `R${route}-${String(slot).padStart(2, "0")}`;
}

export function formatPhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  const local = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (local.length !== 10) return raw.trim();
  return `${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6)}`;
}

export function telHref(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `tel:+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `tel:+${digits}`;
  if (!digits) return "";
  return `tel:+${digits}`;
}

export function parseClock(label: string) {
  const cleaned = label.replace(/~/g, "").replace(/\s+/g, " ").trim();
  const match = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) return null;
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

export function formatClock(totalMinutes: number) {
  const day = 24 * 60;
  const mins = ((totalMinutes % day) + day) % day;
  let hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  const period = hours >= 12 ? "PM" : "AM";
  hours %= 12;
  if (hours === 0) hours = 12;
  return `${hours}:${String(minutes).padStart(2, "0")} ${period}`;
}

export function addMinutes(label: string, delta: number) {
  const parsed = parseClock(label);
  if (parsed == null || !Number.isFinite(delta)) return label;
  return formatClock(parsed + delta);
}

export function nowClock(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);
  const hour = parts.find((part) => part.type === "hour")?.value ?? "12";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  const period = (parts.find((part) => part.type === "dayPeriod")?.value ?? "AM").toUpperCase();
  return `${hour}:${minute.padStart(2, "0")} ${period}`;
}

export function siteLabel(run: Pick<DispatchRun, "siteCode" | "siteNote" | "logged">) {
  const note = run.siteNote.trim();
  if (note && note !== "--") return run.logged ? `${note} ✓` : note;
  if (run.logged && run.siteCode) return `${run.siteCode} ✓`;
  if (run.logged) return "✓";
  return "--";
}

export function rosterCopyText(rows: RosterRow[], withPhones = false) {
  return rows
    .map((row) => {
      const phone = withPhones ? formatPhone(row.phone) : "";
      const bus = displayBus(row);
      return phone ? `${bus} ${row.driver} (${phone})` : `${bus} ${row.driver}`;
    })
    .join("\n");
}

export function breaksCopyText(rows: RosterRow[], withPhones = false) {
  return BREAK_ORDER.map((status) => {
    const members = rows.filter((row) => breakStatusOf(row) === status);
    const lines = members.map((row) => {
      const phone = withPhones ? formatPhone(row.phone) : "";
      const window = row.breakText.trim() && row.breakText.trim() !== "--" ? ` ${row.breakText.trim()}` : "";
      const who = phone ? `${displayBus(row)} ${row.driver} (${phone})` : `${displayBus(row)} ${row.driver}`;
      return `${who}${window}`;
    });
    return [BREAK_LABEL[status], ...lines].join("\n");
  }).join("\n\n");
}

export function chatTime(label: string) {
  const trimmed = label.trim();
  if (/^12:\d{2}\s*AM$/i.test(trimmed)) return trimmed.replace(/\s+/g, " ");
  return trimmed.replace(/\s*AM$/i, "").trim();
}

export function departureCopyText(run: DispatchRun, day: Pick<ClipboardDay, "departureStop" | "roster">) {
  const stop = run.stopName.trim() || day.departureStop.trim() || "Residence Inn";
  const fillIn = day.roster.some((row) => row.driver === run.driver && busNumber(row.busPuck) === busNumber(run.busPuck) && (row.isFillIn || breakStatusOf(row) === "fill-in"));
  const bus = displayBus({ busPuck: run.busPuck, isFillIn: fillIn || !/[\\/]/.test(run.busPuck), breakStatus: fillIn ? "fill-in" : "" });
  const pax = run.paxUnknown ? "--" : run.advance ? `${run.pax} pax (to route)` : `${run.pax} pax`;
  return `${stop}- ${bus} - ${pax} @ ${chatTime(run.timeLabel)}`;
}

export function autoAssignPucks(rows: RosterRow[]): RosterRow[] {
  let slot = 1;
  return rows.map((row) => {
    if (row.isFillIn || breakStatusOf(row) === "fill-in") {
      return { ...row, isFillIn: true, breakStatus: "fill-in", busPuck: busNumber(row.busPuck), siteCode: "" };
    }
    if (slot > 6) return row;
    const bus = busNumber(row.busPuck);
    if (!bus) return row;
    const busPuck = `${bus}/3.${slot}`;
    slot += 1;
    return { ...row, busPuck, siteCode: siteCodeFromBusPuck(busPuck), isFillIn: false };
  });
}

export function cycleBreak(row: RosterRow): RosterRow {
  const current = breakStatusOf(row);
  const next = BREAK_ORDER[(BREAK_ORDER.indexOf(current) + 1) % BREAK_ORDER.length];
  if (next === "fill-in") {
    return { ...row, breakStatus: next, isFillIn: true, busPuck: busNumber(row.busPuck), siteCode: "" };
  }
  return { ...row, breakStatus: next, isFillIn: false };
}

export function setCount(day: ClipboardDay, value: number): ClipboardDay {
  return { ...day, clickerA: Math.max(0, Math.round(value)), clickerB: day.splitMode ? day.clickerB : 0 };
}

export function pendingRuns(day: ClipboardDay) {
  return day.runs.filter((run) => run.synced === false);
}

export function falconBlocked(run: DispatchRun, day: ClipboardDay) {
  const fillIn = day.roster.some((row) => row.driver === run.driver && busNumber(row.busPuck) === busNumber(run.busPuck) && row.isFillIn);
  return run.paxUnknown || run.pax === 0 || fillIn || (!siteCodeFromBusPuck(run.busPuck) && day.mode !== "special");
}

export function markBatchSynced(day: ClipboardDay): ClipboardDay {
  return { ...day, runs: day.runs.map((run) => (run.synced === false ? { ...run, synced: true } : run)) };
}

export function returnNumber(runs: DispatchRun[], index: number) {
  const run = runs[index];
  if (!run) return 1;
  let count = 0;
  for (let cursor = 0; cursor <= index; cursor += 1) {
    if (runs[cursor].driver === run.driver && busNumber(runs[cursor].busPuck) === busNumber(run.busPuck)) count += 1;
  }
  return count;
}

export function driverTallies(day: ClipboardDay) {
  const map = new Map<string, { bus: string; driver: string; runs: number; pax: number }>();
  for (const run of day.runs) {
    const key = `${busNumber(run.busPuck)}|${run.driver}`;
    const current = map.get(key) ?? { bus: busNumber(run.busPuck), driver: run.driver, runs: 0, pax: 0 };
    current.runs += 1;
    if (!run.paxUnknown) current.pax += run.pax;
    map.set(key, current);
  }
  return [...map.values()];
}

export function ingressMath(day: ClipboardDay) {
  const staffed = day.ingress.filter((stop) => stop.staffed).reduce((sum, stop) => sum + stop.count, 0);
  const manualOverage = day.ingress.filter((stop) => !stop.staffed).reduce((sum, stop) => sum + stop.count, 0);
  const returned = day.runs.reduce((sum, run) => sum + (run.paxUnknown ? 0 : run.pax), 0);
  const overage = day.overageEnabled ? Math.max(0, returned - staffed) : manualOverage;
  const total = staffed + overage;
  return { staffed, overage, total, returned, remaining: total - returned, runs: day.runs.length };
}

export function blankIngress(): IngressStop[] {
  return [
    { id: "ri", name: "Residence Inn", count: 0, staffed: true },
    { id: "el", name: "Element", count: 0, staffed: true },
    { id: "sh", name: "SpringHill Suites", count: 0, staffed: true },
    { id: "hgv", name: "Hilton GV Trolley", count: 0, staffed: false },
  ];
}

export function dayTotals(day: ClipboardDay): DayTotals {
  return day.runs.reduce<DayTotals>(
    (totals, run) => {
      totals.runs += 1;
      totals.pax += run.paxUnknown ? 0 : run.pax;
      totals.stopA += run.stopAPax ?? 0;
      totals.stopB += run.stopBPax ?? 0;
      return totals;
    },
    { runs: 0, pax: 0, stopA: 0, stopB: 0 },
  );
}

export function summaryLine(day: ClipboardDay) {
  const totals = dayTotals(day);
  if (day.splitMode) {
    return `${totals.runs} runs | ${day.stopAName}: ${totals.stopA} | ${day.stopBName}: ${totals.stopB} | Total: ${totals.pax} pax`;
  }
  return `${totals.runs} runs | ${totals.pax} pax`;
}

export function dispatchLogCopyText(day: ClipboardDay) {
  const lines = day.runs.map((run) => {
    const site = siteLabel(run);
    const count = run.paxUnknown ? "--" : `${run.pax} pax`;
    const pax = day.splitMode
      ? `${day.stopAName} ${run.stopAPax ?? 0}, ${day.stopBName} ${run.stopBPax ?? 0} | ${count}`
      : count;
    const sitePart = site === "--" ? "" : ` | ${site}`;
    return `${run.timeLabel} | ${run.busPuck} | ${run.driver} | ${pax}${sitePart}`;
  });
  lines.push(summaryLine(day));
  return lines.join("\n");
}

export function boardingTotal(day: ClipboardDay) {
  return day.splitMode ? day.clickerA + day.clickerB : day.clickerA;
}

export function activeRoster(day: ClipboardDay) {
  return day.roster.find((row) => row.id === day.activeRosterId) ?? day.roster[0] ?? null;
}

export function cycleRoster(day: ClipboardDay, direction: -1 | 1) {
  if (day.roster.length === 0) return day;
  const index = Math.max(0, day.roster.findIndex((row) => row.id === day.activeRosterId));
  const next = day.roster[(index + direction + day.roster.length) % day.roster.length];
  return selectRoster(day, next.id);
}

export function selectRoster(day: ClipboardDay, rosterId: string): ClipboardDay {
  const row = day.roster.find((item) => item.id === rosterId);
  if (!row) return day;
  const site = row.siteCode || siteCodeFromBusPuck(row.busPuck);
  return { ...day, activeRosterId: row.id, pendingLogged: Boolean(site) };
}

export function nudgeCount(day: ClipboardDay, stop: "a" | "b", delta: number): ClipboardDay {
  if (stop === "b" && !day.splitMode) return day;
  const key = stop === "a" ? "clickerA" : "clickerB";
  return { ...day, [key]: Math.max(0, day[key] + delta) };
}

export function resetCount(day: ClipboardDay): ClipboardDay {
  return { ...day, clickerA: 0, clickerB: 0 };
}

export function logDeparture(day: ClipboardDay): ClipboardDay {
  const roster = activeRoster(day);
  if (!roster) return day;
  const siteCode = roster.siteCode || siteCodeFromBusPuck(roster.busPuck);
  const note = day.pendingNote.trim();
  const noteClean = note === "--" ? "" : note;
  const run: DispatchRun = {
    id: newId(),
    timeLabel: day.nextDispatch.trim() || nowClock(),
    busPuck: roster.isFillIn ? busNumber(roster.busPuck) : roster.busPuck.replace(/\\/g, "/"),
    driver: roster.driver,
    pax: boardingTotal(day),
    stopAPax: day.splitMode ? day.clickerA : null,
    stopBPax: day.splitMode ? day.clickerB : null,
    siteCode: roster.isFillIn ? "" : siteCode,
    siteNote: noteClean,
    logged: day.pendingLogged && Boolean(siteCode || noteClean),
    synced: false,
    paxUnknown: false,
    advance: /to route/i.test(noteClean),
    stopName: day.departureStop.trim() || "Residence Inn",
  };
  return {
    ...day,
    runs: [...day.runs, run],
    clickerA: 0,
    clickerB: 0,
    pendingNote: "",
    nextDispatch: addMinutes(run.timeLabel, day.headwayMinutes),
  };
}

export function repeatRoster(rows: RosterRow[]): RosterRow[] {
  return rows.map((row) => ({
    ...row,
    id: newId(),
    breakText: "--",
    breakStatus: row.isFillIn ? "fill-in" : "need",
    siteCode: row.isFillIn ? "" : row.siteCode || siteCodeFromBusPuck(row.busPuck),
  }));
}

export function applyInitialClicker(day: ClipboardDay) {
  const last = day.runs[day.runs.length - 1];
  day.clickerA = 0;
  day.clickerB = 0;
  day.pendingNote = "";
  if (!last || day.roster.length === 0) {
    day.nextDispatch = day.nextDispatch || "7:00 AM";
    day.activeRosterId = day.roster[0]?.id ?? null;
    day.pendingLogged = Boolean(day.roster[0]?.siteCode);
    return day;
  }
  day.nextDispatch = addMinutes(last.timeLabel, day.headwayMinutes);
  const index = day.roster.findIndex((row) => row.busPuck === last.busPuck && row.driver === last.driver);
  const next = day.roster[index >= 0 ? (index + 1) % day.roster.length : 0];
  day.activeRosterId = next?.id ?? null;
  day.pendingLogged = Boolean(next?.siteCode);
  return day;
}

export function suggestDayLabel(date: string, index: number) {
  const parsed = parseIsoDate(date);
  if (!parsed) return `Day ${index}`;
  return `Day ${index} - ${WEEKDAYS[parsed.weekday]} ${parsed.month}/${parsed.day}`;
}

export function describeDay(date: string, location: string) {
  const parsed = parseIsoDate(date);
  const when = parsed
    ? `${WEEKDAYS[parsed.weekday]} ${MONTHS[parsed.month - 1]} ${parsed.day}, ${parsed.year}`
    : "";
  const place = location.trim();
  if (when && place) return `${when} (${place})`;
  return when || place;
}

function parseIsoDate(date: string) {
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (utc.getUTCFullYear() !== year || utc.getUTCMonth() !== month - 1 || utc.getUTCDate() !== day) return null;
  return { year, month, day, weekday: utc.getUTCDay() };
}

export function asHeadway(value: number): HeadwayMinutes {
  return value === 20 ? 20 : 15;
}
