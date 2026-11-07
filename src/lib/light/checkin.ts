import { titleName } from "@/lib/light/commands";

export const POSITIONS: { code: string; label: string; words: string[] }[] = [
  { code: "A_HIGH", label: "A High", words: ["a high", "a1"] },
  { code: "A_LOW", label: "A Low", words: ["a low", "a2"] },
  { code: "B_HIGH", label: "B High", words: ["b high"] },
  { code: "B1", label: "B1", words: ["b1"] },
  { code: "B_LOW", label: "B Low", words: ["b low"] },
  { code: "B2", label: "B2", words: ["b2"] },
  { code: "C", label: "C", words: ["c"] },
  { code: "DISPATCH", label: "Dispatcher", words: ["dispatcher", "dispatch"] },
  { code: "LOADER", label: "Loader", words: ["loader"] },
  { code: "SHUTTLE", label: "Shuttle/Loop", words: ["shuttle", "loop", "shuttle/loop"] },
];

const WIDE = new Set(["DISPATCH", "LOADER", "SHUTTLE", "ALL"]);

export function postLabel(code: string) {
  return POSITIONS.find((item) => item.code === code)?.label || code || "your post";
}

export function samePost(left: string, right: string) {
  const fold = (code: string) => {
    if (code === "B1" || code === "B_HIGH") return "B_HIGH";
    if (code === "B2" || code === "B_LOW") return "B_LOW";
    return code;
  };
  return fold(left) === fold(right);
}

export function matchPosition(text: string) {
  const value = text.trim().toLowerCase().replace(/[./]/g, " ").replace(/\s+/g, " ");
  return POSITIONS.find((item) => item.words.includes(value) || item.label.toLowerCase() === value) ?? null;
}

export function seesAll(code: string) {
  return WIDE.has(code);
}

export function parseIntro(text: string): { name: string; code: string } | null {
  const match = text.trim().match(/^([A-Za-z][A-Za-z .'-]{0,40}?)\s+([A-Za-z0-9]{2,8})$/);
  if (!match) return null;
  if (/^\d{1,3}$/.test(match[2])) return null;
  return { name: titleName(match[1]), code: match[2].toUpperCase() };
}

export function isGreeting(text: string) {
  return /^(hi|hello|hey|yo|good morning|good afternoon)\b/i.test(text.trim());
}

export function isSignOut(text: string) {
  return /\b(sign(?:ing)? out|good\s*night|goodbye|good\s*bye|see you|see ya|peace|heading out|clock(?:ing)? out|i'?m out|done for the day)\b/i.test(text.trim());
}

export function isYes(text: string) {
  return /^(yes|y|yep|yeah)$/i.test(text.trim());
}

export function parseClock(text: string): string | null {
  const match = text.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = match[2] ? Number(match[2]) : 0;
  const suffix = match[3]?.toLowerCase();
  if (suffix === "pm" && hours < 12) hours += 12;
  if (suffix === "am" && hours === 12) hours = 0;
  if (!suffix && hours <= 7) hours += 12;
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function clockLabelET(date = new Date()) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" }).format(date);
}

export function todayET(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function dateAtEtClock(hhmm: string, now = new Date()) {
  const [hh, mm] = hhmm.split(":").map(Number);
  const day = todayET(now).split("-").map(Number);
  const target = Date.UTC(day[0], day[1] - 1, day[2], hh, mm);
  let stamp = Date.UTC(day[0], day[1] - 1, day[2], hh + 5, mm);
  const format = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  for (let pass = 0; pass < 3; pass += 1) {
    const parts = format.formatToParts(new Date(stamp));
    const read = (type: string) => Number(parts.find((part) => part.type === type)?.value);
    const seen = Date.UTC(read("year"), read("month") - 1, read("day"), read("hour") % 24, read("minute"));
    stamp += target - seen;
  }
  return new Date(stamp);
}

export type CheckState = {
  name: string;
  postCode: string;
  pending: string;
  checkedIn: boolean;
  programName: string;
  programCode: string;
};

export type CheckDecision = {
  reply: string;
  pending: string;
  name?: string;
  postCode?: string;
  checkIn?: boolean;
  checkOut?: "now" | string;
  headsUp?: string;
};

export function decideCheckIn(text: string, state: CheckState | null, now = new Date()): CheckDecision | null {
  const clock = clockLabelET(now);
  if (!state) {
    if (isGreeting(text) || parseIntro(text)) {
      return { reply: "What is your name and program number? Example: Aaron 4110", pending: "" };
    }
    return null;
  }

  if (state.pending === "signout") {
    if (isYes(text)) return { reply: `Signed out at ${clock}. Have a good night.`, pending: "", checkOut: "now" };
    const custom = parseClock(text);
    if (custom) {
      const label = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(dateAtEtClock(custom, now));
      return { reply: `Signed out at ${label}. Have a good night.`, pending: "", checkOut: custom };
    }
    return { reply: `Signing out at ${clock}? Reply YES or send the right time.`, pending: "signout" };
  }

  if (state.checkedIn && isSignOut(text)) {
    return { reply: `Signing out at ${clock}? Reply YES or send the right time.`, pending: "signout" };
  }

  if (state.checkedIn && !state.pending.startsWith("checkin")) return null;

  if (!state.checkedIn && isGreeting(text) && !state.pending.startsWith("checkin")) {
    return { reply: "What is your name and program number? Example: Aaron 4110", pending: "" };
  }

  if (state.pending === "checkin:confirm" || state.pending === "checkin:position") {
    if (isYes(text)) {
      return {
        reply: `You're checked in as ${postLabel(state.postCode)} for ${state.programCode}.`,
        pending: "",
        checkIn: true,
      };
    }
    const position = matchPosition(text);
    if (position && position.code !== state.postCode) {
      return {
        reply: `You're on ${postLabel(position.code)}. Reply YES to check in.`,
        pending: "checkin:confirm",
        postCode: position.code,
        headsUp: `${state.name} changed to ${postLabel(position.code)}`,
      };
    }
    if (position) return { reply: `You're on ${postLabel(position.code)}. Reply YES to check in.`, pending: "checkin:confirm", postCode: position.code };
    return { reply: `We have you down as ${postLabel(state.postCode)} for ${state.programCode}. Reply YES or tell us your position.`, pending: "checkin:confirm" };
  }

  const intro = parseIntro(text);
  if (intro || isGreeting(text)) {
    return {
      reply: `We have you down as ${postLabel(state.postCode)} for ${state.programCode}. Reply YES or tell us your position.`,
      pending: "checkin:confirm",
      name: intro?.name || state.name,
    };
  }

  return {
    reply: "Check in first. Text your name and program number. Example: Aaron 4110",
    pending: state.pending,
  };
}
