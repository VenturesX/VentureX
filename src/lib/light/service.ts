import { db } from "@/lib/db";
import { decideSms, normalizePhone, type TripSnap } from "@/lib/light/decide";
import { hotelMessage, paxName } from "@/lib/light/hotel";
import { groupManifestRows, type ManifestRow } from "@/lib/light/parse-manifest";
import { airlineName, airlineCode, DEFAULT_AIRLINES, POSTS, ruleKind, tripInTab } from "@/lib/light/posts";
import { addMinutes, clockLabel, isAfterWindow } from "@/lib/light/time";
import { signLightToken, readLightToken } from "@/lib/light/token";
import { getFlightProvider } from "@/lib/providers/flights";
import { getSmsProvider } from "@/lib/providers/sms";

const OUT_MICRO = 8500;
const IN_MICRO = 7000;

type ProgramRecord = NonNullable<Awaited<ReturnType<typeof programByCode>>>;

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

export async function handleText(phoneRaw: string, text: string, origin: string) {
  const phone = normalizePhone(phoneRaw);
  const trimmed = text.trim();
  const codeGuess = trimmed.toUpperCase();
  let program = await programByCode(codeGuess);
  const rosterHit = program
    ? null
    : await db.lightRoster.findFirst({ where: { phone }, orderBy: { updatedAt: "desc" } });
  if (!program && rosterHit) program = await db.lightProgram.findUnique({ where: { id: rosterHit.programId } });
  if (!program) {
    await db.lightMessage.create({ data: { direction: "IN", phone, body: trimmed, costMicro: IN_MICRO, status: "no-program" } });
    const reply = "Text the program code to join. Example: NBCU";
    await db.lightMessage.create({ data: { direction: "OUT", phone, body: reply, costMicro: OUT_MICRO, status: "logged" } });
    return { reply, programCode: "" };
  }
  await db.lightMessage.create({ data: { programId: program.id, direction: "IN", phone, body: trimmed, costMicro: IN_MICRO, status: "logged" } });
  if (program.textingMode === "off") {
    return { reply: "Texting is off for this program.", programCode: program.code };
  }

  let roster = await db.lightRoster.findUnique({ where: { programId_phone: { programId: program.id, phone } } });
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
