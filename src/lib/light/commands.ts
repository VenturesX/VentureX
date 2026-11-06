import { normalizeFlight, postLabelToCode } from "@/lib/light/posts";

export type Command =
  | { kind: "code"; code: string }
  | { kind: "name"; name: string }
  | { kind: "role"; role: string; post: string }
  | { kind: "choice"; n: number }
  | { kind: "ok" }
  | { kind: "break" }
  | { kind: "edit"; pax?: number }
  | { kind: "sent"; pax?: number; flight?: string; driver?: string }
  | { kind: "headsup"; body: string }
  | { kind: "assign"; driver: string; pax: number }
  | { kind: "unknown"; text: string };

const ROLES = ["greeter", "dispatcher", "loader", "driver", "lead"] as const;

export function parseCommand(raw: string): Command {
  const text = raw.trim().replace(/\s+/g, " ");
  if (!text) return { kind: "unknown", text: "" };
  if (/^(ok|okay|k)$/i.test(text)) return { kind: "ok" };
  if (/^on break$/i.test(text)) return { kind: "break" };
  const edit = text.match(/^edit(?:\s+(\d{1,3}))?$/i);
  if (edit) return { kind: "edit", pax: edit[1] ? Number(edit[1]) : undefined };
  if (/^\d{1,2}$/.test(text)) return { kind: "choice", n: Number(text) };

  const sent = text.match(/^sent(?:\s+(\d{1,3}))?(?:\s+([A-Za-z]{1,3})\s*(\d{1,5}))?(?:\s+(.+))?$/i);
  if (/^sent\b/i.test(text) && sent) {
    const flight = sent[2] && sent[3] ? normalizeFlight(`${sent[2]}${sent[3]}`) : undefined;
    return {
      kind: "sent",
      pax: sent[1] ? Number(sent[1]) : undefined,
      flight,
      driver: sent[4]?.trim() || undefined,
    };
  }

  if (/\bon the way\b/i.test(text) || /\bhold bus\b/i.test(text) || /\bheads?\s*up\b/i.test(text)) {
    return { kind: "headsup", body: text };
  }

  const role = text.match(/^(greeter|dispatcher|loader|driver|lead)(?:\s+(.+))?$/i);
  if (role) {
    return { kind: "role", role: role[1].toLowerCase(), post: postLabelToCode(role[2] ?? "") };
  }

  const assign = text.match(/^([A-Za-z][A-Za-z .'-]{0,40}?)\s+(\d{1,3})$/);
  if (assign && !ROLES.includes(assign[1].toLowerCase() as (typeof ROLES)[number])) {
    return { kind: "assign", driver: titleName(assign[1]), pax: Number(assign[2]) };
  }

  if (/^[A-Za-z0-9]{2,8}$/.test(text)) return { kind: "code", code: text.toUpperCase() };
  if (/^[A-Za-z][A-Za-z .'-]{1,40}$/.test(text)) return { kind: "name", name: titleName(text) };
  return { kind: "unknown", text };
}

export function titleName(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function roleFromChoice(n: number): string {
  return ["greeter", "dispatcher", "loader", "driver", "lead"][n - 1] ?? "";
}

export function postFromChoice(n: number): string {
  return ["A", "B_HIGH", "B_LOW", "C"][n - 1] ?? "";
}
