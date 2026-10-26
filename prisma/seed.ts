import {
  PrismaClient,
  GuestStatus,
  Priority,
  VehicleStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedClipboard } from "../src/lib/clipboard/persist";
import { DEFAULT_EXPERT_PHONE, OWNER_OFFICE_HOURS, SETTINGS_KEYS } from "../src/lib/guidance";
import { defaultGuestExpiry, makeGuestCode, makeGuestToken } from "../src/lib/guest-codes";

const db = new PrismaClient();
const PASSWORD = "VentureOps!26";

async function main() {
  const existingAdmin = await db.user.findUnique({ where: { email: "admin@venture.direct" } });
  if (existingAdmin) {
    console.log("Demo accounts already exist. Leaving quote, guest, and airport records in place.");
    await ensureClipboard();
    await ensureDefaults();
    return;
  }

  await db.shuttleDesk.deleteMany();
  await db.clipboardRun.deleteMany();
  await db.clipboardRoster.deleteMany();
  await db.clipboardDay.deleteMany();
  await db.clipboardProgram.deleteMany();
  await db.assignmentGuest.deleteMany();
  await db.assignment.deleteMany();
  await db.statusHistory.deleteMany();
  await db.auditLog.deleteMany();
  await db.exception.deleteMany();
  await db.mockOutboundMessage.deleteMany();
  await db.guest.deleteMany();
  await db.movement.deleteMany();
  await db.timingPreset.deleteMany();
  await db.alertConfig.deleteMany();
  await db.geofence.deleteMany();
  await db.route.deleteMany();
  await db.driver.deleteMany();
  await db.vehicle.deleteMany();
  await db.user.deleteMany();
  await db.location.deleteMany();
  await db.guestAccessAttempt.deleteMany();
  await db.guestRequest.deleteMany();
  await db.eventFaq.deleteMany();
  await db.event.deleteMany();
  await db.operator.deleteMany();
  await db.client.deleteMany();

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const client = await db.client.create({
    data: {
      name: "Horizon DMC Orlando",
      contactName: "Camille Ortiz",
      contactEmail: "client@venture.direct",
      contactPhone: "+1-407-555-0140",
      notes: "Primary DMC for IAAPA hosted-buyer and VIP airport arrivals.",
    },
  });

  const startsAt = new Date("2026-11-16T11:00:00-05:00");
  const endsAt = new Date("2026-11-20T22:00:00-05:00");

  const event = await db.event.create({
    data: {
      clientId: client.id,
      name: "IAAPA Expo 2026 — Hosted Buyer Arrivals",
      code: "IAAPA-MCO-26",
      city: "Orlando",
      timezone: "America/New_York",
      startsAt,
      endsAt,
      waitTargetMinutes: 18,
      alertConfig: {
        create: {
          waitThresholdMinutes: 18,
          vipWaitThresholdMinutes: 10,
          queueCapacityAlert: 25,
          enabled: true,
        },
      },
      timingPresets: {
        create: [
          { name: "Sprinter curb hop", loadMinutes: 6, travelMinutes: 22, bufferMinutes: 8 },
          { name: "Motorcoach wave", loadMinutes: 12, travelMinutes: 28, bufferMinutes: 10 },
          { name: "VIP SUV", loadMinutes: 3, travelMinutes: 20, bufferMinutes: 5 },
        ],
      },
    },
  });

  await db.eventFaq.createMany({
    data: [
      {
        eventId: event.id,
        category: "PICKUP",
        question: "Where do we meet?",
        answer: "Meet at Terminal C arrivals. Look for the Venture Directors sign.",
        sortOrder: 1,
      },
      {
        eventId: event.id,
        category: "SCHEDULE",
        question: "What time is my pickup?",
        answer: "Use the time on your planner's itinerary. If that time changes, send a question and the team will confirm it.",
        sortOrder: 2,
      },
      {
        eventId: event.id,
        category: "LOST",
        question: "I left something on the vehicle.",
        answer: "Tell us what you left and which ride, if you know it. The team will check with the operator.",
        sortOrder: 3,
      },
      {
        eventId: event.id,
        category: "ACCESSIBILITY",
        question: "I need a wheelchair or extra time to board.",
        answer: "Tell us what you need before pickup when you can. On the day, the on-site team will make room and time to board safely.",
        sortOrder: 4,
      },
    ],
  });

  const mco = await db.location.create({
    data: {
      eventId: event.id,
      name: "MCO Terminal C Arrivals",
      type: "AIRPORT",
      address: "11100 Terminal C Arrivals, Orlando International Airport",
      lat: 28.4316,
      lng: -81.3084,
      notes: "Meet at international/domestic arrivals hall, then walk to curb queue.",
    },
  });
  const curb = await db.location.create({
    data: {
      eventId: event.id,
      name: "Terminal C arrivals curb — queue zone",
      type: "CURB",
      address: "Terminal C commercial curb, MCO",
      lat: 28.4321,
      lng: -81.3078,
    },
  });
  const hyatt = await db.location.create({
    data: {
      eventId: event.id,
      name: "Hyatt Regency Orlando",
      type: "HOTEL",
      address: "9801 International Dr, Orlando, FL 32819",
      lat: 28.4257,
      lng: -81.4612,
    },
  });
  await db.location.create({
    data: {
      eventId: event.id,
      name: "Orange County Convention Center — West Concourse",
      type: "VENUE",
      address: "9800 International Dr, Orlando, FL 32819",
      lat: 28.4244,
      lng: -81.4694,
    },
  });
  await db.location.create({
    data: {
      eventId: event.id,
      name: "Sand Lake staging lot",
      type: "STAGING",
      address: "Sand Lake Rd commercial staging, Orlando",
      lat: 28.4502,
      lng: -81.4311,
    },
  });

  await db.geofence.create({
    data: {
      eventId: event.id,
      locationId: curb.id,
      name: "MCO C curb queue",
      kind: "QUEUE_ZONE",
      centerLat: 28.4321,
      centerLng: -81.3078,
      radiusMeters: 160,
    },
  });

  const route = await db.route.create({
    data: {
      eventId: event.id,
      name: "MCO C → Hyatt Regency Orlando",
      originId: mco.id,
      destinationId: hyatt.id,
      estimatedMinutes: 24,
    },
  });

  const movement = await db.movement.create({
    data: {
      eventId: event.id,
      routeId: route.id,
      name: "Monday hosted-buyer arrivals wave",
      type: "AIRPORT_ARRIVAL",
      status: "OPEN",
      scheduledAt: new Date("2026-11-16T13:30:00-05:00"),
      originId: mco.id,
      destinationId: hyatt.id,
      notes: "Primary vertical slice: meet-and-greet → queue → assign → driver sequence.",
    },
  });

  const guestCode = makeGuestCode();
  await db.event.update({
    where: { id: event.id },
    data: {
      guestToken: makeGuestToken(),
      guestCode,
      guestAccess: "TOKEN",
      guestTokenExpiresAt: defaultGuestExpiry(endsAt, movement.scheduledAt),
    },
  });
  console.log(`Guest trip code: ${guestCode}`);

  const operator = await db.operator.create({
    data: {
      name: "Venture Fleet Orlando",
      contactEmail: "fleet@venture.direct",
      phone: "+1-407-555-0199",
      notes: "Owned fleet for Beta 0. Partner operators deferred.",
    },
  });

  const admin = await db.user.create({
    data: {
      email: "admin@venture.direct",
      passwordHash,
      name: "Ava Renner",
      role: "ADMIN",
      phone: "+1-407-555-0101",
    },
  });
  await db.user.create({
    data: {
      email: "dispatch@venture.direct",
      passwordHash,
      name: "Dominic Cruz",
      role: "DISPATCHER",
      phone: "+1-407-555-0102",
    },
  });
  await db.user.create({
    data: {
      email: "greeter@venture.direct",
      passwordHash,
      name: "Sofia Patel",
      role: "MEET_GREET",
      phone: "+1-407-555-0103",
    },
  });
  await db.user.create({
    data: {
      email: "client@venture.direct",
      passwordHash,
      name: "Camille Ortiz",
      role: "CLIENT",
      phone: "+1-407-555-0140",
      clientId: client.id,
    },
  });

  const vehicleSeed = [
    { fleetNumber: "V-101", name: "Sprinter 101", type: "SPRINTER" as const, capacity: 12, status: "AVAILABLE" as VehicleStatus },
    { fleetNumber: "V-102", name: "Sprinter 102", type: "SPRINTER" as const, capacity: 12, status: "AVAILABLE" as VehicleStatus },
    { fleetNumber: "V-201", name: "Coach 201", type: "MOTORCOACH" as const, capacity: 36, status: "AVAILABLE" as VehicleStatus },
    { fleetNumber: "V-301", name: "VIP SUV 301", type: "SUV" as const, capacity: 6, status: "AVAILABLE" as VehicleStatus },
    { fleetNumber: "V-110", name: "Sprinter 110", type: "SPRINTER" as const, capacity: 12, status: "OFFLINE" as VehicleStatus },
  ];

  const vehicles = [];
  for (const v of vehicleSeed) {
    vehicles.push(
      await db.vehicle.create({
        data: { ...v, eventId: event.id, operatorId: operator.id },
      }),
    );
  }

  const driverSeed = [
    { email: "driver1@venture.direct", name: "Marcus Hale", phone: "+1-407-555-0201", vehicle: vehicles[0] },
    { email: "driver2@venture.direct", name: "Priya Shah", phone: "+1-407-555-0202", vehicle: vehicles[1] },
    { email: "driver3@venture.direct", name: "Luis Ortega", phone: "+1-407-555-0203", vehicle: vehicles[2] },
    { email: "driver4@venture.direct", name: "Elena Cho", phone: "+1-407-555-0204", vehicle: vehicles[3] },
  ];

  for (const d of driverSeed) {
    const user = await db.user.create({
      data: {
        email: d.email,
        passwordHash,
        name: d.name,
        role: "DRIVER",
        phone: d.phone,
      },
    });
    await db.driver.create({
      data: {
        userId: user.id,
        operatorId: operator.id,
        phone: d.phone,
        licenseNumber: `FL-${d.email.slice(6, 12).toUpperCase()}`,
        status: "AVAILABLE",
        currentVehicleId: d.vehicle.status === "AVAILABLE" ? d.vehicle.id : null,
      },
    });
  }

  type GuestSeed = {
    firstName: string;
    lastName: string;
    partyCode: string;
    partySize: number;
    flightNumber: string;
    etaMin: number;
    hotelName: string;
    confirmationCode: string;
    priority: Priority;
    status?: GuestStatus;
    email?: string;
    queuedAgoMin?: number;
  };

  const guests: GuestSeed[] = [
    {
      firstName: "James",
      lastName: "Whitaker",
      partyCode: "WHT-04",
      partySize: 1,
      flightNumber: "AA 1823",
      etaMin: 12,
      hotelName: "Hyatt Regency Orlando",
      confirmationCode: "IAAPA-WHT-04",
      priority: "VIP",
      email: "james.whitaker@example.com",
    },
    {
      firstName: "Helen",
      lastName: "Whitaker",
      partyCode: "WHT-04",
      partySize: 1,
      flightNumber: "AA 1823",
      etaMin: 12,
      hotelName: "Hyatt Regency Orlando",
      confirmationCode: "IAAPA-WHT-04B",
      priority: "VIP",
    },
    {
      firstName: "Wei",
      lastName: "Chen",
      partyCode: "CHN-02",
      partySize: 2,
      flightNumber: "DL 1098",
      etaMin: 25,
      hotelName: "Hyatt Regency Orlando",
      confirmationCode: "IAAPA-CHN-02",
      priority: "ACCESSIBILITY",
      email: "wei.chen@example.com",
    },
    {
      firstName: "Amelia",
      lastName: "Rhodes",
      partyCode: "RHD-01",
      partySize: 1,
      flightNumber: "UA 441",
      etaMin: -8,
      hotelName: "Hyatt Regency Orlando",
      confirmationCode: "IAAPA-RHD-01",
      priority: "NORMAL",
      status: "QUEUED",
      queuedAgoMin: 11,
    },
    {
      firstName: "Noah",
      lastName: "Okoye",
      partyCode: "OKY-03",
      partySize: 3,
      flightNumber: "B6 219",
      etaMin: -20,
      hotelName: "Hyatt Regency Orlando",
      confirmationCode: "IAAPA-OKY-03",
      priority: "NORMAL",
      status: "QUEUED",
      queuedAgoMin: 22,
    },
    {
      firstName: "Priya",
      lastName: "Nair",
      partyCode: "NAR-02",
      partySize: 2,
      flightNumber: "AA 1823",
      etaMin: 12,
      hotelName: "Hyatt Regency Orlando",
      confirmationCode: "IAAPA-NAR-02",
      priority: "NORMAL",
    },
  ];

  const extraLast = [
    "Brooks", "Vega", "Kim", "Hassan", "Moreau", "Diaz", "Okafor", "Singh",
    "Berg", "Costa", "Nguyen", "Adler", "Ibrahim", "Sato", "Klein", "Mwangi",
    "Larsson", "Perez", "Hughes", "Tanaka", "Rossi", "Kowalski", "Bennett", "Qureshi",
  ];
  extraLast.forEach((last, i) => {
    guests.push({
      firstName: ["Alex", "Morgan", "Riley", "Jordan", "Casey", "Quinn"][i % 6],
      lastName: last,
      partyCode: `GEN-${String(i + 1).padStart(2, "0")}`,
      partySize: (i % 3) + 1,
      flightNumber: ["WN 1488", "DL 2201", "AA 905", "NK 612"][i % 4],
      etaMin: 8 + i * 4,
      hotelName: "Hyatt Regency Orlando",
      confirmationCode: `IAAPA-GEN-${String(i + 1).padStart(3, "0")}`,
      priority: i % 9 === 0 ? "VIP" : "NORMAL",
    });
  });

  for (const g of guests) {
    const queuedAt = g.queuedAgoMin ? new Date(Date.now() - g.queuedAgoMin * 60_000) : null;
    await db.guest.create({
      data: {
        eventId: event.id,
        movementId: movement.id,
        firstName: g.firstName,
        lastName: g.lastName,
        email: g.email ?? `${g.firstName}.${g.lastName}@buyers.iaapa.example`.toLowerCase(),
        phone: "+1-407-555-1" + String(100 + guests.indexOf(g)).padStart(3, "0"),
        partySize: g.partySize,
        partyCode: g.partyCode,
        flightNumber: g.flightNumber,
        flightEta: new Date(Date.now() + g.etaMin * 60_000),
        hotelName: g.hotelName,
        confirmationCode: g.confirmationCode,
        priority: g.priority,
        status: g.status ?? "EXPECTED",
        queuedAt,
        checkedInAt: queuedAt,
        foundAt: queuedAt,
        notes: g.priority === "VIP" ? "Hosted buyer — greeter walk to curb" : null,
        assistanceNotes: g.priority === "ACCESSIBILITY" ? "Wheelchair assist from baggage claim" : null,
      },
    });
  }

  await db.exception.create({
    data: {
      eventId: event.id,
      type: "FLIGHT_DELAY",
      severity: "INFO",
      title: "DL 1098 showing delayed in mock flight feed",
      detail: "Chen party (accessibility). Confirm on the floor before holding a vehicle.",
      status: "OPEN",
    },
  });

  await db.auditLog.create({
    data: {
      actorId: admin.id,
      action: "seed.bootstrap",
      entityType: "EVENT",
      entityId: event.id,
      afterJson: JSON.stringify({ event: event.code, guests: guests.length }),
      reason: "Initial Orlando arrival slice",
    },
  });

  await ensureClipboard();
  await ensureDefaults();

  console.log("Seeded Venture Directors");
  console.log(`Event ${event.code} (${event.id})`);
  console.log("Accounts: admin / dispatch / greeter / driver1 / client @venture.direct");
  console.log(`Password: ${PASSWORD}`);
}

async function ensureClipboard() {
  try {
    const count = await db.clipboardProgram.count();
    if (count > 0) {
      console.log("Clipboard already seeded");
      return;
    }
    await seedClipboard(db);
    console.log("Seeded curb clipboard");
  } catch (error) {
    console.warn("Clipboard seed skipped:", error instanceof Error ? error.message : error);
  }
}

async function ensureDefaults() {
  try {
    await ensureSetting(SETTINGS_KEYS.expertPhone, DEFAULT_EXPERT_PHONE);
    await ensureSetting(SETTINGS_KEYS.defaultDirectLine, DEFAULT_EXPERT_PHONE);
    await ensureSetting(SETTINGS_KEYS.officeHours, JSON.stringify(OWNER_OFFICE_HOURS));
  } catch (error) {
    console.warn("Settings seed skipped:", error instanceof Error ? error.message : error);
  }
}

async function ensureSetting(key: string, value: string) {
  const existing = await db.appSetting.findUnique({ where: { key } });
  if (existing) return;
  await db.appSetting.create({ data: { key, value } });
}

main()
  .then(() => db.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await db.$disconnect();
    process.exit(1);
  });
