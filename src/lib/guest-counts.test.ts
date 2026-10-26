import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_FLEET,
  DEFAULT_QUICK_ANSWERS,
  DEFAULT_TIMING,
  GUEST_RANGES,
  answerQuickQuestion,
  guestRangeFor,
  parseQuickAnswers,
  recommendQuote,
} from "./guidance";

const base = {
  pickup: "MCO",
  dropoff: "International Drive",
  stops: [] as string[],
  waitMinutes: 20,
  vehiclePreference: "",
  email: "",
  phone: "",
  startDate: "",
  unsureSteps: [] as string[],
};

describe("large guest counts", () => {
  it("sizes each range to its top and keeps 500 in the 250-500 band", () => {
    assert.deepEqual(GUEST_RANGES.map((range) => range.size), [49, 100, 250, 500, 1000, 1500]);
    assert.equal(guestRangeFor(500)?.label, "250-500");
    assert.equal(guestRangeFor(5000)?.label, "1,000+");
    assert.equal(guestRangeFor(49)?.label, "Under 50");
  });

  it("sizes a 500-guest loop from seats, not just the wait", () => {
    const plan = recommendQuote(
      { ...base, serviceType: "SHUTTLE_LOOP", passengerCount: 500 },
      DEFAULT_FLEET,
      DEFAULT_TIMING,
      [
        { drive: 25, source: "table" },
        { drive: 25, source: "table" },
      ],
    );
    assert.equal(plan.vehicleCount, 10);
    assert.equal(plan.repCount, 4);
    assert.match(plan.headline, /10 motorcoaches for 500 guests/);
    assert.match(plan.math ?? "", /25 min drive \+ 4 buffer \+ 10 load\/unload each way/);
    assert.match(plan.detail, /500 guests need room on 10/);
  });

  it("sizes 5,000 guests on a motorcoach and on an SUV", () => {
    const coach = recommendQuote(
      { ...base, serviceType: "AIRPORT_TRANSFER", passengerCount: 5000, vehiclePreference: "COACH" },
      DEFAULT_FLEET,
      DEFAULT_TIMING,
      null,
    );
    assert.equal(coach.vehicleCount, 100);
    assert.equal(coach.repCount, 34);
    assert.match(coach.headline, /100 motorcoaches for 5,000 guests/);

    const suv = recommendQuote(
      { ...base, serviceType: "POINT_TO_POINT", passengerCount: 5000, vehiclePreference: "SUV" },
      DEFAULT_FLEET,
      DEFAULT_TIMING,
      null,
    );
    assert.equal(suv.vehicleCount, 1000);
    assert.equal(suv.repCount, 334);
  });

  it("answers how many buses for 500 and 5,000 guests", () => {
    const fiveHundred = answerQuickQuestion("How many buses for 500 guests?", DEFAULT_QUICK_ANSWERS, 50);
    assert.match(fiveHundred?.text ?? "", /10 motorcoaches/);
    const fiveThousand = answerQuickQuestion("How many buses for 5,000 guests?", DEFAULT_QUICK_ANSWERS, 50);
    assert.match(fiveThousand?.text ?? "", /100 motorcoaches/);
    assert.match(fiveThousand?.text ?? "", /5,000 guests/);
    const stored = parseQuickAnswers(JSON.stringify([{ ...DEFAULT_QUICK_ANSWERS[0], chip: "How many buses for 200 guests?" }]));
    assert.equal(stored[0]?.chip, "How many buses for 500 guests?");
  });
});
