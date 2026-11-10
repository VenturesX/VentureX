import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { masterDayMatches, ownerCodeMatches, staffCodeMatches } from "@/lib/crew-access";
import { OWNER_IDLE_SECONDS, endOfShiftUnix, ownerIsIdle, readCrewPayload, readCrewToken, roleAllows, signCrewToken } from "@/lib/crew-session";
import { demoPhones, DEMO_NAME, DEMO_TRIPS } from "@/lib/light/demo-program";
import { programSendsAllowed } from "@/lib/light/outbound";
import { quoteEmailConfig } from "@/lib/notify";

describe("team lock and quote mail", () => {
  it("keeps the staff gate locked unless the staff code is configured", async () => {
    const previous = process.env.STAFF_MASTER_CODE;
    delete process.env.STAFF_MASTER_CODE;
    try { assert.equal(await staffCodeMatches("not-a-real-code"), false); }
    finally { if (previous === undefined) delete process.env.STAFF_MASTER_CODE; else process.env.STAFF_MASTER_CODE = previous; }
  });

  it("uses the hub code and ignores the older owner code while the hub code is set", async () => {
    const hub = process.env.OWNER_HUB_CODE;
    const legacy = process.env.OWNER_ACCESS_CODE;
    process.env.OWNER_HUB_CODE = "hub-sample";
    process.env.OWNER_ACCESS_CODE = "legacy-sample";
    try {
      assert.equal(await ownerCodeMatches("hub-sample"), true);
      assert.equal(await ownerCodeMatches("legacy-sample"), false);
      assert.equal(await ownerCodeMatches("not-a-real-code"), false);
    } finally {
      if (hub === undefined) delete process.env.OWNER_HUB_CODE; else process.env.OWNER_HUB_CODE = hub;
      if (legacy === undefined) delete process.env.OWNER_ACCESS_CODE; else process.env.OWNER_ACCESS_CODE = legacy;
    }
  });

  it("falls back to the older owner code only when the hub code is unset", async () => {
    const hub = process.env.OWNER_HUB_CODE;
    const legacy = process.env.OWNER_ACCESS_CODE;
    delete process.env.OWNER_HUB_CODE;
    process.env.OWNER_ACCESS_CODE = "legacy-sample";
    try { assert.equal(await ownerCodeMatches("legacy-sample"), true); }
    finally {
      if (hub === undefined) delete process.env.OWNER_HUB_CODE; else process.env.OWNER_HUB_CODE = hub;
      if (legacy === undefined) delete process.env.OWNER_ACCESS_CODE; else process.env.OWNER_ACCESS_CODE = legacy;
    }
  });

  it("rejects the master day code unless it is configured", async () => {
    const previous = process.env.MASTER_DAY_CODE;
    delete process.env.MASTER_DAY_CODE;
    try { assert.equal(await masterDayMatches("not-a-real-code"), false); }
    finally { if (previous === undefined) delete process.env.MASTER_DAY_CODE; else process.env.MASTER_DAY_CODE = previous; }
  });

  it("keeps staff, lead, and client out of owner routes", () => {
    for (const kind of ["crew", "lead", "client"] as const) assert.equal(roleAllows(kind, "admin"), false);
    assert.equal(roleAllows("admin", "admin"), true);
    assert.equal(roleAllows("lead", "lead"), true);
    assert.equal(roleAllows("client", "desk"), true);
    assert.equal(roleAllows("client", "staff"), false);
  });

  it("locks an owner session after 15 minutes and leaves a fresh one open", async () => {
    const previous = process.env.AUTH_SECRET;
    process.env.AUTH_SECRET = "test-secret-for-idle-lock";
    try {
      const stale = Math.floor(Date.now() / 1000) - OWNER_IDLE_SECONDS - 5;
      assert.equal(ownerIsIdle(stale), true);
      assert.equal(ownerIsIdle(Math.floor(Date.now() / 1000) - 60), false);
      const expired = await signCrewToken({ kind: "admin", programId: "program-1", personId: "", name: "Owner", touched: stale });
      assert.equal(await readCrewToken(expired), null);
      assert.equal((await readCrewPayload(expired))?.programId, "program-1");
      const fresh = await signCrewToken({ kind: "admin", programId: "program-1", personId: "", name: "Owner" });
      assert.equal((await readCrewToken(fresh))?.kind, "admin");
    } finally {
      if (previous === undefined) delete process.env.AUTH_SECRET; else process.env.AUTH_SECRET = previous;
    }
  });
  it("expires the session at the end of the Orlando day", () => {
    const now = Date.now();
    const exp = endOfShiftUnix(new Date(now)) * 1000;
    assert.ok(exp > now);
    assert.ok(exp - now <= 24 * 60 * 60 * 1000 + 60_000);
  });

  it("keeps admin locked when the owner env is unset", async () => {
    const hub = process.env.OWNER_HUB_CODE;
    const legacy = process.env.OWNER_ACCESS_CODE;
    delete process.env.OWNER_HUB_CODE;
    delete process.env.OWNER_ACCESS_CODE;
    try { assert.equal(await ownerCodeMatches("not-a-real-code"), false); }
    finally {
      if (hub === undefined) delete process.env.OWNER_HUB_CODE; else process.env.OWNER_HUB_CODE = hub;
      if (legacy === undefined) delete process.env.OWNER_ACCESS_CODE; else process.env.OWNER_ACCESS_CODE = legacy;
    }
  });

  it("blocks texts and email for a demo program", () => {
    assert.equal(programSendsAllowed({ demo: true, textingMode: "on" }), false);
    assert.equal(programSendsAllowed({ demo: false, textingMode: "off" }), false);
    assert.equal(programSendsAllowed({ demo: false, textingMode: "on" }), true);
    assert.equal(DEMO_NAME.startsWith("DEMO"), true);
    assert.deepEqual([...new Set(DEMO_TRIPS.map((trip) => trip.airSide))].sort(), ["B1", "B2", "C"]);
    assert.ok(DEMO_TRIPS.some((trip) => trip.vehicleLabel === "SUV"));
    assert.ok(DEMO_TRIPS.some((trip) => trip.vehicleLabel === "Sprinter"));
    assert.ok(DEMO_TRIPS.some((trip) => trip.vehicleLabel === "Standby SUV"));
    assert.ok(DEMO_TRIPS.some((trip) => /VIP/.test(trip.notes)));
    assert.ok(DEMO_TRIPS.some((trip) => trip.carSeats > 0));
    for (const phone of demoPhones()) assert.match(phone, /^\+1407555\d{4}$/);
  });

  it("names the email key that turns notifications on", () => {
    const previous = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;
    const config = quoteEmailConfig();
    assert.equal(config.enabled, false);
    assert.equal(config.to, "venturedirectors@gmail.com");
    if (previous === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previous;
  });
});
