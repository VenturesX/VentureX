import type { PrismaClient } from "@prisma/client";
import { hotelMessage, paxName } from "@/lib/light/hotel";
import { DEFAULT_AIRLINES, DEFAULT_RULES, POSTS } from "@/lib/light/posts";
import { todayET } from "@/lib/light/checkin";
import { airlineOf, NBCU_FLIGHTS, NBCU_REVISION, NBCU_TRIPS } from "@/lib/light/seed-data";

export async function ensureLightDemo(db: PrismaClient) {
  try {
    const existing = await db.lightProgram.findUnique({ where: { code: "NBCU" } });
    if (existing?.seedRevision === NBCU_REVISION) return existing.id;
    if (existing) await db.lightProgram.delete({ where: { id: existing.id } });

    const program = await db.lightProgram.create({
      data: {
        name: "NBCU Family Weekend",
        code: "NBCU",
        aliases: "6011,4110",
        clientName: "NBCU",
        hotels: "Loews Portofino Bay Hotel",
        pmName: "Katrina Byerwalters",
        pmPhone: "",
        serviceDate: "2026-11-05",
        timezone: "America/New_York",
        windowClose: "20:00",
        greetOffsetMin: 30,
        hotelLabel: "PORTOFINO BAY",
        textingMode: "on",
        showLiveFlights: true,
        showLateAlerts: true,
        showHotelConfirm: true,
        finalReportOnly: false,
        status: "LIVE",
        isTemplate: false,
        seedRevision: NBCU_REVISION,
        endsAt: new Date("2026-11-07T05:00:00.000Z"),
        posts: { create: POSTS.map((post, index) => ({ code: post.code, label: post.label, sortOrder: index })) },
        airlines: { create: DEFAULT_AIRLINES },
        vehicleRules: { create: DEFAULT_RULES },
        directory: {
          create: [
            { kind: "DRIVER", name: "Elyor", company: "", phone: "407-408-1141" },
            { kind: "DRIVER", name: "Gustavo", company: "", phone: "407-758-8447" },
            { kind: "DRIVER", name: "Marcelo", company: "BKA", phone: "386-956-2901" },
            { kind: "DRIVER", name: "Ben", company: "BKA", phone: "" },
            { kind: "DRIVER", name: "Galen", company: "Royal", phone: "" },
            { kind: "VENDOR", name: "BKA", company: "BKA", phone: "" },
            { kind: "VENDOR", name: "Bravo", company: "Bravo", phone: "" },
            { kind: "VENDOR", name: "Home James", company: "Home James", phone: "" },
            { kind: "VENDOR", name: "Royal", company: "Royal", phone: "" },
            { kind: "VENDOR", name: "Miguel", company: "Miguel", phone: "" },
            { kind: "VENDOR", name: "Jose", company: "Jose", phone: "" },
            { kind: "AFFILIATE", name: "Avalon", company: "Avalon", phone: "" },
            { kind: "AFFILIATE", name: "BKA", company: "BKA", phone: "" },
            { kind: "AFFILIATE", name: "Home James", company: "Home James", phone: "" },
            { kind: "AFFILIATE", name: "Bravo", company: "Bravo", phone: "" },
            { kind: "AFFILIATE", name: "Royal Transportation", company: "Royal Transportation", phone: "" },
          ],
        },
        flights: { create: NBCU_FLIGHTS.map((flight) => ({ ...flight, terminal: "", prevBaggage: "", pinned: false })) },
        alerts: {
          create: {
            kind: "BAGGAGE",
            flightCode: "AA977",
            body: "AA 977 baggage claim is 24.",
          },
        },
        changes: {
          create: {
            actor: "Seed",
            action: "manifest",
            detail: "Loaded NBCU Family Weekend from the Nov 5 arrival sheet.",
          },
        },
      },
    });

    for (const row of NBCU_TRIPS) {
      const names = row.passengers.map((pax) => paxName(pax.firstName, pax.lastName));
      const message = row.status === "SENT"
        ? hotelMessage({
            hotelLabel: "PORTOFINO BAY",
            driverName: row.driverName,
            vendor: row.vendor,
            vehicleLabel: row.vehicleLabel,
            vehicleNumber: row.vehicleNumber,
            flightCode: row.flightCode,
            etaLabel: row.etaLabel ?? "",
            names,
          })
        : "";
      await db.lightTrip.create({
        data: {
          programId: program.id,
          flightCode: row.flightCode,
          airline: airlineOf(row.flightCode),
          origin: row.origin,
          scheduledTime: row.scheduledTime,
          airSide: row.airSide,
          postCode: row.postCode,
          vehicleLabel: row.vehicleLabel,
          vendor: row.vendor,
          notes: row.notes,
          carSeats: row.carSeats,
          boosters: row.boosters,
          flags: row.flags,
          driverName: row.driverName,
          driverPhone: row.driverPhone,
          vehicleNumber: row.vehicleNumber,
          status: row.status,
          sentAt: row.sentAt ? new Date(row.sentAt) : null,
          etaLabel: row.etaLabel ?? "",
          sortOrder: row.sortOrder,
          hotelToken: row.status === "SENT" ? `nbcu-${row.sortOrder}` : null,
          hotelMessage: message,
          ownerName: row.ownerName,
          passengers: { create: row.passengers.map((pax, index) => ({ ...pax, sortOrder: index })) },
        },
      });
    }
    const today = todayET();
    await db.lightRoster.createMany({
      data: [
        { programId: program.id, phone: "+14075550111", name: "Aaron", role: "greeter", postCode: "B2", expectedPost: "B2" },
        { programId: program.id, phone: "+14075550122", name: "Jessica", role: "greeter", postCode: "A_HIGH", expectedPost: "A_HIGH" },
        {
          programId: program.id,
          phone: "+14075550133",
          name: "Marissa",
          role: "greeter",
          postCode: "B_HIGH",
          expectedPost: "B_HIGH",
          dayCode: "4821",
          dayCodeDate: today,
          checkedInAt: new Date(),
        },
      ],
    });
    console.log(`Seeded NBCU light board (${NBCU_TRIPS.length} parties)`);
    return program.id;
  } catch (error) {
    console.warn("Light demo seed skipped:", error instanceof Error ? error.message : error);
    return null;
  }
}
