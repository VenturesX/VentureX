import type { PrismaClient } from "@prisma/client";
import { hashAccessCodes } from "@/lib/crew-access";
import { airlineOf } from "@/lib/light/seed-data";
import { DEFAULT_AIRLINES, DEFAULT_RULES, POSTS, postFromSide } from "@/lib/light/posts";

export const DEMO_REVISION = "demo-airport-1";
export const DEMO_CODE = "DEMO";
export const DEMO_NAME = "DEMO · Family Weekend";

export type DemoTrip = {
  flightCode: string;
  origin: string;
  scheduledTime: string;
  airSide: string;
  vehicleLabel: string;
  vendor: string;
  notes: string;
  carSeats: number;
  boosters: number;
  driverName: string;
  driverPhone: string;
  dayLabel: string;
  names: string[];
  cells: string[];
};

export const DEMO_TRIPS: DemoTrip[] = [
  {
    flightCode: "DL1184",
    origin: "BOS",
    scheduledTime: "10:20",
    airSide: "B1",
    vehicleLabel: "SUV",
    vendor: "Harbor",
    notes: "Thursday arrival",
    carSeats: 0,
    boosters: 0,
    driverName: "Sam Ortiz",
    driverPhone: "+14075550101",
    dayLabel: "Thursday",
    names: ["Casey North", "Riley West"],
    cells: ["+14075550110", "+14075550111"],
  },
  {
    flightCode: "AA442",
    origin: "ORD",
    scheduledTime: "13:15",
    airSide: "B2",
    vehicleLabel: "Sprinter",
    vendor: "Harbor",
    notes: "Friday arrival · VIP",
    carSeats: 0,
    boosters: 0,
    driverName: "Quinn Patel",
    driverPhone: "+14075550102",
    dayLabel: "Friday",
    names: ["Jordan Hale", "Avery Brooks", "Drew Ellis"],
    cells: ["+14075550112", "+14075550113", "+14075550114"],
  },
  {
    flightCode: "B6120",
    origin: "JFK",
    scheduledTime: "16:05",
    airSide: "C",
    vehicleLabel: "Standby SUV",
    vendor: "Cove",
    notes: "Friday arrival · 1 car seat",
    carSeats: 1,
    boosters: 0,
    driverName: "Sam Ortiz",
    driverPhone: "+14075550101",
    dayLabel: "Friday",
    names: ["Parker Quinn", "Skyler Brooks"],
    cells: ["+14075550115", "+14075550116"],
  },
  {
    flightCode: "UA883",
    origin: "EWR",
    scheduledTime: "09:05",
    airSide: "B1",
    vehicleLabel: "SUV",
    vendor: "Cove",
    notes: "Saturday departure",
    carSeats: 0,
    boosters: 0,
    driverName: "Quinn Patel",
    driverPhone: "+14075550102",
    dayLabel: "Saturday",
    names: ["Casey North", "Riley West"],
    cells: ["+14075550110", "+14075550111"],
  },
  {
    flightCode: "WN2104",
    origin: "BWI",
    scheduledTime: "11:40",
    airSide: "B2",
    vehicleLabel: "Sprinter",
    vendor: "Harbor",
    notes: "Saturday departure · VIP",
    carSeats: 0,
    boosters: 1,
    driverName: "",
    driverPhone: "",
    dayLabel: "Saturday",
    names: ["Jamie Cole", "Drew Ellis"],
    cells: ["+14075550117", "+14075550114"],
  },
];

function splitName(name: string) {
  const parts = name.trim().split(/\s+/);
  return { firstName: parts.slice(0, -1).join(" ") || parts[0] || "", lastName: parts.length > 1 ? parts[parts.length - 1] : "" };
}

export function demoPhones() {
  const phones = [
    "+14075550101",
    "+14075550102",
    "+14075550121",
    "+14075550122",
    "+14075550123",
    ...DEMO_TRIPS.flatMap((trip) => [trip.driverPhone, ...trip.cells]),
  ];
  return [...new Set(phones.filter(Boolean))];
}

export async function ensureDemoAirport(db: PrismaClient) {
  const existing = await db.lightProgram.findUnique({ where: { code: DEMO_CODE } });
  if (existing?.seedRevision === DEMO_REVISION && existing.demo) return existing.id;
  if (existing) await db.lightProgram.delete({ where: { id: existing.id } });

  const program = await db.lightProgram.create({
    data: {
      name: DEMO_NAME,
      code: DEMO_CODE,
      aliases: "",
      accessCodeHash: await hashAccessCodes([DEMO_CODE], true),
      clientName: "DEMO",
      hotels: "Loews Portofino Bay Hotel",
      pmName: "Demo desk",
      pmPhone: "",
      serviceDate: "2026-11-12",
      timezone: "America/New_York",
      windowClose: "20:00",
      greetOffsetMin: 30,
      hotelLabel: "PORTOFINO BAY",
      textingMode: "off",
      showLiveFlights: true,
      showLateAlerts: true,
      showHotelConfirm: true,
      finalReportOnly: false,
      clientManagesGroups: false,
      demo: true,
      status: "LIVE",
      isTemplate: false,
      seedRevision: DEMO_REVISION,
      endsAt: new Date("2026-11-15T05:00:00.000Z"),
      posts: { create: POSTS.map((post, index) => ({ code: post.code, label: post.label, sortOrder: index })) },
      airlines: { create: DEFAULT_AIRLINES },
      vehicleRules: { create: DEFAULT_RULES },
      directory: {
        create: [
          { kind: "DRIVER", name: "Sam Ortiz", company: "Harbor", phone: "+14075550101" },
          { kind: "DRIVER", name: "Quinn Patel", company: "Cove", phone: "+14075550102" },
          { kind: "VENDOR", name: "Harbor", company: "Harbor", phone: "" },
          { kind: "VENDOR", name: "Cove", company: "Cove", phone: "" },
        ],
      },
      roster: {
        create: [
          { phone: "+14075550121", name: "Riley Chen", role: "greeter", postCode: "B_HIGH", expectedPost: "B_HIGH" },
          { phone: "+14075550122", name: "Morgan Blake", role: "greeter", postCode: "B_LOW", expectedPost: "B_LOW" },
          { phone: "+14075550123", name: "Avery Brooks", role: "greeter", postCode: "C", expectedPost: "C" },
          { phone: "+14075550101", name: "Sam Ortiz", role: "driver", postCode: "DISPATCH", expectedPost: "DISPATCH" },
          { phone: "+14075550102", name: "Quinn Patel", role: "driver", postCode: "DISPATCH", expectedPost: "DISPATCH" },
        ],
      },
    },
  });

  for (const [index, row] of DEMO_TRIPS.entries()) {
    await db.lightTrip.create({
      data: {
        programId: program.id,
        flightCode: row.flightCode,
        airline: airlineOf(row.flightCode),
        origin: row.origin,
        scheduledTime: row.scheduledTime,
        airSide: row.airSide,
        postCode: postFromSide(row.airSide),
        vehicleLabel: row.vehicleLabel,
        vendor: row.vendor,
        notes: row.notes,
        carSeats: row.carSeats,
        boosters: row.boosters,
        flags: row.notes.includes("VIP") ? "VIP" : "",
        driverName: row.driverName,
        driverPhone: row.driverPhone,
        status: "EXPECTED",
        sortOrder: (index + 1) * 10,
        ownerName: "Demo desk",
        passengers: {
          create: row.names.map((name, paxIndex) => ({
            ...splitName(name),
            cell: row.cells[paxIndex] || "",
            sortOrder: paxIndex,
          })),
        },
      },
    });
  }

  const everyone = await db.lightGroup.create({
    data: { programId: program.id, name: "Everyone", kind: "EVERYONE", sortOrder: 0 },
  });
  const days = [
    { title: "Thursday arrivals", timeLabel: "Thursday", sortKey: "1", summary: "MCO arrivals into Loews Portofino Bay.", detail: "Family weekend sample. Nothing on this program is sent." },
    { title: "Friday arrivals and departures", timeLabel: "Friday", sortKey: "2", summary: "VIP Sprinter and a standby SUV with a car seat.", detail: "Air sides B1, B2, and C." },
    { title: "Saturday departures", timeLabel: "Saturday", sortKey: "3", summary: "Return flights to the airport.", detail: "Demo only. Texts and email stay off." },
  ];
  for (const day of days) {
    const item = await db.lightScheduleItem.create({
      data: { programId: program.id, kind: "EVENT", route: "MCO · Loews Portofino Bay", ...day },
    });
    await db.lightItemGroup.create({ data: { itemId: item.id, groupId: everyone.id } });
  }
  await db.lightChange.create({
    data: { programId: program.id, actor: "Seed", action: "manifest", detail: "Loaded the DEMO family-weekend airport program. Outbound texts and email are off." },
  });
  return program.id;
}
