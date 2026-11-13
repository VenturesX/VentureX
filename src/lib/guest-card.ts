export type CardMove = {
  kind: string;
  timeLabel: string;
  sortKey: string;
  spot: string;
  title: string;
  frequency: string;
  guestVisible?: boolean;
};

export type CardClock = { minutes: number; source: string };

export type GuestCard = {
  phase: "next" | "before" | "between" | "ended" | "none";
  line: string;
  note: string;
  pickup: string;
};

const VAGUE = /all day|varies|tbd|tba|ongoing/i;

export function parseClockLabel(label: string): number | null {
  const text = label.trim();
  if (!text || VAGUE.test(text)) return null;
  const ampm = text.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (ampm) {
    let hour = Number(ampm[1]);
    const minute = Number(ampm[2]);
    const suffix = ampm[3].toLowerCase();
    if (hour > 12 || minute > 59) return null;
    if (suffix === "pm" && hour < 12) hour += 12;
    if (suffix === "am" && hour === 12) hour = 0;
    return hour * 60 + minute;
  }
  const plain = text.match(/^(\d{1,2}):(\d{2})$/);
  if (!plain) return null;
  const hour = Number(plain[1]);
  const minute = Number(plain[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

function cadence(frequency: string): number | null {
  const match = frequency.match(/every\s+(\d{1,3})\s*(?:min|minute)/i);
  if (!match) return null;
  const minutes = Number(match[1]);
  return minutes >= 5 && minutes <= 180 ? minutes : null;
}

function clockOf(item: CardMove): number | null {
  return parseClockLabel(item.timeLabel) ?? (item.timeLabel.trim() ? null : parseClockLabel(item.sortKey));
}

function formatClock(minutes: number) {
  const hour24 = Math.floor(minutes / 60) % 24;
  const minute = minutes % 60;
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour = hour24 % 12 || 12;
  return `${hour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function formatWhen(day: string, minutes: number) {
  const [year, month, date] = day.split("-").map(Number);
  if (!year || !month || !date) return `${formatClock(minutes)} ET`;
  const stamp = new Date(Date.UTC(year, month - 1, date, 16, 0, 0));
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", month: "short", day: "numeric" }).format(stamp);
  return `${weekday} at ${formatClock(minutes)} ET`;
}

function zonedParts(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return { day: `${get("year")}-${get("month")}-${get("day")}`, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

export function buildGuestCard(input: {
  now: Date;
  timeZone: string;
  serviceDate: string;
  windowClose: string;
  moves: CardMove[];
  contact: string;
}): GuestCard {
  const zone = input.timeZone || "America/New_York";
  const here = zonedParts(input.now, zone);
  const visible = input.moves.filter((item) => item.guestVisible !== false && !item.kind.match(/personal/i));
  const pickup = visible.find((item) => item.spot.trim())?.spot.trim() || "";
  const closeMinutes = /^\d{1,2}:\d{2}$/.test(input.windowClose.trim()) ? parseClockLabel(input.windowClose.trim()) : null;
  const dated = /^\d{4}-\d{2}-\d{2}$/.test(input.serviceDate.trim()) ? input.serviceDate.trim() : "";
  const starts = visible
    .map((item) => ({ item, at: clockOf(item) }))
    .filter((row): row is { item: CardMove; at: number } => row.at != null)
    .sort((a, b) => a.at - b.at);
  if (!starts.length) {
    return { phase: "none", line: pickup ? `Pickup: ${pickup}` : "Pickup details are with the team at your arrival area.", note: "", pickup };
  }
  const day = dated || here.day;
  const first = starts[0];
  const step = starts.map((row) => cadence(row.item.frequency)).find((value) => value != null) ?? null;
  const end = closeMinutes ?? 20 * 60;
  const departures: number[] = [];
  if (step && first.item.kind === "SHUTTLE") {
    for (let at = first.at; at <= end; at += step) departures.push(at);
  } else {
    for (const row of starts) departures.push(row.at);
  }
  const unique = [...new Set(departures)].sort((a, b) => a - b);
  const location = first.item.spot.trim() || pickup;
  if (dated && day < here.day) {
    return { phase: "ended", line: `Shuttle service for this trip has ended. Need help? Contact ${input.contact}.`, note: "", pickup: location };
  }
  if (dated && day > here.day) {
    return { phase: "before", line: `Your shuttle service starts ${formatWhen(day, first.at)}. Pickup: ${location || "the signed stop"}.`, note: "", pickup: location };
  }
  const nowMinutes = day === here.day ? here.minutes : 0;
  if (nowMinutes < first.at) {
    return { phase: "before", line: `Your shuttle service starts ${formatWhen(day, first.at)}. Pickup: ${location || "the signed stop"}.`, note: "", pickup: location };
  }
  if (closeMinutes != null && nowMinutes > closeMinutes && nowMinutes > unique[unique.length - 1]) {
    return { phase: "ended", line: `Shuttle service for this trip has ended. Need help? Contact ${input.contact}.`, note: "", pickup: location };
  }
  const upcoming = unique.filter((at) => at >= nowMinutes);
  if (!upcoming.length) {
    return { phase: "ended", line: `Shuttle service for this trip has ended. Need help? Contact ${input.contact}.`, note: "", pickup: location };
  }
  const next = upcoming[0];
  const previous = unique.filter((at) => at < nowMinutes).at(-1);
  if (previous != null && next - previous > 90 && nowMinutes - previous > 15) {
    return { phase: "between", line: `Service resumes ${formatWhen(day, next)} from ${location || "the signed stop"}.`, note: "", pickup: location };
  }
  return {
    phase: "next",
    line: `Next departure from ${location || "the start"} at ${formatClock(next)} ET`,
    note: "Times may vary. Boarding depends on available space.",
    pickup: location,
  };
}

export function shareGuestLine(program: string, card: GuestCard, help: string) {
  if (card.phase === "next") return `${program}: ${card.line}. Pickup: ${card.pickup || "the signed stop"}. Times may vary; boarding depends on space. Help: ${help}.`;
  if (card.phase === "none") return `${program}: Pickup: ${card.pickup || "ask the team at your arrival area"}. Help: ${help}.`;
  return `${program}: ${card.line} Help: ${help}.`;
}
