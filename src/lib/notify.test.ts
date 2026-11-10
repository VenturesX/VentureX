import assert from "node:assert/strict";
import { test } from "node:test";
import { notifyOffice } from "@/lib/notify";
import { quoteEmailText, type QuoteDetails } from "@/lib/quote-details";

test("office alerts distinguish provider acceptance, refusal, missing configuration, and network failure", async () => {
  const previousKey = process.env.RESEND_API_KEY;
  const previousTo = process.env.QUOTE_NOTIFY_EMAIL;
  const previousFrom = process.env.QUOTE_FROM_EMAIL;
  const originalFetch = globalThis.fetch;
  try {
    delete process.env.RESEND_API_KEY;
    globalThis.fetch = async () => { throw new Error("No request should be attempted"); };
    assert.equal((await notifyOffice("Test", "Body")).missing, "RESEND_API_KEY");
    process.env.RESEND_API_KEY = "test-key-not-a-real-secret";
    process.env.QUOTE_NOTIFY_EMAIL = "office@example.com";
    process.env.QUOTE_FROM_EMAIL = "Alerts <alerts@example.com>";
    globalThis.fetch = async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      assert.deepEqual(body.to, ["office@example.com"]);
      assert.equal(body.from, "Alerts <alerts@example.com>");
      assert.equal(body.text, "Body");
      return Response.json({ id: "test-message" });
    };
    const accepted = await notifyOffice("Test", "Body");
    assert.equal(accepted.sent, true); assert.match(accepted.detail, /delivery is not confirmed/);
    globalThis.fetch = async () => new Response("forbidden", { status: 403 });
    const refused = await notifyOffice("Test", "Body");
    assert.equal(refused.sent, false); assert.match(refused.detail, /verified sender domain/);
    globalThis.fetch = async () => { throw new Error("Network unavailable"); };
    assert.equal((await notifyOffice("Test", "Body")).sent, false);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of [["RESEND_API_KEY", previousKey], ["QUOTE_NOTIFY_EMAIL", previousTo], ["QUOTE_FROM_EMAIL", previousFrom]]) {
      if (value === undefined) delete process.env[key!]; else process.env[key!] = value;
    }
  }
});

test("full quote alerts preserve routes in order, client notes, times, choices, and attachment name", () => {
  const quote: QuoteDetails = {
    id: "test", reference: "VX-1001", profile: "GROUP", serviceType: "CHARTER",
    contactName: "School organizer", company: "Orlando school", email: "office@example.com", phone: "4075550100",
    market: "Orlando", marketCity: "", pickup: "Airport", dropoff: "School", stops: JSON.stringify(["Hotel", "Competition"]),
    startDate: "2027-02-01", endDate: "2027-02-02", startTime: "09:30", endTime: "17:45",
    passengerCount: 42, vehicleCount: 1, vehiclePreference: "COACH", luggage: "FULL",
    coordinatorNeeded: true, representativeCount: 2, needsExpertCall: true, waitMinutes: null, waitVaries: true,
    driveMinutes: 30, unsureSteps: JSON.stringify(["Timing"]), recommendation: "Confirm return schedule",
    notes: "Band instruments.\nReturn after awards.", manifestFileName: "school.csv", status: "NEW", createdAt: new Date(),
  };
  const text = quoteEmailText(quote);
  for (const value of ["09:30", "17:45", "Motorcoach", "Full size", "42", "Band instruments.\nReturn after awards.", "school.csv", "Varies", "Timing", "Confirm return schedule"]) assert.ok(text.includes(value), value);
  assert.ok(text.indexOf("Pickup: Airport") < text.indexOf("Stop 1: Hotel"));
  assert.ok(text.indexOf("Stop 1: Hotel") < text.indexOf("Stop 2: Competition"));
  assert.ok(text.indexOf("Stop 2: Competition") < text.indexOf("Drop-off: School"));
});
