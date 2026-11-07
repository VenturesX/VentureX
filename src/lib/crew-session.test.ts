import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ownerCodeMatches } from "@/lib/crew-access";
import { endOfShiftUnix } from "@/lib/crew-session";
import { quoteEmailConfig } from "@/lib/notify";

describe("team lock and quote mail", () => {
  it("expires the session at the end of the Orlando day", () => {
    const now = Date.now();
    const exp = endOfShiftUnix(new Date(now)) * 1000;
    assert.ok(exp > now);
    assert.ok(exp - now <= 24 * 60 * 60 * 1000 + 60_000);
  });

  it("keeps admin locked when the owner env is unset", async () => {
    const previous = process.env.OWNER_ACCESS_CODE;
    delete process.env.OWNER_ACCESS_CODE;
    assert.equal(await ownerCodeMatches("not-a-real-code"), false);
    if (previous === undefined) delete process.env.OWNER_ACCESS_CODE;
    else process.env.OWNER_ACCESS_CODE = previous;
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
