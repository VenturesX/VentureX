import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decideSms, type TripSnap } from "@/lib/light/decide";
import { hotelMessage } from "@/lib/light/hotel";
import { groupManifestRows, parseManifestText } from "@/lib/light/parse-manifest";
import { nbcuFlightCount, nbcuPaxCount } from "@/lib/light/seed-data";
import { isAfterWindow } from "@/lib/light/time";
import { QUOTE_MARKETS } from "@/lib/service-area";

const trips: TripSnap[] = [
  { id: "a", flightCode: "DL1580", origin: "BOS", scheduledTime: "10:28", postCode: "B_HIGH", vehicleLabel: "SUV", vendor: "Miguel", driverName: "", status: "SENT", pax: 5, names: ["George Apjohn"] },
  { id: "b", flightCode: "DL2564", origin: "LGA", scheduledTime: "14:47", postCode: "B_HIGH", vehicleLabel: "SUV", vendor: "Miguel", driverName: "", status: "EXPECTED", pax: 4, names: ["Alexa Levitt Brown"] },
  { id: "c", flightCode: "AA977", origin: "ORD", scheduledTime: "19:56", postCode: "B_LOW", vehicleLabel: "SUV", vendor: "Miguel", driverName: "", status: "EXPECTED", pax: 5, names: ["Luke Johnson"] },
];

const base = {
  phone: "+14075550111",
  programName: "NBCU Family Weekend",
  hotelShort: "Portofino",
  greetOffsetMin: 30,
  link: "https://venturex.test/light/NBCU?t=token",
  trips,
};

describe("NBCU manifest", () => {
  it("keeps the sheet at 19 flights and 120 passengers", () => {
    assert.equal(nbcuFlightCount(), 19);
    assert.equal(nbcuPaxCount(), 120);
  });

  it("groups a pasted sheet by flight, vehicle, and vendor", () => {
    const rows = parseManifestText("Flight,Time,Last Name,First Name,Origin,Air Side,Vehicle,Vendor\nDL1511,11:05 AM,Fox,Arabella,LGA,B1,Sprinter,Bravo\nDL1511,11:05 AM,Mann,Nichola,LGA,B1,Sprinter,Bravo\nDL1511,11:05 AM,Cuevas,Perla,LGA,B1,Sprinter,Bravo");
    const grouped = groupManifestRows(rows, [{ airline: "DL", postCode: "B_LOW" }]);
    assert.equal(grouped.length, 1);
    assert.equal(grouped[0].passengers.length, 3);
    assert.equal(grouped[0].postCode, "B_HIGH");
  });
});

describe("text commands", () => {
  it("confirms Miguel 45 for the open trip on that post", () => {
    const decision = decideSms({
      ...base,
      text: "Miguel 45",
      roster: { name: "Marissa", role: "greeter", postCode: "B_HIGH", pending: "", lastTripId: "" },
    });
    assert.match(decision.reply, /Confirmed: SUV, Miguel, 45 pax, DL 2564 to Portofino/);
    assert.match(decision.reply, /Reply EDIT to fix/);
    assert.equal(decision.tripUpdates?.[0].reportedPax, 45);
    assert.equal(decision.reply.split("Confirmed").length, 2);
  });

  it("asks a numbered choice when two trips match", () => {
    const decision = decideSms({
      ...base,
      text: "Miguel 45",
      roster: { name: "Aaron", role: "lead", postCode: "ALL", pending: "", lastTripId: "" },
    });
    assert.match(decision.reply, /Which trip/);
    assert.match(decision.reply, /1 DL 2564/);
  });

  it("applies EDIT to the last trip", () => {
    const decision = decideSms({
      ...base,
      text: "EDIT 46",
      roster: { name: "Marissa", role: "greeter", postCode: "B_HIGH", pending: "", lastTripId: "b" },
    });
    assert.match(decision.reply, /46 pax/);
    assert.equal(decision.tripUpdates?.[0].reportedPax, 46);
    assert.equal(decision.editAlert, true);
  });

  it("parses a heads-up without a second question", () => {
    const decision = decideSms({
      ...base,
      text: "6 on the way hold bus 2 min",
      roster: { name: "Marissa", role: "greeter", postCode: "B_HIGH", pending: "", lastTripId: "" },
    });
    assert.equal(decision.headsUp, "6 on the way hold bus 2 min");
    assert.match(decision.reply, /Dispatcher has it/);
  });
});

describe("ops rules", () => {
  it("flags a gate time after the shuttle close", () => {
    assert.equal(isAfterWindow("20:30", "20:00"), true);
    assert.equal(isAfterWindow("19:31", "20:00"), false);
  });

  it("builds the Portofino en route text", () => {
    const message = hotelMessage({
      hotelLabel: "PORTOFINO BAY",
      driverName: "Ben",
      vendor: "BKA",
      vehicleLabel: "SUV",
      vehicleNumber: "",
      flightCode: "UA2845",
      etaLabel: "5:00-5:10 PM",
      names: ["Jen-Jen Heyl", "Jason Heyl"],
    });
    assert.match(message, /PORTOFINO BAY — EN ROUTE/);
    assert.match(message, /Driver: Ben/);
    assert.match(message, /1\. Jen-Jen Heyl/);
    assert.doesNotMatch(message, /✓/);
  });

  it("limits quote markets to Central Florida", () => {
    assert.deepEqual([...QUOTE_MARKETS], ["Orlando", "Greater Orlando", "Central Florida", "Port Canaveral", "Other city, tell us where"]);
    assert.equal(QUOTE_MARKETS.some((market) => /anaheim|denver|colorado/i.test(market)), false);
  });
});
