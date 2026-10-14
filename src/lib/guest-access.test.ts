import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, describe, it } from "node:test";
import { db } from "./db";
import {
  createGuestRequest,
  enterGuestCode,
  ensureMovementLink,
  listGuestRequests,
  loadGuestBoard,
  regenerateGuestToken,
  resolveToken,
  revokeGuestAccess,
  saveGuestAccess,
  setGuestRequestStatus,
  staffGuestAccess,
  unlockGuest,
} from "./guest-access";
import {
  GENERIC_CODE_ERROR,
  GENERIC_LINK_ERROR,
  makeGuestCode,
  makeGuestToken,
  normalizeGuestCode,
  pinsMatch,
  signTripCookie,
  tripCookieMatches,
} from "./guest-codes";

const run = randomUUID().slice(0, 8);
const ips: string[] = [];
const eventIds: string[] = [];
let clientId = "";

function ip(label: string) {
  const value = `t${run}${label}`.slice(0, 80);
  ips.push(value);
  return value;
}

describe("guest code helpers", () => {
  it("strips confusable characters and uppercases", () => {
    assert.equal(normalizeGuestCode(" abco1 "), "ABC");
    assert.equal(normalizeGuestCode("0oil"), "");
  });

  it("binds the session cookie to the token, access level, and pin", () => {
    const token = makeGuestToken();
    const other = makeGuestToken();
    const cookie = signTripCookie(token, "TOKEN", null);
    assert.equal(tripCookieMatches(cookie, token, "TOKEN", null), true);
    assert.equal(tripCookieMatches(cookie, other, "TOKEN", null), false);
    assert.equal(tripCookieMatches(cookie, token, "PIN", "2468"), false);
    const pinCookie = signTripCookie(token, "PIN", "2468");
    assert.equal(tripCookieMatches(pinCookie, token, "PIN", "2468"), true);
    assert.equal(tripCookieMatches(pinCookie, token, "PIN", "9999"), false);
    assert.equal(tripCookieMatches(cookie, token, "TOKEN", null, Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30), false);
    assert.equal(pinsMatch("2468", "2468"), true);
    assert.equal(pinsMatch("2468", "2469"), false);
    assert.equal(pinsMatch("2468", "24680"), false);
    assert.equal(pinsMatch("", "2468"), false);
  });
});

describe("per-event guest access", () => {
  after(async () => {
    if (eventIds.length) {
      await db.guestRequest.deleteMany({ where: { eventId: { in: eventIds } } });
      await db.guest.deleteMany({ where: { eventId: { in: eventIds } } });
      await db.movement.deleteMany({ where: { eventId: { in: eventIds } } });
      await db.eventFaq.deleteMany({ where: { eventId: { in: eventIds } } });
      await db.location.deleteMany({ where: { eventId: { in: eventIds } } });
      await db.event.deleteMany({ where: { id: { in: eventIds } } });
    }
    if (clientId) await db.client.deleteMany({ where: { id: clientId } });
    if (ips.length) await db.guestAccessAttempt.deleteMany({ where: { ip: { in: ips } } });
    await db.$disconnect();
  });

  it("hides other events, gates the link, and keeps requests on one event", async () => {
    const client = await db.client.create({ data: { name: `Privacy ${run}` } });
    clientId = client.id;
    const ends = new Date("2099-12-02T22:00:00Z");
    const tokenA = makeGuestToken();
    const tokenB = makeGuestToken();
    const codeA = makeGuestCode();
    const codeB = makeGuestCode();
    const eventA = await db.event.create({
      data: {
        clientId: client.id,
        name: "SECRET-ALPHA",
        code: `PA${run}`,
        startsAt: new Date("2099-12-01T15:00:00Z"),
        endsAt: ends,
        guestToken: tokenA,
        guestCode: codeA,
        guestAccess: "TOKEN",
        guestTokenExpiresAt: new Date("2099-12-05T22:00:00Z"),
      },
    });
    const eventB = await db.event.create({
      data: {
        clientId: client.id,
        name: "SECRET-BRAVO",
        code: `PB${run}`,
        startsAt: new Date("2099-12-03T15:00:00Z"),
        endsAt: ends,
        guestToken: tokenB,
        guestCode: codeB,
        guestAccess: "TOKEN",
        guestTokenExpiresAt: new Date("2099-12-06T22:00:00Z"),
      },
    });
    eventIds.push(eventA.id, eventB.id);

    const alphaCurb = await db.location.create({ data: { eventId: eventA.id, name: "ALPHA-CURB", type: "AIRPORT", lat: 1, lng: 1 } });
    const alphaHotel = await db.location.create({ data: { eventId: eventA.id, name: "ALPHA-HOTEL", type: "HOTEL", lat: 1, lng: 1 } });
    const alphaSide = await db.location.create({ data: { eventId: eventA.id, name: "ALPHA-SIDE", type: "VENUE", lat: 1, lng: 1 } });
    const bravoCurb = await db.location.create({ data: { eventId: eventB.id, name: "BRAVO-CURB", type: "AIRPORT", lat: 2, lng: 2 } });
    const bravoHotel = await db.location.create({ data: { eventId: eventB.id, name: "BRAVO-HOTEL", type: "HOTEL", lat: 2, lng: 2 } });
    const alphaBus = await db.movement.create({
      data: { eventId: eventA.id, name: "ALPHA-BUS", status: "OPEN", scheduledAt: new Date("2099-12-01T18:00:00Z"), originId: alphaCurb.id, destinationId: alphaHotel.id },
    });
    await db.movement.create({
      data: { eventId: eventA.id, name: "ALPHA-OTHER", status: "PLANNED", scheduledAt: new Date("2099-12-01T20:00:00Z"), originId: alphaSide.id, destinationId: alphaHotel.id },
    });
    await db.movement.create({
      data: { eventId: eventB.id, name: "BRAVO-BUS", status: "OPEN", scheduledAt: new Date("2099-12-03T18:00:00Z"), originId: bravoCurb.id, destinationId: bravoHotel.id },
    });
    await db.eventFaq.create({ data: { eventId: eventA.id, category: "PICKUP", question: "ALPHA-FAQ", answer: "alpha-only-answer" } });
    await db.eventFaq.create({ data: { eventId: eventB.id, category: "PICKUP", question: "BRAVO-FAQ", answer: "bravo-only-answer" } });
    await db.guest.create({
      data: { eventId: eventA.id, movementId: alphaBus.id, firstName: "James", lastName: "Whitaker", confirmationCode: "IAAPA-WHT-04" },
    });
    await db.guest.create({
      data: { eventId: eventB.id, firstName: "Nora", lastName: "Secretguest", confirmationCode: "BRAVO-SECRET" },
    });

    const alpha = await loadGuestBoard(tokenA, undefined);
    const alphaText = JSON.stringify(alpha.body);
    assert.equal(alpha.status, 200);
    assert.equal(alphaText.includes("SECRET-BRAVO"), false);
    assert.equal(alphaText.includes("bravo-only-answer"), false);
    assert.equal(alphaText.includes("BRAVO-BUS"), false);
    assert.equal(alphaText.includes("ALPHA-FAQ"), true);
    assert.equal(alphaText.includes("ALPHA-BUS"), true);
    assert.equal(alphaText.includes("ALPHA-OTHER"), true);
    assert.equal(alphaText.includes("Secretguest"), false);
    assert.equal(alphaText.includes("Whitaker"), false);

    const missingToken = await loadGuestBoard("not-a-real-token-value-at-all", undefined);
    assert.equal(missingToken.status, 404);
    assert.equal("error" in missingToken.body ? missingToken.body.error : "", GENERIC_LINK_ERROR);
    assert.equal(JSON.stringify(missingToken.body).includes("SECRET"), false);

    const linked = await ensureMovementLink(eventA.id, alphaBus.id);
    const movementToken = linked?.movements.find((row) => row.id === alphaBus.id)?.token ?? "";
    const movementBoard = await loadGuestBoard(movementToken, undefined);
    const movementText = JSON.stringify(movementBoard.body);
    assert.equal(movementText.includes("ALPHA-BUS"), true);
    assert.equal(movementText.includes("ALPHA-OTHER"), false);
    assert.equal(movementText.includes("BRAVO"), false);

    const staff = await staffGuestAccess(eventA.id);
    assert.equal(JSON.stringify(staff).includes("BRAVO"), false);
    assert.equal(JSON.stringify(staff).includes("SECRET-ALPHA"), true);

    const bad = await enterGuestCode("!!!", ip("bad"));
    const unknown = await enterGuestCode("QQQQQQ", ip("miss"));
    assert.equal(bad.ok, false);
    assert.equal(unknown.ok, false);
    if (!bad.ok && !unknown.ok) assert.equal(bad.error, unknown.error);
    assert.equal(bad.ok ? "" : bad.error, GENERIC_CODE_ERROR);

    const limitIp = ip("limit");
    let last = await enterGuestCode("QQQQQQ", limitIp);
    for (let attempt = 0; attempt < 7; attempt += 1) last = await enterGuestCode("QQQQQQ", limitIp);
    assert.equal(last.ok, false);
    if (!last.ok) assert.equal(last.status, 400);
    const blocked = await enterGuestCode(codeA, limitIp);
    assert.equal(blocked.ok, false);
    if (!blocked.ok) {
      assert.equal(blocked.status, 429);
      assert.equal(blocked.error, GENERIC_CODE_ERROR);
    }

    const opened = await enterGuestCode(codeA, ip("open"));
    assert.equal(opened.ok, true);
    if (opened.ok) assert.equal(opened.token, tokenA);

    await db.event.update({ where: { id: eventB.id }, data: { guestTokenExpiresAt: new Date(Date.now() - 60_000) } });
    assert.equal(await resolveToken(tokenB), null);
    const expired = await enterGuestCode(codeB, ip("exp"));
    assert.equal(expired.ok, false);
    if (!expired.ok) assert.equal(expired.error, GENERIC_CODE_ERROR);

    await saveGuestAccess(eventA.id, { access: "PIN", pin: "2468" });
    const locked = await loadGuestBoard(tokenA, undefined);
    assert.deepEqual(locked.body, { gate: "PIN" });
    assert.equal(JSON.stringify(locked.body).includes("SECRET-ALPHA"), false);
    const wrongPin = await unlockGuest(tokenA, { pin: "9999" }, ip("pin"));
    await saveGuestAccess(eventA.id, { access: "MANIFEST" });
    const lockedManifest = await loadGuestBoard(tokenA, undefined);
    assert.deepEqual(lockedManifest.body, { gate: "MANIFEST" });
    const wrongGuest = await unlockGuest(tokenA, { lastName: "Secretguest", confirmation: "BRAVO-SECRET" }, ip("man"));
    assert.equal(wrongPin.ok, false);
    assert.equal(wrongGuest.ok, false);
    if (!wrongPin.ok && !wrongGuest.ok) assert.equal(wrongPin.error, wrongGuest.error);
    const unlocked = await unlockGuest(tokenA, { lastName: "Whitaker", confirmation: "IAAPA-WHT-04" }, ip("ok"));
    assert.equal(unlocked.ok, true);
    assert.equal(JSON.stringify(unlocked).includes("Secretguest"), false);
    assert.equal(JSON.stringify(unlocked).includes("Whitaker"), false);
    if (unlocked.ok) {
      const cookie = signTripCookie(unlocked.token, unlocked.access, unlocked.pin);
      const openBoard = await loadGuestBoard(tokenA, cookie);
      const openText = JSON.stringify(openBoard.body);
      assert.equal(openText.includes("alpha-only-answer"), true);
      assert.equal(openText.includes("Secretguest"), false);
      assert.equal(openText.includes("bravo-only-answer"), false);
      assert.equal("gate" in openBoard.body && openBoard.body.gate === null, true);
    }

    const session = signTripCookie(tokenA, "MANIFEST", "2468");
    const created = await createGuestRequest({
      token: tokenA,
      category: "PICKUP",
      message: "Where is the alpha curb",
      name: "",
      phone: "",
      deviceKey: randomUUID(),
      ip: ip("req"),
      cookie: session,
    });
    assert.equal(created.status, 200);
    const listB = await listGuestRequests(eventB.id);
    assert.equal(listB.some((row) => row.id === created.body.id), false);
    assert.equal(JSON.stringify(listB).includes("alpha curb"), false);
    const listA = await listGuestRequests(eventA.id);
    assert.equal(listA.some((row) => row.message.includes("alpha curb")), true);
    assert.equal(await setGuestRequestStatus(eventB.id, String(created.body.id), "HANDLED"), false);
    const still = await db.guestRequest.findUnique({ where: { id: String(created.body.id) } });
    assert.equal(still?.status, "OPEN");
    assert.equal(await setGuestRequestStatus(eventA.id, String(created.body.id), "HANDLED"), true);

    const device = randomUUID();
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const row = await createGuestRequest({
        token: tokenA,
        category: "OTHER",
        message: `Alpha note ${attempt} please`,
        name: "",
        phone: "",
        deviceKey: device,
        ip: ip(`d${attempt}`),
        cookie: session,
      });
      assert.equal(row.status, 200);
    }
    const flooded = await createGuestRequest({
      token: tokenA,
      category: "OTHER",
      message: "Alpha note again please",
      name: "",
      phone: "",
      deviceKey: device,
      ip: ip("d3"),
      cookie: session,
    });
    assert.equal(flooded.status, 429);

    await revokeGuestAccess(eventA.id);
    assert.equal(await resolveToken(tokenA), null);
    const revoked = await enterGuestCode(codeA, ip("rev"));
    assert.equal(revoked.ok, false);
    if (!revoked.ok) assert.equal(revoked.error, GENERIC_CODE_ERROR);
    const renewed = await regenerateGuestToken(eventA.id);
    assert.ok(renewed?.token);
    assert.notEqual(renewed?.token, tokenA);
    assert.equal(await resolveToken(tokenA), null);
    assert.ok(await resolveToken(renewed?.token ?? ""));
    assert.equal(renewed?.code, codeA);
  });
});
