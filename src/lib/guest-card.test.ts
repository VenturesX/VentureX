import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildGuestCard, parseClockLabel } from "@/lib/guest-card";

const zone = "America/New_York";

describe("guest card", () => {
  it("does not treat a vague label as a departure time", () => {
    assert.equal(parseClockLabel("All day"), null);
    assert.equal(parseClockLabel("7:00 PM"), 19 * 60);
  });

  it("shows the next departure inside the window and skips one that left", () => {
    const card = buildGuestCard({
      now: new Date("2026-11-13T15:10:00.000Z"),
      timeZone: zone,
      serviceDate: "2026-11-13",
      windowClose: "20:00",
      contact: "(407) 655-9795",
      moves: [{ kind: "SHUTTLE", timeLabel: "7:00 AM", sortKey: "07:00", spot: "Hotel drive", title: "Loop", frequency: "Every 20 minutes", guestVisible: true }],
    });
    assert.equal(card.phase, "next");
    assert.match(card.line, /Next departure from Hotel drive at /);
    assert.match(card.note, /Times may vary/);
    assert.doesNotMatch(card.line, /7:00 AM/);
  });

  it("says the service has not started yet", () => {
    const card = buildGuestCard({
      now: new Date("2026-11-13T10:00:00.000Z"),
      timeZone: zone,
      serviceDate: "2026-11-13",
      windowClose: "20:00",
      contact: "(407) 655-9795",
      moves: [{ kind: "SHUTTLE", timeLabel: "7:00 AM", sortKey: "07:00", spot: "Hotel drive", title: "Loop", frequency: "", guestVisible: true }],
    });
    assert.equal(card.phase, "before");
    assert.match(card.line, /starts Fri, Nov 13 at 7:00 AM ET/);
  });

  it("falls back when the schedule has no clock", () => {
    const card = buildGuestCard({
      now: new Date("2026-11-13T15:00:00.000Z"),
      timeZone: zone,
      serviceDate: "",
      windowClose: "20:00",
      contact: "(407) 655-9795",
      moves: [{ kind: "SHUTTLE", timeLabel: "All day", sortKey: "00:10", spot: "Signed stop", title: "Loop", frequency: "Every 20 minutes", guestVisible: true }],
    });
    assert.equal(card.phase, "none");
    assert.match(card.line, /Pickup: Signed stop/);
    assert.doesNotMatch(card.line, /departure|AM|PM/);
  });

  it("hides a move that is not for guests", () => {
    const card = buildGuestCard({
      now: new Date("2026-11-13T15:00:00.000Z"),
      timeZone: zone,
      serviceDate: "2026-11-13",
      windowClose: "20:00",
      contact: "(407) 655-9795",
      moves: [{ kind: "SHUTTLE", timeLabel: "7:00 AM", sortKey: "07:00", spot: "Private dock", title: "VIP", frequency: "", guestVisible: false }],
    });
    assert.equal(card.phase, "none");
    assert.equal(card.pickup, "");
  });
});
