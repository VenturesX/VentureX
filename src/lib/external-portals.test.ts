import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { externalPortalHref } from "@/lib/external-portals";
import { tripRedirectHref } from "@/lib/trip-redirect";

const ROOT = join(import.meta.dirname, "../..");
const PORTAL = "https://horizon.venturedirectors.com";

function sourceFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) found.push(...sourceFiles(path));
    else found.push(path);
  }
  return found;
}

describe("external guest portals", () => {
  it("sends 1219 to the horizon portal and leaves every other code alone", () => {
    assert.equal(externalPortalHref("1219"), PORTAL);
    assert.equal(externalPortalHref(" 1219 "), PORTAL);
    assert.equal(externalPortalHref("12190"), null);
    assert.equal(externalPortalHref("01219"), null);
    assert.equal(externalPortalHref("NBCU"), null);
    assert.equal(externalPortalHref("6011"), null);
    assert.equal(externalPortalHref("4110"), null);
    assert.equal(externalPortalHref(""), null);
  });

  it("follows the owner hub and https portals, and ignores other hrefs", () => {
    assert.equal(tripRedirectHref("/team"), "/team");
    assert.equal(tripRedirectHref(PORTAL), PORTAL);
    assert.equal(tripRedirectHref("http://horizon.venturedirectors.com"), null);
    assert.equal(tripRedirectHref("/trip"), null);
    assert.equal(tripRedirectHref("javascript:alert(1)"), null);
    assert.equal(tripRedirectHref(undefined), null);
  });

  it("keeps the portal address out of the site and the client page", () => {
    const allowed = new Set([
      "src/lib/external-portals.ts",
      "src/lib/external-portals.test.ts",
    ]);
    const hits = sourceFiles(join(ROOT, "src"))
      .map((path) => path.slice(ROOT.length + 1))
      .filter((path) => !allowed.has(path) && readFileSync(join(ROOT, path), "utf8").includes("horizon.venturedirectors.com"));
    assert.deepEqual(hits, []);
    const guest = readFileSync(join(ROOT, "src/components/marketing/guest-trip.tsx"), "utf8");
    assert.equal(guest.includes("1219"), false);
    const seed = readFileSync(join(ROOT, "src/lib/light/seed.ts"), "utf8");
    assert.equal(/\b1219\b/.test(seed), false);
  });
});
