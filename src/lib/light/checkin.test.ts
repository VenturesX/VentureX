import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decideCheckIn, parseIntro, postLabel } from "@/lib/light/checkin";

const aaron = {
  name: "Aaron",
  postCode: "B2",
  pending: "",
  checkedIn: false,
  programName: "NBCU Family Weekend",
  programCode: "NBCU",
};

describe("staff check-in", () => {
  it("reads a name and program number", () => {
    assert.deepEqual(parseIntro("Aaron 4110"), { name: "Aaron", code: "4110" });
    assert.equal(parseIntro("Miguel 45"), null);
  });

  it("confirms the preloaded position", () => {
    const decision = decideCheckIn("Aaron 4110", aaron);
    assert.match(decision?.reply ?? "", /We have you down as B2 for NBCU/);
    assert.equal(postLabel("B2"), "B2");
  });

  it("alerts the lead when the position changes", () => {
    const pending = { ...aaron, pending: "checkin:confirm" };
    const decision = decideCheckIn("A High", pending);
    assert.equal(decision?.postCode, "A_HIGH");
    assert.match(decision?.headsUp ?? "", /changed to A High/);
  });

  it("asks before signing out", () => {
    const on = { ...aaron, checkedIn: true, pending: "" };
    const ask = decideCheckIn("good night", on, new Date("2026-11-07T01:00:00Z"));
    assert.match(ask?.reply ?? "", /Signing out at/);
    const done = decideCheckIn("YES", { ...on, pending: "signout" }, new Date("2026-11-07T01:00:00Z"));
    assert.equal(done?.checkOut, "now");
  });
});
