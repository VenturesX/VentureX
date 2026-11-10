// Run after `next build`. Creates a disposable database and never uses deployment credentials.
import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";

const directory = mkdtempSync(join(tmpdir(), "venturex-owner-test-"));
const database = join(directory, "test.db");
const databaseUrl = `file:${database}`;
const sql = execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "diff", "--from-empty", "--to-schema-datamodel", "prisma/schema.prisma", "--script"], { encoding: "utf8" });
execFileSync("python3", ["-c", "import sqlite3,sys; sqlite3.connect(sys.argv[1]).executescript(sys.stdin.read())", database], { input: sql });
const db = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
const secret = randomUUID();
const ownerCode = randomUUID();
const port = 43139;
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", String(port)], {
  env: { ...process.env, DATABASE_URL: databaseUrl, AUTH_SECRET: secret, OWNER_ACCESS_CODE: ownerCode }, stdio: ["ignore", "pipe", "pipe"],
});
let logs = "";
server.stdout.on("data", (data) => { logs += data; });
server.stderr.on("data", (data) => { logs += data; });
let checks = 0;
function passed(name) { checks++; console.log(`PASS ${name}`); }
function jar() { return new Map(); }
async function request(path, cookies = jar(), body) {
  const response = await fetch(`${base}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; "), ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), redirect: "manual",
  });
  for (const value of response.headers.getSetCookie()) {
    const pair = value.split(";", 1)[0];
    const index = pair.indexOf("=");
    cookies.set(pair.slice(0, index), pair.slice(index + 1));
  }
  return response;
}
try {
  for (let i = 0; i < 80; i++) {
    try { const result = await fetch(`${base}/team`); if (result.ok) break; } catch { /* starting */ }
    if (server.exitCode !== null || i === 79) throw new Error(`Test server did not start. ${logs}`);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const alpha = await db.lightProgram.create({ data: { name: "Alpha", code: "TESTA" } });
  const beta = await db.lightProgram.create({ data: { name: "Beta", code: "TESTB" } });
  const tripA = await db.lightTrip.create({ data: { programId: alpha.id, flightCode: "AA100", scheduledTime: "10:00" } });
  const tripB = await db.lightTrip.create({ data: { programId: beta.id, flightCode: "AA200" } });
  const paxA = await db.lightPax.create({ data: { tripId: tripA.id, firstName: "Alpha" } });
  const paxB = await db.lightPax.create({ data: { tripId: tripB.id, firstName: "Beta" } });
  const everyone = await db.lightGroup.create({ data: { programId: alpha.id, name: "Everyone", kind: "EVERYONE" } });
  await db.lightScheduleItem.create({ data: { programId: alpha.id, title: "General shuttle", kind: "SHUTTLE", groups: { create: { groupId: everyone.id } } } });
  await db.lightScheduleItem.create({ data: { programId: alpha.id, title: "Private ride", kind: "ARRIVAL", paxId: paxA.id } });

  assert.equal((await request("/api/team/owner")).status, 401);
  passed("anonymous visitors cannot list owner programs");
  const owner = jar();
  const login = await request("/api/team/unlock", owner, { step: "gate", code: ownerCode });
  assert.equal(login.status, 200); assert.equal((await login.json()).owner, true); assert.ok(owner.get("vd_crew"));
  passed("one owner code establishes the owner session");
  const programs = await (await request("/api/team/owner", owner)).json();
  assert.deepEqual(programs.programs.map((p) => p.code), ["TESTA", "TESTB"]);
  assert.equal((await request("/api/team/day", owner)).status, 409);
  passed("owner sees all program numbers and must select a program");
  for (const desk of ["admin", "director", "dispatch", "clipboard", "shuttle", "driver", "setup"]) {
    const selected = await request("/api/team/owner", owner, { programId: alpha.id, desk });
    assert.equal(selected.status, 200);
    const { href } = await selected.json();
    assert.equal((await request(href, owner)).status, 200, desk);
  }
  passed("all staff workspaces open without another code");
  const day = await (await request("/api/team/day", owner)).json();
  assert.equal(day.owner, true); assert.equal(day.program.code, "TESTA"); assert.equal(day.lines.length, 1);
  assert.equal(await db.lightRoster.count(), 0);
  passed("owner gets only the selected program without adding a fake staff shift");
  const denied = await request("/api/team/desk", owner, { action: "check", paxIds: [paxB.id] });
  assert.equal(denied.status, 400); assert.equal((await db.lightPax.findUnique({ where: { id: paxB.id } })).checkedIn, false);
  assert.equal((await request("/api/team/desk", owner, { action: "count", tripId: tripB.id, count: 10 })).status, 400);
  passed("owner actions reject guests and trips from another selected program");
  assert.equal((await request("/api/team/desk", owner, { action: "check", paxIds: [paxA.id] })).status, 200);
  assert.equal((await db.lightPax.findUnique({ where: { id: paxA.id } })).checkedIn, true);
  assert.equal((await db.lightChange.findFirst({ where: { programId: alpha.id }, orderBy: { createdAt: "desc" } })).actor, "Owner");
  passed("owner can operate the selected desk with an Owner audit entry");
  await request("/api/team/owner", owner, { programId: alpha.id, desk: "guest" });
  const preview = await (await request("/api/trip", owner)).json();
  assert.equal(preview.ownerPreview, true); assert.deepEqual(preview.items.map((item) => item.title), ["General shuttle"]);
  passed("guest preview shows the actual general guest view and hides personal rides");
  const guest = jar();
  assert.equal((await request("/api/trip", guest, { step: "open", code: "TESTA" })).status, 200);
  assert.equal((await request("/api/team/owner", guest)).status, 401);
  assert.equal((await (await request("/api/trip", guest)).json()).ownerPreview, false);
  passed("normal program codes never grant owner access");
  const client = jar();
  const token = await new SignJWT({ kind: "client", programId: alpha.id, personId: "", name: "Client" }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("1h").sign(new TextEncoder().encode(secret));
  client.set("vd_crew", token);
  assert.equal((await request("/api/team/owner", client)).status, 401);
  assert.equal((await request("/api/team/owner", client, { programId: beta.id, desk: "dispatch" })).status, 401);
  passed("client sessions cannot list or select owner programs");
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const person = await db.lightRoster.create({ data: { programId: alpha.id, phone: "+15555550100", name: "Test crew", dayCode: "2468", dayCodeDate: date, checkedInAt: new Date(), postCode: "DISPATCH" } });
  const staff = jar();
  staff.set("vd_crew", await new SignJWT({ kind: "crew", programId: alpha.id, personId: person.id, name: person.name }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("1h").sign(new TextEncoder().encode(secret)));
  const crewDay = await request("/api/team/day?code=2468", staff);
  assert.equal(crewDay.status, 200); assert.equal((await crewDay.json()).owner, false);
  assert.equal((await request("/api/team/owner", staff)).status, 401);
  passed("staff day codes still work without gaining owner access");
  const expired = jar();
  expired.set("vd_crew", await new SignJWT({ kind: "admin", programId: alpha.id, personId: "", name: "Owner" }).setProtectedHeader({ alg: "HS256" }).setExpirationTime(1).sign(new TextEncoder().encode(secret)));
  assert.equal((await request("/api/team/owner", expired)).status, 401);
  passed("expired owner sessions cannot access programs");
  const tripLogin = jar();
  assert.equal((await (await request("/api/trip", tripLogin, { step: "open", code: ownerCode })).json()).href, "/team");
  assert.equal((await request("/api/team/owner", tripLogin)).status, 200);
  passed("the same owner code works from Open My Trip");
  assert.equal((await request("/api/team/owner", owner, { programId: beta.id, desk: "dispatch" })).status, 200);
  assert.equal((await (await request("/api/team/day", owner)).json()).program.code, "TESTB");
  passed("switching programs changes the owner desk context");
  await request("/api/team/unlock", owner, { step: "out" });
  assert.equal((await request("/api/team/owner", owner)).status, 401);
  assert.equal((await (await request("/api/trip", owner)).json()).signedIn, false);
  passed("sign-out clears owner and guest preview access");
  console.log(`${checks} owner hub integration checks passed.`);
} catch (error) {
  console.error(error);
  console.error(logs.slice(-4000));
  process.exitCode = 1;
} finally {
  server.kill("SIGTERM");
  await new Promise((resolve) => { if (server.exitCode !== null) resolve(); else server.once("exit", resolve); });
  await db.$disconnect();
  rmSync(directory, { recursive: true, force: true });
}
