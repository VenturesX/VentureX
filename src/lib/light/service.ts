import { db } from "@/lib/db";
import { dateAtEtClock, decideCheckIn, isGreeting, parseIntro, POSITIONS, postLabel, samePost, seesAll, todayET, type CheckState } from "@/lib/light/checkin";
import { decideSms, normalizePhone, type TripSnap } from "@/lib/light/decide";
import { hotelMessage, paxName } from "@/lib/light/hotel";
import { groupManifestRows, type ManifestRow } from "@/lib/light/parse-manifest";
import { airlineName, airlineCode, DEFAULT_AIRLINES, displayFlight, POSTS, ruleKind, tripInTab } from "@/lib/light/posts";
import { addMinutes, clockLabel, isAfterWindow } from "@/lib/light/time";
import { signLightToken, readLightToken } from "@/lib/light/token";
import { getFlightProvider } from "@/lib/providers/flights";
import { programSendsAllowed } from "@/lib/light/outbound";
import { buildGuestCard, shareGuestLine } from "@/lib/guest-card";
import { COMPANY_PHONE } from "@/lib/brand";
import { getSmsProvider } from "@/lib/providers/sms";

const OUT_MICRO = 8500;
const IN_MICRO = 7000;

type ProgramRecord = NonNullable<Awaited<ReturnType<typeof programByCode>>>;

async function guestShare(programId: string, name: string, timeZone: string, serviceDate: string, windowClose: string) {
  const items = await db.lightScheduleItem.findMany({ where: { programId, paxId: "" } });
  const card = buildGuestCard({
    now: new Date(),
    timeZone,
    serviceDate,
    windowClose,
    contact: COMPANY_PHONE,
    moves: items.map((item) => ({
      kind: item.kind,
      timeLabel: item.timeLabel,
      sortKey: item.sortKey,
      spot: item.spot,
      title: item.title,
      frequency: item.frequency,
      guestVisible: item.guestVisible,
    })),
  });
  return shareGuestLine(name, card, COMPANY_PHONE);
}

async function programByCode(code: string) {
  const needle = code.trim().toUpperCase();
  const rows = await db.lightProgram.findMany({ where: { isTemplate: false } });
  return rows.find((row) => row.code.toUpperCase() === needle || row.aliases.split(",").map((item) => item.trim().toUpperCase()).includes(needle)) ?? null;
}

export async function loadBoard(code: string, token = "") {
  const program = await programByCode(code);
  if (!program) return null;
  const viewer = await readLightToken(token);
  const data = await bundle(program.id);
  return { ...data, viewer: viewer && viewer.programId === program.id ? viewer : null };
}

async function bundle(programId: string) {
  const program = await db.lightProgram.findUnique({ where: { id: programId } });
  if (!program) return null;
  const [posts, airlines, rules, directory, trips, flights, changes, alerts, headsUps, roster] = await Promise.all([
    db.lightPost.findMany({ where: { programId }, orderBy: { sortOrder: "asc" } }),
    db.lightAirline.findMany({ where: { programId } }),
    db.lightVehicleRule.findMany({ where: { programId } }),
    db.lightContact.findMany({ where: { programId }, orderBy: { name: "asc" } }),
    db.lightTrip.findMany({ where: { programId }, include: { passengers: { orderBy: { sortOrder: "asc" } } }, orderBy: { sortOrder: "asc" } }),
    db.lightFlight.findMany({ where: { programId } }),
    db.lightChange.findMany({ where: { programId }, orderBy: { createdAt: "desc" }, take: 40 }),
    db.lightAlert.findMany({ where: { programId }, orderBy: { createdAt: "desc" }, take: 12 }),
    db.lightHeadsUp.findMany({ where: { programId }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.lightRoster.findMany({ where: { programId }, orderBy: { name: "asc" } }),
  ]);
  const flightMap = new Map(flights.map((flight) => [flight.flightCode, flight]));
  const lateTrips = trips.filter((trip) => {
    const flight = flightMap.get(trip.flightCode);
    const when = flight?.actualAt || flight?.estimatedAt || trip.scheduledTime;
    return isAfterWindow(when, program.windowClose);
  });
  const lateFlights = new Set(lateTrips.map((trip) => trip.flightCode));
  return {
    program,
    posts,
    airlines,
    rules,
    directory,
    trips,
    flights,
    changes,
    alerts,
    headsUps,
    roster,
    late: {
      flights: lateFlights.size,
      pax: lateTrips.reduce((sum, trip) => sum + (trip.reportedPax ?? trip.passengers.length), 0),
    },
    provider: getFlightProvider().name,
  };
}

export async function applyBoardAction(body: Record<string, unknown>) {
  const code = String(body.code ?? "");
  const program = await programByCode(code);
  if (!program) return { error: "Program not found." };
  const action = String(body.action ?? "");
  const actor = String(body.actor ?? "Board").slice(0, 60);

  if (action === "check-in") {
    const on = Boolean(body.on);
    await db.lightPax.update({
      where: { id: String(body.paxId) },
      data: { checkedIn: on, checkedInAt: on ? new Date() : null },
    });
    await log(program.id, actor, "check-in", on ? "Checked in" : "Check-in cleared");
  } else if (action === "bag") {
    const bagStatus = String(body.bagStatus || "UNKNOWN");
    await db.lightPax.update({ where: { id: String(body.paxId) }, data: { bagStatus } });
    await log(program.id, actor, "bags", bagStatus);
  } else if (action === "send-down") {
    const trip = await db.lightTrip.update({
      where: { id: String(body.tripId) },
      data: { status: "QUEUED" },
      include: { passengers: true },
    });
    await db.lightHeadsUp.create({
      data: {
        programId: program.id,
        fromName: actor,
        body: `Send down ${trip.flightCode} · ${trip.passengers.length} pax · ${trip.vehicleLabel}`,
      },
    });
    await log(program.id, actor, "send-down", trip.flightCode);
  } else if (action === "sent") {
    await markSent(program, String(body.tripId), {
      driverName: String(body.driverName ?? ""),
      driverPhone: String(body.driverPhone ?? ""),
      vehicleNumber: String(body.vehicleNumber ?? ""),
      actor,
    });
  } else if (action === "status") {
    const status = String(body.status || "EXPECTED");
    await db.lightTrip.update({ where: { id: String(body.tripId) }, data: { status } });
    if (status === "NO_SHOW" || status === "OWN_TRANSPORT") {
      await db.lightPax.updateMany({
        where: { tripId: String(body.tripId) },
        data: { noShow: status === "NO_SHOW", ownTransport: status === "OWN_TRANSPORT" },
      });
    }
    await log(program.id, actor, "status", status);
  } else if (action === "edit-trip") {
    const data = pickTrip(body);
    await db.lightTrip.update({ where: { id: String(body.tripId) }, data });
    await log(program.id, actor, "edit", "Trip updated");
  } else if (action === "edit-pax") {
    await db.lightPax.update({
      where: { id: String(body.paxId) },
      data: {
        firstName: String(body.firstName ?? ""),
        lastName: String(body.lastName ?? ""),
        cell: String(body.cell ?? ""),
        notes: String(body.notes ?? ""),
      },
    });
    await log(program.id, actor, "edit", "Guest updated");
  } else if (action === "edit-flight") {
    const flightCode = String(body.flightCode || "").toUpperCase();
    await db.lightFlight.upsert({
      where: { programId_flightCode: { programId: program.id, flightCode } },
      create: {
        programId: program.id,
        flightCode,
        status: String(body.status || "UNKNOWN"),
        gate: String(body.gate ?? ""),
        baggage: String(body.baggage ?? ""),
        estimatedAt: String(body.estimatedAt ?? ""),
        actualAt: String(body.actualAt ?? ""),
        source: "manual",
        pinned: true,
      },
      update: {
        status: String(body.status || "UNKNOWN"),
        gate: String(body.gate ?? ""),
        baggage: String(body.baggage ?? ""),
        estimatedAt: String(body.estimatedAt ?? ""),
        actualAt: String(body.actualAt ?? ""),
        source: "manual",
        pinned: true,
      },
    });
    await log(program.id, actor, "flight", `${flightCode} edited by hand`);
  } else if (action === "template") {
    await saveTemplate(program.id, actor);
  } else if (action === "ack") {
    await db.lightHeadsUp.update({ where: { id: String(body.id) }, data: { ackedAt: new Date() } });
  } else if (action === "reassign") {
    await db.lightRoster.update({
      where: { id: String(body.rosterId) },
      data: { role: String(body.role ?? ""), postCode: String(body.postCode ?? "") },
    });
    await log(program.id, actor, "role", `${body.role} ${body.postCode}`);
  } else if (action === "ping") {
    const result = await pingDriver(program.id, String(body.tripId));
    if (result.error) return result;
  } else {
    return { error: "Unknown action." };
  }
  return { ok: true };
}

function pickTrip(body: Record<string, unknown>) {
  return {
    driverName: String(body.driverName ?? ""),
    driverPhone: String(body.driverPhone ?? ""),
    vehicleNumber: String(body.vehicleNumber ?? ""),
    vehicleLabel: String(body.vehicleLabel ?? ""),
    vendor: String(body.vendor ?? ""),
    notes: String(body.notes ?? ""),
    airSide: String(body.airSide ?? ""),
    postCode: String(body.postCode ?? ""),
  };
}

async function markSent(
  program: ProgramRecord,
  tripId: string,
  input: { driverName: string; driverPhone: string; vehicleNumber: string; actor: string },
) {
  const existing = await db.lightTrip.findUnique({ where: { id: tripId }, include: { passengers: { orderBy: { sortOrder: "asc" } } } });
  if (!existing) return;
  const eta = existing.etaLabel || clockLabel(addMinutes(existing.scheduledTime, program.greetOffsetMin + 25));
  const names = existing.passengers.map((pax) => paxName(pax.firstName, pax.lastName));
  const message = hotelMessage({
    hotelLabel: program.hotelLabel,
    driverName: input.driverName || existing.driverName,
    vendor: existing.vendor,
    vehicleLabel: existing.vehicleLabel,
    vehicleNumber: input.vehicleNumber || existing.vehicleNumber,
    flightCode: existing.flightCode,
    etaLabel: eta,
    names,
  });
  const saved = await db.lightTrip.update({
    where: { id: tripId },
    data: {
      status: "SENT",
      sentAt: new Date(),
      driverName: input.driverName || existing.driverName,
      driverPhone: input.driverPhone || existing.driverPhone,
      vehicleNumber: input.vehicleNumber || existing.vehicleNumber,
      etaLabel: eta,
      hotelMessage: message,
      hotelToken: existing.hotelToken || `h${existing.sortOrder}${Date.now().toString(36)}`,
    },
  });
  await log(program.id, input.actor, "sent", `${saved.flightCode} ${saved.driverName}`.trim());
  await pushAlert(program, saved.hotelMessage, `Hotel alert ${saved.flightCode}`);
}

async function pushAlert(program: ProgramRecord, body: string, label: string) {
  if (program.textingMode === "off" || !body) return;
  const to = program.pmPhone || "hotel";
  await sendText(program.id, to, body, label);
}

async function sendText(programId: string | null, to: string, body: string, status = "sent") {
  if (programId) {
    const program = await db.lightProgram.findUnique({ where: { id: programId }, select: { demo: true, textingMode: true } });
    if (!programSendsAllowed(program)) return;
  }
  let providerStatus = status;
  if (to !== "hotel" && to.includes("+")) {
    try {
      const result = await getSmsProvider().send(to, body);
      providerStatus = result.status;
    } catch (error) {
      providerStatus = error instanceof Error ? error.message : "send failed";
    }
  }
  await db.lightMessage.create({
    data: {
      programId,
      direction: "OUT",
      phone: to,
      body,
      status: providerStatus,
      costMicro: OUT_MICRO,
    },
  });
}

async function log(programId: string, actor: string, action: string, detail: string) {
  await db.lightChange.create({ data: { programId, actor, action, detail } });
}

export async function publishManifest(code: string, rows: ManifestRow[], actor = "Intake") {
  const program = await programByCode(code);
  if (!program) return { error: "Program not found." };
  const airlines = await db.lightAirline.findMany({ where: { programId: program.id } });
  const drafts = groupManifestRows(rows, airlines.length ? airlines : DEFAULT_AIRLINES);
  await db.lightTrip.deleteMany({ where: { programId: program.id } });
  for (const [index, draft] of drafts.entries()) {
    await db.lightTrip.create({
      data: {
        programId: program.id,
        flightCode: draft.flightCode,
        airline: draft.airline || airlineName(airlineCode(draft.flightCode)),
        origin: draft.origin,
        scheduledTime: draft.scheduledTime,
        airSide: draft.airSide,
        postCode: draft.postCode,
        vehicleLabel: draft.vehicleLabel,
        vendor: draft.vendor,
        notes: draft.notes,
        carSeats: draft.carSeats,
        boosters: draft.boosters,
        flags: draft.flags,
        sortOrder: (index + 1) * 10,
        passengers: {
          create: draft.passengers.map((pax, paxIndex) => ({
            firstName: pax.firstName,
            lastName: pax.lastName,
            cell: pax.cell,
            notes: pax.notes,
            sortOrder: paxIndex,
          })),
        },
      },
    });
    if (draft.flightCode) {
      await db.lightFlight.upsert({
        where: { programId_flightCode: { programId: program.id, flightCode: draft.flightCode } },
        create: { programId: program.id, flightCode: draft.flightCode, scheduledAt: draft.scheduledTime, source: "manual" },
        update: {},
      });
    }
  }
  await log(program.id, actor, "publish", `${drafts.length} parties from the review grid`);
  return { ok: true, parties: drafts.length };
}

export async function loadSetup(code: string) {
  const program = await programByCode(code);
  if (!program) return null;
  const [posts, airlines, rules, directory] = await Promise.all([
    db.lightPost.findMany({ where: { programId: program.id }, orderBy: { sortOrder: "asc" } }),
    db.lightAirline.findMany({ where: { programId: program.id } }),
    db.lightVehicleRule.findMany({ where: { programId: program.id } }),
    db.lightContact.findMany({ where: { programId: program.id }, orderBy: { name: "asc" } }),
  ]);
  return { program, posts, airlines, rules, directory };
}

export async function saveSetup(body: Record<string, unknown>) {
  const program = await programByCode(String(body.code ?? ""));
  if (!program) return { error: "Program not found." };
  const offset = Number(body.greetOffsetMin ?? program.greetOffsetMin);
  await db.lightProgram.update({
    where: { id: program.id },
    data: {
      name: String(body.name ?? program.name),
      clientName: String(body.clientName ?? ""),
      hotels: String(body.hotels ?? ""),
      pmName: String(body.pmName ?? ""),
      pmPhone: String(body.pmPhone ?? ""),
      windowClose: String(body.windowClose ?? program.windowClose),
      greetOffsetMin: Math.min(program.greetMaxMin, Math.max(program.greetMinMin, offset || 30)),
      hotelLabel: String(body.hotelLabel ?? program.hotelLabel),
      aliases: String(body.aliases ?? program.aliases),
    },
  });
  if (Array.isArray(body.posts)) {
    await db.lightPost.deleteMany({ where: { programId: program.id } });
    await db.lightPost.createMany({
      data: body.posts.map((post, index) => {
        const row = post as { code?: string; label?: string };
        return { programId: program.id, code: String(row.code || ""), label: String(row.label || row.code || ""), sortOrder: index };
      }),
    });
  }
  if (Array.isArray(body.airlines)) {
    await db.lightAirline.deleteMany({ where: { programId: program.id } });
    await db.lightAirline.createMany({
      data: body.airlines.map((row) => {
        const item = row as { airline?: string; postCode?: string };
        return { programId: program.id, airline: String(item.airline || "").toUpperCase(), postCode: String(item.postCode || "") };
      }),
    });
  }
  if (Array.isArray(body.rules)) {
    await db.lightVehicleRule.deleteMany({ where: { programId: program.id } });
    await db.lightVehicleRule.createMany({
      data: body.rules.map((row) => {
        const item = row as { vehicleKind?: string; pickupNote?: string };
        return { programId: program.id, vehicleKind: String(item.vehicleKind || ""), pickupNote: String(item.pickupNote || "") };
      }),
    });
  }
  if (Array.isArray(body.directory)) {
    await db.lightContact.deleteMany({ where: { programId: program.id } });
    await db.lightContact.createMany({
      data: body.directory.map((row) => {
        const item = row as { kind?: string; name?: string; company?: string; phone?: string; notes?: string };
        return {
          programId: program.id,
          kind: String(item.kind || "DRIVER"),
          name: String(item.name || ""),
          company: String(item.company || ""),
          phone: String(item.phone || ""),
          notes: String(item.notes || ""),
        };
      }).filter((row) => row.name),
    });
  }
  await log(program.id, "Setup", "setup", "Program settings saved");
  return { ok: true };
}

export async function refreshFlights(code: string, force = false) {
  const program = await programByCode(code);
  if (!program) return { error: "Program not found." };
  const provider = getFlightProvider();
  if (provider.name === "manual") return { ok: true, source: "manual", updated: 0 };
  if (!force && program.lastFlightPoll && Date.now() - program.lastFlightPoll.getTime() < 45_000) {
    return { ok: true, source: provider.name, updated: 0, skipped: true };
  }
  const flights = await db.lightFlight.findMany({ where: { programId: program.id } });
  let updated = 0;
  for (const flight of flights) {
    if (flight.pinned) continue;
    try {
      const snap = await provider.lookup(flight.flightCode, program.serviceDate);
      if (snap.source === "manual" || snap.status === "UNKNOWN") continue;
      const baggage = snap.baggage || flight.baggage;
      if (snap.baggage && flight.baggage && snap.baggage !== flight.baggage) {
        await db.lightAlert.create({
          data: { programId: program.id, kind: "BAGGAGE", flightCode: flight.flightCode, body: `${flight.flightCode} carousel changed to ${snap.baggage}.` },
        });
      }
      const clock = snap.eta ? clockFromIso(snap.eta) : flight.estimatedAt;
      await db.lightFlight.update({
        where: { id: flight.id },
        data: {
          status: snap.status,
          gate: snap.gate || flight.gate,
          terminal: snap.terminal || flight.terminal,
          baggage,
          prevBaggage: snap.baggage && snap.baggage !== flight.baggage ? flight.baggage : flight.prevBaggage,
          estimatedAt: clock,
          source: snap.source,
        },
      });
      updated += 1;
    } catch (error) {
      console.warn("flight lookup failed", flight.flightCode, error instanceof Error ? error.message : error);
    }
  }
  await db.lightProgram.update({ where: { id: program.id }, data: { lastFlightPoll: new Date() } });
  return { ok: true, source: provider.name, updated };
}

function clockFromIso(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const match = value.match(/(\d{2}:\d{2})/);
    return match?.[1] ?? "";
  }
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}

export async function handleText(phoneRaw: string, text: string, origin: string, limitProgramId = "") {
  const phone = normalizePhone(phoneRaw);
  const trimmed = text.trim();
  const intro = parseIntro(trimmed);
  if (!intro && /^[A-Za-z0-9]{2,12}$/.test(trimmed)) {
    const named = await programByCode(trimmed);
    if (named) {
      const crew = await db.lightRoster.findFirst({ where: { phone, programId: named.id } });
      if (!crew) {
        const shared = await guestShare(named.id, named.name, named.timezone, named.serviceDate, named.windowClose);
        await db.lightMessage.create({ data: { programId: named.id, direction: "IN", phone, body: trimmed, costMicro: IN_MICRO, status: "guest-code" } });
        await db.lightMessage.create({ data: { programId: named.id, direction: "OUT", phone, body: shared, costMicro: OUT_MICRO, status: "logged" } });
        return { reply: shared, programCode: named.code };
      }
    }
  }
  let program = intro ? await programByCode(intro.code) : await programByCode(trimmed.toUpperCase());
  const rosterHit = program
    ? null
    : await db.lightRoster.findFirst({ where: { phone }, orderBy: { updatedAt: "desc" } });
  if (!program && rosterHit) program = await db.lightProgram.findUnique({ where: { id: rosterHit.programId } });
  if (!program) {
    await db.lightMessage.create({ data: { direction: "IN", phone, body: trimmed, costMicro: IN_MICRO, status: "no-program" } });
    const reply = isGreeting(trimmed)
      ? "What is your name and program number? Example: Aaron 4110"
      : "Text your name and program number. Example: Aaron 4110";
    await db.lightMessage.create({ data: { direction: "OUT", phone, body: reply, costMicro: OUT_MICRO, status: "logged" } });
    return { reply, programCode: "" };
  }
  await db.lightMessage.create({ data: { programId: program.id, direction: "IN", phone, body: trimmed, costMicro: IN_MICRO, status: "logged" } });
  if (program.demo || (limitProgramId && program.id !== limitProgramId)) {
    return { reply: "", programCode: program.code };
  }
  if (/^trip code$/i.test(trimmed)) {
    const person = await db.lightPax.findFirst({ where: { cell: phone, trip: { programId: program.id } } });
    if (person) {
      const { issuePass } = await import("@/lib/guest-portal");
      const pass = await issuePass(person.id);
      const reply = `Your trip code is ${pass}. It ends tonight. Open my trip on the site.`;
      await db.lightMessage.create({ data: { programId: program.id, direction: "OUT", phone, body: reply, costMicro: OUT_MICRO, status: "logged" } });
      return { reply, programCode: program.code };
    }
  }
  if (program.textingMode === "off") {
    return { reply: "Texting is off for this program.", programCode: program.code };
  }

  let roster = await db.lightRoster.findUnique({ where: { programId_phone: { programId: program.id, phone } } });
  if (!roster && intro) {
    const sheet = await db.lightRoster.findMany({ where: { programId: program.id } });
    roster = sheet.find((row) => row.name.toLowerCase() === intro.name.toLowerCase()) ?? null;
    if (roster && roster.phone !== phone) {
      roster = await db.lightRoster.update({ where: { id: roster.id }, data: { phone } });
    }
  }
  const active = Boolean(roster?.checkedInAt && !roster.checkedOutAt);
  const checkState: CheckState | null = roster
    ? {
        name: intro?.name || roster.name,
        postCode: roster.postCode || roster.expectedPost || "B_LOW",
        pending: roster.pending,
        checkedIn: active,
        programName: program.name,
        programCode: program.code,
      }
    : null;
  const check = checkState ? decideCheckIn(trimmed, checkState) : null;
  if (!roster && intro) {
    const reply = `I don't have ${intro.name} on ${program.code}. Check the spelling or ask your lead.`;
    await sendText(program.id, phone, reply, "reply");
    return { reply, programCode: program.code };
  }
  if (check && (!active || roster?.pending === "signout" || check.pending === "signout" || check.checkOut || check.checkIn || check.headsUp || roster?.pending.startsWith("checkin"))) {
    if (!roster) {
      const reply = check.reply;
      await sendText(program.id, phone, reply, "reply");
      return { reply, programCode: program.code };
    }
    let dayCode = roster.dayCode;
    if (check.checkIn) {
      dayCode = String(1000 + Math.floor(Math.random() * 9000));
    }
    roster = await db.lightRoster.update({
      where: { id: roster.id },
      data: {
        name: check.name || roster.name,
        postCode: check.postCode || checkState?.postCode || roster.postCode,
        pending: check.pending,
        dayCode: check.checkIn ? dayCode : roster.dayCode,
        dayCodeDate: check.checkIn ? todayET() : roster.dayCodeDate,
        checkedInAt: check.checkIn ? new Date() : roster.checkedInAt,
        checkedOutAt: check.checkOut ? (check.checkOut === "now" ? new Date() : dateAtEtClock(check.checkOut)) : roster.checkedOutAt,
      },
    });
    if (check.headsUp) {
      await db.lightHeadsUp.create({ data: { programId: program.id, fromName: roster.name || phone, phone, body: check.headsUp } });
      await log(program.id, roster.name || phone, "position", check.headsUp);
    }
    if (check.checkIn) await log(program.id, roster.name, "check-in", roster.postCode);
    if (check.checkOut) await log(program.id, roster.name, "check-out", check.reply);
    const reply = check.checkIn
      ? `${check.reply} Day code ${dayCode}. Team Login, then Director. It ends tonight.`
      : check.reply;
    await sendText(program.id, phone, reply, "reply");
    return { reply, programCode: program.code, dayCode: check.checkIn ? dayCode : "" };
  }
  const trips = await db.lightTrip.findMany({ where: { programId: program.id }, include: { passengers: true }, orderBy: { sortOrder: "asc" } });
  const snaps: TripSnap[] = trips.map((trip) => ({
    id: trip.id,
    flightCode: trip.flightCode,
    origin: trip.origin,
    scheduledTime: trip.scheduledTime,
    postCode: trip.postCode,
    vehicleLabel: trip.vehicleLabel,
    vendor: trip.vendor,
    driverName: trip.driverName,
    status: trip.status,
    pax: trip.reportedPax ?? trip.passengers.length,
    names: trip.passengers.map((pax) => paxName(pax.firstName, pax.lastName)),
  }));
  const expires = program.endsAt ?? new Date(Date.now() + 18 * 60 * 60 * 1000);
  const token = await signLightToken(
    {
      phone,
      programId: program.id,
      role: roster?.role || "",
      post: roster?.postCode || "",
      name: roster?.name || "",
    },
    expires,
  );
  let decision = decideSms({
    text: trimmed,
    phone,
    programName: program.name,
    hotelShort: shortHotel(program.hotels),
    greetOffsetMin: program.greetOffsetMin,
    link: `${origin}/light/${program.code}?t=${token}`,
    roster: roster ? { name: roster.name, role: roster.role, postCode: roster.postCode, pending: roster.pending, lastTripId: roster.lastTripId } : null,
    trips: snaps,
  });
  if (decision.reply.startsWith("Reply a driver") && process.env.OPENAI_API_KEY) {
    const rewritten = await rewriteCommand(trimmed, snaps, roster?.postCode || "");
    if (rewritten && rewritten !== trimmed) {
      decision = decideSms({
        text: rewritten,
        phone,
        programName: program.name,
        hotelShort: shortHotel(program.hotels),
        greetOffsetMin: program.greetOffsetMin,
        link: `${origin}/light/${program.code}?t=${token}`,
        roster: roster ? { name: roster.name, role: roster.role, postCode: roster.postCode, pending: roster.pending, lastTripId: roster.lastTripId } : null,
        trips: snaps,
      });
    }
  }

  if (decision.createRoster && !roster) {
    await db.lightPhone.upsert({ where: { phone }, create: { phone, name: decision.roster?.name || "" }, update: {} });
    roster = await db.lightRoster.create({
      data: { programId: program.id, phone, pending: decision.roster?.pending || "name", name: decision.roster?.name || "" },
    });
  }
  if (roster && decision.roster) {
    const nextName = decision.roster.name ?? roster.name;
    const nextRole = decision.roster.role ?? roster.role;
    const nextPost = decision.roster.postCode ?? roster.postCode;
    roster = await db.lightRoster.update({
      where: { id: roster.id },
      data: {
        name: nextName,
        role: nextRole,
        postCode: nextPost,
        pending: decision.roster.pending ?? "",
        lastTripId: decision.roster.lastTripId ?? roster.lastTripId,
      },
    });
    if (nextName) await db.lightPhone.update({ where: { phone }, data: { name: nextName } }).catch(() => undefined);
  }
  if (decision.headsUp) {
    await db.lightHeadsUp.create({ data: { programId: program.id, fromName: roster?.name || phone, phone, body: decision.headsUp } });
    await log(program.id, roster?.name || phone, "heads-up", decision.headsUp);
  }
  for (const update of decision.tripUpdates ?? []) {
    const trip = trips.find((item) => item.id === update.id);
    if (!trip) continue;
    const names = trip.passengers.map((pax) => paxName(pax.firstName, pax.lastName));
    const message = update.status === "SENT" || (decision.editAlert && trip.status === "SENT")
      ? hotelMessage({
          hotelLabel: program.hotelLabel,
          driverName: update.driverName || trip.driverName,
          vendor: trip.vendor,
          vehicleLabel: trip.vehicleLabel,
          vehicleNumber: trip.vehicleNumber,
          flightCode: trip.flightCode,
          etaLabel: update.etaLabel || trip.etaLabel,
          names,
        })
      : trip.hotelMessage;
    await db.lightTrip.update({
      where: { id: trip.id },
      data: {
        driverName: update.driverName ?? trip.driverName,
        reportedPax: update.reportedPax ?? trip.reportedPax,
        status: update.status ?? trip.status,
        etaLabel: update.etaLabel ?? trip.etaLabel,
        sentAt: update.status === "SENT" ? new Date() : trip.sentAt,
        hotelMessage: message,
        hotelToken: update.status === "SENT" && !trip.hotelToken ? `h${trip.sortOrder}${Date.now().toString(36)}` : trip.hotelToken,
      },
    });
    await log(program.id, roster?.name || phone, update.status === "SENT" ? "sent" : "text", `${trip.flightCode} ${update.reportedPax ?? ""} pax`.trim());
    if (update.status === "SENT" || (decision.editAlert && (trip.status === "SENT" || update.status === "SENT"))) {
      await pushAlert(program, message, `Hotel alert ${trip.flightCode}`);
    }
  }
  const signed = await signLightToken(
    { phone, programId: program.id, role: roster?.role || "", post: roster?.postCode || "", name: roster?.name || "" },
    expires,
  );
  const reply = decision.reply.includes("?t=") ? decision.reply.replace(/https?:\/\/\S+/, `${origin}/light/${program.code}?t=${signed}`) : decision.reply;
  await sendText(program.id, phone, reply, "reply");
  const touched = decision.tripUpdates?.[0]?.id || roster?.lastTripId || "";
  const hotel = touched ? await db.lightTrip.findUnique({ where: { id: touched } }) : null;
  return { reply, programCode: program.code, hotelToken: hotel?.hotelToken ?? "", tripId: hotel?.id ?? "" };
}

function shortHotel(hotels: string) {
  if (/portofino/i.test(hotels)) return "Portofino";
  return hotels.split(",")[0]?.trim() || "hotel";
}

async function rewriteCommand(text: string, trips: TripSnap[], post: string) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return "";
  const context = trips.slice(0, 12).map((trip) => `${trip.flightCode} ${trip.vehicleLabel} ${trip.vendor} ${trip.driverName} ${trip.pax}pax ${trip.postCode} ${trip.status}`).join("\n");
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "Rewrite one airport staff text into a single command. JSON only: {\"command\":\"...\"}. Use forms like Miguel 45, Sent 45 SW 1234 Miguel, EDIT 46, OK, On break, or 6 on the way hold bus 2 min. If nothing fits, {\"command\":\"\"}.",
          },
          { role: "user", content: `Post ${post}\n${context}\nText: ${text}` },
        ],
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return "";
    const json = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const parsed = JSON.parse(json.choices?.[0]?.message?.content || "{}") as { command?: string };
    return parsed.command?.trim() || "";
  } catch {
    return "";
  }
}

async function saveTemplate(programId: string, actor: string) {
  const program = await db.lightProgram.findUnique({ where: { id: programId } });
  if (!program) return;
  const [posts, airlines, rules, directory, trips] = await Promise.all([
    db.lightPost.findMany({ where: { programId } }),
    db.lightAirline.findMany({ where: { programId } }),
    db.lightVehicleRule.findMany({ where: { programId } }),
    db.lightContact.findMany({ where: { programId } }),
    db.lightTrip.findMany({ where: { programId }, include: { passengers: true } }),
  ]);
  const copy = await db.lightProgram.create({
    data: {
      name: `${program.name} template`,
      code: `${program.code}-T${Date.now().toString(36).slice(-4).toUpperCase()}`,
      clientName: program.clientName,
      hotels: program.hotels,
      pmName: program.pmName,
      pmPhone: program.pmPhone,
      serviceDate: program.serviceDate,
      windowClose: program.windowClose,
      greetOffsetMin: program.greetOffsetMin,
      hotelLabel: program.hotelLabel,
      textingMode: "off",
      status: "TEMPLATE",
      isTemplate: true,
      posts: { create: posts.map((post) => ({ code: post.code, label: post.label, sortOrder: post.sortOrder })) },
      airlines: { create: airlines.map((row) => ({ airline: row.airline, postCode: row.postCode })) },
      vehicleRules: { create: rules.map((row) => ({ vehicleKind: row.vehicleKind, pickupNote: row.pickupNote })) },
      directory: { create: directory.map((row) => ({ kind: row.kind, name: row.name, company: row.company, phone: row.phone, notes: row.notes })) },
    },
  });
  for (const trip of trips) {
    await db.lightTrip.create({
      data: {
        programId: copy.id,
        flightCode: trip.flightCode,
        airline: trip.airline,
        origin: trip.origin,
        scheduledTime: trip.scheduledTime,
        airSide: trip.airSide,
        postCode: trip.postCode,
        vehicleLabel: trip.vehicleLabel,
        vendor: trip.vendor,
        notes: trip.notes,
        carSeats: trip.carSeats,
        boosters: trip.boosters,
        flags: trip.flags,
        sortOrder: trip.sortOrder,
        status: "EXPECTED",
        passengers: { create: trip.passengers.map((pax) => ({ firstName: pax.firstName, lastName: pax.lastName, cell: pax.cell, notes: pax.notes, sortOrder: pax.sortOrder })) },
      },
    });
  }
  await log(programId, actor, "template", copy.code);
}

async function pingDriver(programId: string, tripId: string) {
  const program = await db.lightProgram.findUnique({ where: { id: programId } });
  const trip = await db.lightTrip.findUnique({ where: { id: tripId } });
  if (!program || !trip) return { error: "Trip not found." };
  const drivers = await db.lightRoster.findMany({ where: { programId, role: "driver" } });
  if (drivers.length === 0) return { error: "No driver is on the text list." };
  const rules = await db.lightVehicleRule.findMany({ where: { programId } });
  const kind = ruleKind(trip.vehicleLabel);
  const slot = rules.find((rule) => rule.vehicleKind === kind)?.pickupNote || "Ask dispatch";
  const body = `You're up next. Bus ${trip.vehicleNumber || "TBD"}. Run ${clockLabel(trip.scheduledTime) || trip.scheduledTime}. Slot ${slot}. Reply OK or On break.`;
  if (program.textingMode !== "off") {
    for (const driver of drivers) await sendText(programId, driver.phone, body, "ping");
  }
  await log(programId, "Dispatch", "ping", trip.flightCode);
  return { ok: true };
}

export async function loadHotel(token: string) {
  const trip = await db.lightTrip.findUnique({ where: { hotelToken: token }, include: { passengers: { orderBy: { sortOrder: "asc" } }, program: true } });
  if (!trip) return null;
  const expected = trip.reportedPax ?? trip.passengers.length;
  return {
    hotelLabel: trip.program.hotelLabel,
    message: trip.hotelMessage,
    flightCode: trip.flightCode,
    expected,
    receivedCount: trip.receivedCount,
    receivedAt: trip.receivedAt,
    mismatch: trip.receivedCount != null && trip.receivedCount !== expected,
    names: trip.passengers.map((pax) => paxName(pax.firstName, pax.lastName)),
  };
}

export async function receiveHotel(token: string, count: number) {
  const trip = await db.lightTrip.findUnique({ where: { hotelToken: token }, include: { passengers: true } });
  if (!trip) return { error: "Link not found." };
  const expected = trip.reportedPax ?? trip.passengers.length;
  await db.lightTrip.update({ where: { id: trip.id }, data: { receivedCount: count, receivedAt: new Date() } });
  await log(trip.programId, "Hotel", "received", `${count} of ${expected} on ${trip.flightCode}`);
  return { ok: true, mismatch: count !== expected, expected };
}

export async function loadClient(code: string) {
  const board = await loadBoard(code);
  if (!board?.program || !board.trips) return null;
  const program = board.program;
  const trips = board.trips
    .filter((trip) => ["SENT", "QUEUED"].includes(trip.status) || trip.receivedAt)
    .map((trip) => ({
      id: trip.id,
      flightCode: trip.flightCode,
      vehicleLabel: trip.vehicleLabel,
      vehicleNumber: trip.vehicleNumber,
      driverName: trip.driverName,
      vendor: trip.vendor,
      sentAt: trip.sentAt,
      etaLabel: trip.etaLabel,
      receivedAt: program.showHotelConfirm ? trip.receivedAt : null,
      receivedCount: program.showHotelConfirm ? trip.receivedCount : null,
      expected: trip.reportedPax ?? trip.passengers.length,
      names: trip.passengers.map((pax) => paxName(pax.firstName, pax.lastName)),
      stage: trip.receivedAt && program.showHotelConfirm ? "Received" : trip.sentAt ? "En route" : "Sent",
    }));
  return {
    name: program.name,
    hotels: program.hotels,
    finalReportOnly: program.finalReportOnly,
    showLiveFlights: program.showLiveFlights && !program.finalReportOnly,
    showLateAlerts: program.showLateAlerts && !program.finalReportOnly,
    showHotelConfirm: program.showHotelConfirm && !program.finalReportOnly,
    late: program.showLateAlerts && !program.finalReportOnly ? board.late : { flights: 0, pax: 0 },
    flights: program.showLiveFlights && !program.finalReportOnly ? board.flights : [],
    trips: program.finalReportOnly ? trips.filter((trip) => trip.stage === "Received" || trip.sentAt) : trips,
  };
}

export async function loadAdmin() {
  const programs = await db.lightProgram.findMany({ where: { isTemplate: false }, orderBy: { name: "asc" } });
  const messages = await db.lightMessage.findMany({ orderBy: { createdAt: "desc" }, take: 80 });
  const totals = await db.lightMessage.groupBy({ by: ["direction"], _sum: { costMicro: true }, _count: true });
  return {
    programs,
    messages,
    usage: {
      inbound: totals.find((row) => row.direction === "IN")?._count ?? 0,
      outbound: totals.find((row) => row.direction === "OUT")?._count ?? 0,
      micro: totals.reduce((sum, row) => sum + (row._sum.costMicro ?? 0), 0),
    },
  };
}

export async function saveAdmin(programId: string, body: Record<string, unknown>) {
  await db.lightProgram.update({
    where: { id: programId },
    data: {
      textingMode: String(body.textingMode ?? "on"),
      showLiveFlights: Boolean(body.showLiveFlights),
      showLateAlerts: Boolean(body.showLateAlerts),
      showHotelConfirm: Boolean(body.showHotelConfirm),
      finalReportOnly: Boolean(body.finalReportOnly),
    },
  });
  await log(programId, "Owner", "visibility", String(body.textingMode ?? "on"));
  return { ok: true };
}

export async function adminReply(programId: string, phone: string, body: string) {
  const program = await db.lightProgram.findUnique({ where: { id: programId } });
  if (!program) return { error: "Program not found." };
  if (program.textingMode === "off") return { error: "Texting is off." };
  await sendText(programId, normalizePhone(phone), body, "manual");
  await log(programId, "Owner", "reply", phone);
  return { ok: true };
}

export function tabMatches(postCode: string, tab: string) {
  return tripInTab(postCode, tab);
}

export const EMPTY_POSTS = POSTS;

function flightStatusLabel(status: string, gate: string) {
  if (status === "LANDED" && gate) return "At gate";
  if (status === "LANDED") return "Landed";
  if (status === "DELAYED") return "Delayed";
  if (status === "ON_TIME") return "On time";
  if (status === "CANCELLED") return "Canceled";
  return "Scheduled";
}

// ownerProgramId is supplied only by a server route after verifying the admin session.
async function dayActor(code: string, ownerProgramId?: string, actorName = "Owner") {
  if (ownerProgramId) return { programId: ownerProgramId, name: actorName, postCode: "ALL", textAlerts: false, checkedInAt: new Date() };
  return db.lightRoster.findFirst({ where: { dayCode: code.trim(), dayCodeDate: todayET(), checkedOutAt: null } });
}

export async function loadCrewDay(code: string, ownerProgramId?: string, actorName = "Owner", asOwner = true) {
  const person = await dayActor(code, ownerProgramId, actorName);
  if (!person?.checkedInAt) return null;
  const [program, trips, flights, staff] = await Promise.all([
    db.lightProgram.findUnique({ where: { id: person.programId } }),
    db.lightTrip.findMany({ where: { programId: person.programId }, include: { passengers: { orderBy: { sortOrder: "asc" } } } }),
    db.lightFlight.findMany({ where: { programId: person.programId } }),
    db.lightRoster.findMany({ where: { programId: person.programId }, orderBy: { name: "asc" } }),
  ]);
  if (!program) return null;
  const byFlight = new Map<string, typeof trips>();
  for (const trip of trips) {
    const list = byFlight.get(trip.flightCode) ?? [];
    list.push(trip);
    byFlight.set(trip.flightCode, list);
  }
  const lines = [...byFlight.entries()].map(([flightCode, parties]) => {
    const flight = flights.find((item) => item.flightCode === flightCode);
    const scheduled = parties[0]?.scheduledTime ?? "";
    const live = flight?.actualAt || flight?.estimatedAt || "";
    return {
      flightCode,
      sort: scheduled,
      time: clockLabel(live || scheduled),
      airline: airlineName(airlineCode(flightCode)) || parties[0]?.airline || "",
      flight: displayFlight(flightCode),
      status: flightStatusLabel(flight?.status ?? "", flight?.gate ?? ""),
      postCodes: [...new Set(parties.map((party) => party.postCode))],
      mine: seesAll(person.postCode) || parties.some((party) => samePost(party.postCode, person.postCode)),
      origin: parties[0]?.origin ?? "",
      airSide: parties[0]?.airSide ?? "",
      guests: parties.flatMap((party) => party.passengers.map((pax) => ({
        id: pax.id,
        tripId: party.id,
        name: paxName(pax.firstName, pax.lastName),
        cell: pax.cell,
        checkedIn: pax.checkedIn,
        stage: pax.stage,
        stageAt: pax.stageAt?.toISOString() ?? "",
        stageBy: pax.stageBy,
        vehicle: party.vehicleLabel,
        notes: party.notes,
        carSeats: party.carSeats,
        boosters: party.boosters,
      }))),
      parties: parties.map((party) => ({
        id: party.id,
        vehicle: party.vehicleLabel,
        notes: party.notes,
        carSeats: party.carSeats,
        boosters: party.boosters,
        count: party.reportedPax ?? party.passengers.length,
        names: party.passengers.map((pax) => paxName(pax.firstName, pax.lastName)),
        cells: party.passengers.map((pax) => pax.cell).filter(Boolean),
      })),
    };
  }).filter((line) => /^[A-Z]{1,3}\d+$/i.test(line.flightCode.replace(/\s/g, ""))).sort((a, b) => a.sort.localeCompare(b.sort));
  const passengers = trips.flatMap((trip) => trip.passengers);
  const airport = lines.length > 0;
  const checked = passengers.filter((pax) => pax.checkedIn || pax.stage === "SENT" || pax.stage === "SENT_DOWN" || pax.stage === "LOADING").length;
  const loops = trips.filter((trip) => trip.flightCode === "LOOP" && trip.status === "SENT");
  const loopPax = loops.reduce((sum, trip) => sum + (trip.reportedPax ?? 0), 0);
  const sent = trips.filter((trip) => trip.status === "SENT");
  const moved = sent.reduce((sum, trip) => sum + (trip.reportedPax ?? trip.passengers.length), 0);
  const movedOut = loops.filter((trip) => /out|return|egress/i.test(`${trip.notes} ${trip.flags} ${trip.etaLabel}`)).reduce((sum, trip) => sum + (trip.reportedPax ?? 0), 0);
  const loopIn = Math.max(0, loopPax - movedOut);
  const last = [...trips].filter((trip) => trip.sentAt).sort((a, b) => (b.sentAt?.getTime() ?? 0) - (a.sentAt?.getTime() ?? 0))[0];
  const vehicles = [...new Set(trips.map((trip) => trip.vehicleLabel).filter(Boolean))];
  return {
    owner: Boolean(ownerProgramId) && asOwner,
    wide: Boolean(ownerProgramId),
    person: {
      name: person.name,
      postCode: person.postCode,
      postLabel: postLabel(person.postCode),
      textAlerts: person.textAlerts,
      wide: seesAll(person.postCode),
    },
    program: { code: program.code, name: program.name, timezone: program.timezone, windowClose: program.windowClose },
    count: airport
      ? { kind: "airport" as const, moved: checked + loopPax, total: passengers.length, label: "Guests" }
      : { kind: "shuttle" as const, moved, total: Math.max(passengers.length, moved), label: "Moved" },
    shuttle: {
      movedIn: loopIn,
      movedOut,
      finalCount: loopPax,
    },
    flightsMet: lines.filter((line) => line.guests.length > 0 && line.guests.every((guest) => guest.checkedIn || guest.stage === "SENT")).length,
    lastSent: last ? { id: last.id, vehicle: last.vehicleLabel || last.vehicleNumber || "Bus", sentAt: last.sentAt?.toISOString() ?? "", pax: last.reportedPax ?? last.passengers.length } : null,
    vehicles,
    positions: POSITIONS.map((item) => ({ code: item.code, label: item.label })),
    lines,
    staff: staff.map((row) => ({ name: row.name, post: postLabel(row.postCode || row.expectedPost), in: Boolean(row.checkedInAt && !row.checkedOutAt) })),
  };
}

export async function updateCrewDay(code: string, body: { postCode?: string; textAlerts?: boolean; signOut?: boolean }) {
  const person = await db.lightRoster.findFirst({ where: { dayCode: code.trim(), dayCodeDate: todayET(), checkedOutAt: null } });
  if (!person?.checkedInAt) return { error: "Check in first." };
  if (body.signOut) {
    await db.lightRoster.update({ where: { id: person.id }, data: { checkedOutAt: new Date(), dayCode: "" } });
    await log(person.programId, person.name, "check-out", "Signed out from the app");
    return { ok: true, signedOut: true };
  }
  await db.lightRoster.update({
    where: { id: person.id },
    data: {
      postCode: body.postCode || person.postCode,
      textAlerts: body.textAlerts ?? person.textAlerts,
    },
  });
  if (body.postCode && body.postCode !== person.postCode) {
    await log(person.programId, person.name, "position", `${person.name} switched to ${postLabel(body.postCode)}`);
  }
  return { ok: true, signedOut: false };
}

export async function loadCrewReport(code = "NBCU") {
  const program = await programByCode(code);
  if (!program) return null;
  const [staff, trips, changes] = await Promise.all([
    db.lightRoster.findMany({ where: { programId: program.id }, orderBy: { name: "asc" } }),
    db.lightTrip.findMany({ where: { programId: program.id }, include: { passengers: true } }),
    db.lightChange.findMany({ where: { programId: program.id }, orderBy: { createdAt: "desc" }, take: 40 }),
  ]);
  const sent = trips.filter((trip) => trip.status === "SENT");
  const pax = sent.reduce((sum, trip) => sum + (trip.reportedPax ?? trip.passengers.length), 0);
  return {
    program: {
      name: program.name,
      code: program.code,
      showLateAlerts: program.showLateAlerts,
      showHotelConfirm: program.showHotelConfirm,
      finalReportOnly: program.finalReportOnly,
    },
    moved: { arrivals: new Set(sent.map((trip) => trip.flightCode)).size, pax, vehicles: sent.length },
    staff: staff.map((row) => ({
      name: row.name,
      post: postLabel(row.postCode || row.expectedPost),
      in: row.checkedInAt?.toISOString() ?? "",
      out: row.checkedOutAt?.toISOString() ?? "",
      hours: hoursLabel(row.checkedInAt, row.checkedOutAt),
    })),
    notes: changes.map((row) => ({ actor: row.actor, action: row.action, detail: row.detail, at: row.createdAt.toISOString() })),
    sheet: trips
      .slice()
      .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))
      .map((trip) => ({
        time: clockLabel(trip.scheduledTime),
        flight: displayFlight(trip.flightCode),
        post: postLabel(trip.postCode),
        vehicle: trip.vehicleLabel,
        count: trip.reportedPax ?? trip.passengers.length,
        names: trip.passengers.map((pax) => paxName(pax.firstName, pax.lastName)).join(", "),
        notes: trip.notes,
      })),
  };
}

export async function runDesk(code: string, body: { action?: string; paxIds?: string[]; tripId?: string; count?: number; destination?: string; vehicle?: string }, ownerProgramId?: string) {
  const person = await dayActor(code, ownerProgramId);
  if (!person?.checkedInAt) return { error: "Check in first." };
  const ids = [...new Set(body.paxIds ?? [])];
  if (ids.length) {
    const scoped = await db.lightPax.count({ where: { id: { in: ids }, trip: { programId: person.programId } } });
    if (scoped !== ids.length) return { error: "Choose guests from the selected program." };
  }
  if (body.tripId && !(await db.lightTrip.findFirst({ where: { id: body.tripId, programId: person.programId }, select: { id: true } }))) return { error: "Choose a trip from the selected program." };
  if (body.action === "count" && (!Number.isInteger(body.count) || body.count! < 0 || body.count! > 50000)) return { error: "Enter a guest count from 0 to 50,000." };
  const now = new Date();
  if (body.action === "check" && ids.length) {
    await db.lightPax.updateMany({ where: { id: { in: ids } }, data: { checkedIn: true, checkedInAt: now } });
    await log(person.programId, person.name, "check-in", `${ids.length} guests`);
  }
  if (body.action === "count" && body.tripId && body.count != null) {
    await db.lightTrip.update({ where: { id: body.tripId }, data: { reportedPax: body.count } });
    await log(person.programId, person.name, "count", String(body.count));
  }
  if (body.action === "send-down" && ids.length) {
    await db.lightPax.updateMany({ where: { id: { in: ids } }, data: { stage: "SENT_DOWN", stageAt: now, stageBy: person.name, checkedIn: true, checkedInAt: now } });
    await log(person.programId, person.name, "sent-down", `${person.name} sent ${ids.length} to dispatch`);
  }
  if (body.action === "load" && ids.length) {
    await db.lightPax.updateMany({ where: { id: { in: ids } }, data: { stage: "LOADING", stageAt: now, stageBy: person.name } });
    await log(person.programId, person.name, "loading", `${ids.length} in the hold`);
  }
  if (body.action === "send-loop") {
    const count = body.count;
    const vehicle = body.vehicle?.trim() || "";
    if (!vehicle) return { error: "Pick a bus." };
    if (!Number.isInteger(count) || count! < 0 || count! > 50000) return { error: "Enter a guest count from 0 to 50,000." };
    await db.lightTrip.create({
      data: {
        programId: person.programId,
        flightCode: "LOOP",
        vehicleLabel: vehicle,
        status: "SENT",
        reportedPax: count,
        sentAt: now,
        scheduledTime: "",
        notes: body.destination || "Loop",
        sortOrder: 9000,
      },
    });
    await log(person.programId, person.name, "send-loop", `${vehicle} · ${count}`);
  }
  if (body.action === "late" && body.tripId) {
    const trip = await db.lightTrip.findFirst({ where: { id: body.tripId, programId: person.programId } });
    if (!trip) return { error: "That shuttle was not found." };
    const next = Math.max(0, (trip.reportedPax ?? 0) + (body.count ?? 1));
    await db.lightTrip.update({ where: { id: trip.id }, data: { reportedPax: next } });
    await log(person.programId, person.name, "late", `${trip.vehicleLabel} · ${next}`);
  }
  if (body.action === "send" && ids.length) {
    await db.lightPax.updateMany({ where: { id: { in: ids } }, data: { stage: "SENT", stageAt: now, stageBy: person.name } });
    const rows = await db.lightPax.findMany({ where: { id: { in: ids } }, select: { tripId: true } });
    const tripIds = [...new Set(rows.map((row) => row.tripId))];
    for (const tripId of tripIds) {
      const waiting = await db.lightPax.count({ where: { tripId, stage: { not: "SENT" } } });
      if (waiting === 0) {
        await db.lightTrip.update({
          where: { id: tripId },
          data: {
            status: "SENT",
            sentAt: now,
            ...(body.vehicle ? { vehicleLabel: body.vehicle } : {}),
            ...(body.destination ? { etaLabel: body.destination } : {}),
          },
        });
      }
    }
    const note = [body.vehicle, body.destination].filter(Boolean).join(" to ");
    await log(person.programId, person.name, "sent", `${person.name} sent ${ids.length}${note ? ` · ${note}` : ""}`);
  }
  return { ok: true };
}

function hoursLabel(start: Date | null, end: Date | null) {
  if (!start) return "";
  const stop = end ?? new Date();
  const minutes = Math.max(0, Math.round((stop.getTime() - start.getTime()) / 60000));
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}
