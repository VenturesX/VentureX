import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isServiceAreaLabel, outOfAreaMessage } from "@/lib/service-area";

describe("service area", () => {
  it("rejects Anaheim and Denver and keeps Port Canaveral", () => {
    assert.ok(outOfAreaMessage("Disneyland, Anaheim, CA"));
    assert.ok(outOfAreaMessage("Denver International Airport, Denver, CO"));
    assert.equal(outOfAreaMessage("Port Canaveral, FL 32920"), null);
    assert.equal(outOfAreaMessage("Loews Portofino Bay Hotel, Orlando, FL"), null);
    assert.equal(isServiceAreaLabel("Port Canaveral, FL 32920"), true);
    assert.equal(isServiceAreaLabel("Anaheim, CA"), false);
  });
});
