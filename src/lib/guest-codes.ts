import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/** No 0/O, 1/I/L, so a code read off a sign is hard to mix up. */
export const GUEST_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const GENERIC_CODE_ERROR = "That code didn't work. Check the code from your planner and try again.";
export const GENERIC_LINK_ERROR = "This link isn't active.";
export const GUEST_LINK_GRACE_MS = 3 * 24 * 60 * 60 * 1000;
export const CODE_ATTEMPT_LIMIT = 8;
export const CODE_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

export function makeGuestToken() {
  return randomBytes(24).toString("base64url");
}

export function makeGuestCode() {
  const bytes = randomBytes(6);
  return [...bytes].map((byte) => GUEST_CODE_ALPHABET[byte % GUEST_CODE_ALPHABET.length]).join("");
}

export function normalizeGuestCode(value: string) {
  return value.toUpperCase().replace(new RegExp(`[^${GUEST_CODE_ALPHABET}]`, "g"), "");
}

export function defaultGuestExpiry(endsAt: Date, lastMovementAt?: Date | null) {
  const base = lastMovementAt && lastMovementAt > endsAt ? lastMovementAt : endsAt;
  return new Date(base.getTime() + GUEST_LINK_GRACE_MS);
}

export function linkIsLive(expiresAt: Date | null | undefined, now = new Date()) {
  if (!expiresAt) return true;
  return expiresAt.getTime() > now.getTime();
}

function secret() {
  return process.env.AUTH_SECRET || "venture-directors-dev";
}

function pinTag(pin: string | null | undefined) {
  return createHmac("sha256", secret()).update(`pin:${pin ?? ""}`).digest("base64url").slice(0, 16);
}

export function signTripCookie(token: string, access: string, pin: string | null | undefined, maxAgeSec = 60 * 60 * 24 * 14) {
  const exp = Math.floor(Date.now() / 1000) + maxAgeSec;
  const tag = access === "PIN" ? pinTag(pin) : "na";
  const body = `${token}.${access}.${tag}.${exp}`;
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function tripCookieMatches(
  cookie: string | undefined,
  token: string,
  access: string,
  pin: string | null | undefined,
  nowSec = Math.floor(Date.now() / 1000),
) {
  if (!cookie) return false;
  const parts = cookie.split(".");
  if (parts.length !== 5) return false;
  const [cookieToken, cookieAccess, cookieTag, expRaw, sig] = parts;
  const exp = Number(expRaw);
  if (!cookieToken || !cookieAccess || !cookieTag || !sig || !Number.isFinite(exp) || exp < nowSec) return false;
  if (cookieToken !== token || cookieAccess !== access) return false;
  const tag = access === "PIN" ? pinTag(pin) : "na";
  if (cookieTag !== tag) return false;
  const expected = createHmac("sha256", secret()).update(`${token}.${access}.${tag}.${expRaw}`).digest("base64url");
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function pinsMatch(stored: string | null | undefined, entered: string) {
  const left = Buffer.from(stored ?? "");
  const right = Buffer.from(entered.trim());
  if (!left.length || left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
