export function toMinutes(value: string): number | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 27 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function fromMinutes(total: number): string {
  const minutes = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function clockLabel(value: string): string {
  const minutes = toMinutes(value);
  if (minutes == null) return "";
  const normalized = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(mins).padStart(2, "0")} ${suffix}`;
}

export function isAfterWindow(arrival: string, windowClose: string): boolean {
  const left = toMinutes(arrival);
  const right = toMinutes(windowClose);
  if (left == null || right == null) return false;
  return left > right;
}

export function addMinutes(value: string, minutes: number): string {
  const base = toMinutes(value);
  if (base == null) return "";
  return fromMinutes(base + minutes);
}

export function clampOffset(value: number, min = 25, max = 40) {
  if (!Number.isFinite(value)) return 30;
  return Math.min(max, Math.max(min, Math.round(value)));
}
