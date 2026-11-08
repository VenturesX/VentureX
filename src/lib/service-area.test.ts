import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isServiceAreaLabel, outOfAreaMessage, requiresMarketCity } from "@/lib/service-area";

describe("service area", () => {
  it("accepts the expanded Florida markets and other Florida addresses", () => {
    for (const place of ["Tampa International Airport, Tampa, FL", "Southwest Florida International Airport, Fort Myers, FL", "Miami International Airport, Miami, FL", "Jacksonville International Airport, Jacksonville, FL", "Sarasota, FL"]) {
      assert.equal(isServiceAreaLabel(place), true, place);
      assert.equal(outOfAreaMessage(place), null, place);
    }
    assert.equal(requiresMarketCity("Other Florida city"), true);
    assert.equal(requiresMarketCity("Outside Florida"), true);
    assert.equal(requiresMarketCity("Tampa"), false);
  });
  it("rejects Anaheim and Denver and keeps Port Canaveral", () => {
    assert.ok(outOfAreaMessage("Disneyland, Anaheim, CA"));
    assert.ok(outOfAreaMessage("Denver International Airport, Denver, CO"));
    assert.equal(outOfAreaMessage("Port Canaveral, FL 32920"), null);
    assert.equal(outOfAreaMessage("Loews Portofino Bay Hotel, Orlando, FL"), null);
    assert.equal(isServiceAreaLabel("Port Canaveral, FL 32920"), true);
    assert.equal(isServiceAreaLabel("Anaheim, CA"), false);
  });
});
