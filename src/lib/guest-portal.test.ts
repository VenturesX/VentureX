import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { itemVisible } from "@/lib/guest-session";
import { parseQuoteFields } from "@/lib/quotes";

describe("guest visibility", () => {
  it("hides a group move from a program-only session", () => {
    const session = { paxId: "", groupIds: ["everyone"] };
    assert.equal(itemVisible({ paxId: "", everyone: true, groupIds: ["everyone"] }, session), true);
    assert.equal(itemVisible({ paxId: "", everyone: false, groupIds: ["vip"] }, session), false);
    assert.equal(itemVisible({ paxId: "pax-1", everyone: false, groupIds: [] }, session), false);
  });

  it("shows a personal ride and that guest's group", () => {
    const session = { paxId: "pax-1", groupIds: ["everyone", "vip"] };
    assert.equal(itemVisible({ paxId: "pax-1", everyone: false, groupIds: [] }, session), true);
    assert.equal(itemVisible({ paxId: "pax-2", everyone: false, groupIds: [] }, session), false);
    assert.equal(itemVisible({ paxId: "", everyone: false, groupIds: ["vip"] }, session), true);
  });

  it("accepts a shuttle wait that varies", () => {
    const form = new FormData();
    form.set("serviceType", "SHUTTLE_LOOP");
    form.set("waitVaries", "yes");
    const parsed = parseQuoteFields(form);
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.data.waitVaries, true);
      assert.equal(parsed.data.waitMinutes, undefined);
    }
  });
});
