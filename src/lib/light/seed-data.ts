import { splitPerson } from "@/lib/light/parse-manifest";
import { airlineCode, airlineName, postFromSide } from "@/lib/light/posts";

export const NBCU_REVISION = "nbcu-nov5-2026-v3";

export type SeedPax = { firstName: string; lastName: string };
export type SeedTrip = {
  flightCode: string;
  origin: string;
  scheduledTime: string;
  airSide: string;
  postCode: string;
  vehicleLabel: string;
  vendor: string;
  notes: string;
  carSeats: number;
  boosters: number;
  flags: string;
  driverName: string;
  driverPhone: string;
  vehicleNumber: string;
  status: string;
  sentAt?: string;
  etaLabel?: string;
  ownerName: string;
  sortOrder: number;
  passengers: SeedPax[];
};

function people(names: string[]): SeedPax[] {
  return names.map((name) => splitPerson(name));
}

function trip(input: Omit<SeedTrip, "postCode" | "flags" | "passengers"> & { names: string[]; flags?: string }): SeedTrip {
  const { names, flags, ...rest } = input;
  const extra = [
    rest.notes,
    rest.vehicleLabel,
    rest.carSeats ? `${rest.carSeats} car seat` : "",
    rest.boosters ? `${rest.boosters} booster` : "",
  ].join(" ");
  const derived = new Set<string>(["SATELLITE"]);
  if (/standby/i.test(extra)) derived.add("STANDBY");
  if (rest.carSeats > 0 || /car seat/i.test(extra)) derived.add("CAR_SEAT");
  if (rest.boosters > 0 || /booster/i.test(extra)) derived.add("BOOSTER");
  if (rest.airSide.toUpperCase() === "C") derived.add("TERMINAL_C");
  (flags ?? "").split(",").filter(Boolean).forEach((flag) => derived.add(flag));
  return {
    ...rest,
    postCode: postFromSide(rest.airSide),
    flags: [...derived].join(","),
    passengers: people(names),
  };
}

export const NBCU_TRIPS: SeedTrip[] = [
  trip({
    flightCode: "DL2049", origin: "JFK", scheduledTime: "10:15", airSide: "B1", vehicleLabel: "SUV", vendor: "BKA",
    notes: "", carSeats: 0, boosters: 0, driverName: "", driverPhone: "", vehicleNumber: "", status: "EXPECTED",
    ownerName: "Marissa", sortOrder: 10,
    names: ["Colleen Sands", "Michael O'Rourke", "Michaela O'Rourke", "Hugh O'Rourke", "Xavier O'Rourke"],
  }),
  trip({
    flightCode: "DL1580", origin: "BOS", scheduledTime: "10:28", airSide: "B1", vehicleLabel: "SUV", vendor: "Miguel",
    notes: "All 5 departed 11:05 AM.", carSeats: 0, boosters: 0, driverName: "Miguel", driverPhone: "", vehicleNumber: "",
    status: "SENT", sentAt: "2026-11-05T11:05:00-05:00", etaLabel: "11:30 AM", ownerName: "Marissa", sortOrder: 20,
    names: ["George Apjohn", "Allan Apjohn", "Emery Apjohn", "Erin Apjohn", "Greysen Hauben"],
  }),
  trip({
    flightCode: "DL1511", origin: "LGA", scheduledTime: "11:05", airSide: "B1", vehicleLabel: "SUV", vendor: "Home James",
    notes: "1 car seat", carSeats: 1, boosters: 0, driverName: "", driverPhone: "", vehicleNumber: "", status: "EXPECTED",
    ownerName: "Marissa", sortOrder: 30,
    names: ["Lochlan McConville", "Ryan McConville", "Yuuki McConville", "Amy Ogawa"],
  }),
  trip({
    flightCode: "DL1511", origin: "LGA", scheduledTime: "11:05", airSide: "B1", vehicleLabel: "SUV", vendor: "Bravo",
    notes: "2 booster seats", carSeats: 0, boosters: 2, driverName: "", driverPhone: "", vehicleNumber: "", status: "EXPECTED",
    ownerName: "Marissa", sortOrder: 40,
    names: ["Daniela Mullady", "Tomas Almonte", "Juliette Almonte", "Emilia Almonte"],
  }),
  trip({
    flightCode: "DL1511", origin: "LGA", scheduledTime: "11:05", airSide: "B1", vehicleLabel: "Sprinter", vendor: "Bravo",
    notes: "Fox and Mann. Sprinter 1.", carSeats: 0, boosters: 0, driverName: "Elyor", driverPhone: "407-408-1141",
    vehicleNumber: "1", status: "SENT", sentAt: "2026-11-05T11:40:00-05:00", etaLabel: "12:05 PM", ownerName: "Aaron", sortOrder: 50,
    names: ["Arabella Fox", "Daniel Fox", "Oliver Fox", "Sienna Fox", "Nichola Mann"],
  }),
  trip({
    flightCode: "DL1511", origin: "LGA", scheduledTime: "11:05", airSide: "B1", vehicleLabel: "Sprinter", vendor: "Bravo",
    notes: "Cuevas, Rolli, Raphael, Shepard. Sprinter 2.", carSeats: 0, boosters: 0, driverName: "Gustavo", driverPhone: "407-758-8447",
    vehicleNumber: "2", status: "SENT", sentAt: "2026-11-05T11:40:00-05:00", etaLabel: "12:05 PM", ownerName: "Aaron", sortOrder: 60,
    names: ["Perla Cuevas", "Chiara Rolli", "Dan Rolli", "Lola Rolli", "Adam Raphael", "Sophie Raphael", "Kristina Shepard"],
  }),
  trip({
    flightCode: "UA486", origin: "EWR", scheduledTime: "11:57", airSide: "B2", vehicleLabel: "Sprinter", vendor: "BKA",
    notes: "Megan Barr crossed out. BKA replaces Home James.", carSeats: 0, boosters: 0, driverName: "Marcelo",
    driverPhone: "386-956-2901", vehicleNumber: "", status: "EXPECTED", ownerName: "Aaron", sortOrder: 70,
    names: ["Katie Klein", "Eli Weinreich", "Oliver Weinreich", "Jordan Weinreich", "Jon Lefferts", "Bethany Lefferts", "Cooper Lefferts", "Luke Lefferts"],
  }),
  trip({
    flightCode: "DL2019", origin: "JFK", scheduledTime: "12:44", airSide: "B1", vehicleLabel: "SUV", vendor: "BKA",
    notes: "", carSeats: 0, boosters: 0, driverName: "", driverPhone: "", vehicleNumber: "", status: "EXPECTED",
    ownerName: "Marissa", sortOrder: 80,
    names: ["Tim Hill", "Pamela Hill", "James Hill", "Jack Hill"],
  }),
  trip({
    flightCode: "UA1739", origin: "EWR", scheduledTime: "13:15", airSide: "B2", vehicleLabel: "SUV", vendor: "Bravo",
    notes: "Mark Griffin has another SUV.", carSeats: 0, boosters: 0, driverName: "", driverPhone: "", vehicleNumber: "",
    status: "EXPECTED", ownerName: "Aaron", sortOrder: 90,
    names: ["Mark Griffin"],
  }),
  trip({
    flightCode: "UA1739", origin: "EWR", scheduledTime: "13:15", airSide: "B2", vehicleLabel: "Sprinter", vendor: "Bravo",
    notes: "Brown-D'Angelo and D'Angelo. Second Salvatore row renamed to Jr. on the floor.", carSeats: 0, boosters: 0,
    driverName: "Elyor", driverPhone: "407-408-1141", vehicleNumber: "", status: "EXPECTED", ownerName: "Aaron", sortOrder: 100,
    names: ["Jessica Brown-D'Angelo", "Faith D'Angelo", "Salvatore D'Angelo", "Salvatore D'Angelo Jr."],
  }),
  trip({
    flightCode: "UA1739", origin: "EWR", scheduledTime: "13:15", airSide: "B2", vehicleLabel: "Sprinter", vendor: "Bravo",
    notes: "Taukus family.", carSeats: 0, boosters: 0, driverName: "Gustavo", driverPhone: "407-758-8447", vehicleNumber: "",
    status: "EXPECTED", ownerName: "Aaron", sortOrder: 110,
    names: ["Matthew Taukus", "Nicole Taukus", "Owen Taukus", "Reid Taukus"],
  }),
  trip({
    flightCode: "DL2564", origin: "LGA", scheduledTime: "14:47", airSide: "B1", vehicleLabel: "SUV", vendor: "Miguel",
    notes: "2 booster seats", carSeats: 0, boosters: 2, driverName: "", driverPhone: "", vehicleNumber: "", status: "EXPECTED",
    ownerName: "Marissa", sortOrder: 120,
    names: ["Alexa Levitt Brown", "Jason Brown", "Zoe Brown", "Noah Brown"],
  }),
  trip({
    flightCode: "DL2564", origin: "LGA", scheduledTime: "14:47", airSide: "B1", vehicleLabel: "Sprinter", vendor: "BKA",
    notes: "Abruzzino, Jalosky, Levine. Headcount was still open.", carSeats: 0, boosters: 0, driverName: "Marcelo",
    driverPhone: "386-956-2901", vehicleNumber: "", status: "EXPECTED", ownerName: "Aaron", sortOrder: 130,
    names: ["Melissa Abruzzino", "Christopher Abruzzino", "Grace Abruzzino", "Luke Abruzzino", "Alissa Jalosky", "Damon Levine", "Dustin Levine", "Skylar Levine", "Taylor Levine"],
  }),
  trip({
    flightCode: "DL482", origin: "LAX", scheduledTime: "15:25", airSide: "B1", vehicleLabel: "SUV", vendor: "Bravo",
    notes: "1 booster + 1 car seat", carSeats: 1, boosters: 1, driverName: "", driverPhone: "", vehicleNumber: "",
    status: "EXPECTED", ownerName: "Marissa", sortOrder: 140,
    names: ["Eileen Hung", "Joe Kim", "Jordan Kim", "Hayden Kim"],
  }),
  trip({
    flightCode: "DL482", origin: "LAX", scheduledTime: "15:25", airSide: "B1", vehicleLabel: "Standby SUV", vendor: "Jose",
    notes: "Standby SUV", carSeats: 0, boosters: 0, driverName: "", driverPhone: "", vehicleNumber: "", status: "EXPECTED",
    ownerName: "Marissa", sortOrder: 150,
    names: ["Leigh Anne Pavia Forbell"],
  }),
  trip({
    flightCode: "UA2008", origin: "ORD", scheduledTime: "15:20", airSide: "B2", vehicleLabel: "SUV", vendor: "Royal",
    notes: "", carSeats: 0, boosters: 0, driverName: "", driverPhone: "", vehicleNumber: "", status: "EXPECTED",
    ownerName: "Tammy", sortOrder: 160,
    names: ["Colin Cox", "Lindsey Cox", "Claire Cox", "Ryan Cox"],
  }),
  trip({
    flightCode: "UA2845", origin: "LAX", scheduledTime: "16:09", airSide: "B2", vehicleLabel: "SUV", vendor: "BKA",
    notes: "2 booster seats. All four sent with Ben.", carSeats: 0, boosters: 2, driverName: "Ben", driverPhone: "",
    vehicleNumber: "", status: "SENT", sentAt: "2026-11-05T16:34:00-05:00", etaLabel: "5:00-5:10 PM", ownerName: "Tammy", sortOrder: 170,
    names: ["Jen-Jen Heyl", "Jason Heyl", "James Heyl", "Julian Heyl"],
  }),
  trip({
    flightCode: "UA1997", origin: "SFO", scheduledTime: "16:54", airSide: "B2", vehicleLabel: "SUV", vendor: "Royal",
    notes: "Both passengers sent.", carSeats: 0, boosters: 0, driverName: "Galen", driverPhone: "", vehicleNumber: "",
    status: "SENT", sentAt: "2026-11-05T16:53:00-05:00", etaLabel: "5:20-5:30 PM", ownerName: "Tammy", sortOrder: 180,
    names: ["Philip Inghelbrecht", "Sahar Inghelbrecht"],
  }),
  trip({
    flightCode: "DL1996", origin: "JFK", scheduledTime: "18:14", airSide: "B1", vehicleLabel: "SUV", vendor: "Royal",
    notes: "", carSeats: 0, boosters: 0, driverName: "", driverPhone: "", vehicleNumber: "", status: "EXPECTED",
    ownerName: "Marissa", sortOrder: 190,
    names: ["Lina Lam", "Arvin Maala", "Liana Maala", "Layla Maala"],
  }),
  trip({
    flightCode: "UA1268", origin: "EWR", scheduledTime: "18:24", airSide: "B2", vehicleLabel: "SUV", vendor: "BKA",
    notes: "Jonathan appears twice on the manifest. Identities not confirmed.", carSeats: 0, boosters: 0,
    driverName: "", driverPhone: "", vehicleNumber: "", status: "EXPECTED", ownerName: "Tammy", sortOrder: 200,
    names: ["Kristin Hansell", "Jonathan Hansell", "Jonathan Hansell"],
  }),
  trip({
    flightCode: "AA977", origin: "ORD", scheduledTime: "19:56", airSide: "B2", vehicleLabel: "SUV", vendor: "Miguel",
    notes: "", carSeats: 0, boosters: 0, driverName: "", driverPhone: "", vehicleNumber: "", status: "EXPECTED",
    ownerName: "Tammy", sortOrder: 210,
    names: ["Luke Johnson", "Eric Johnson", "Eliza Johnson", "Zach Johnson", "Kristin Johnson"],
  }),
  trip({
    flightCode: "UA1900", origin: "EWR", scheduledTime: "20:17", airSide: "B2", vehicleLabel: "Sprinter", vendor: "Bravo",
    notes: "", carSeats: 0, boosters: 0, driverName: "", driverPhone: "", vehicleNumber: "", status: "EXPECTED",
    ownerName: "Aaron", sortOrder: 220,
    names: ["Luke Alvarez", "Michael Alvarez", "Christine Maria Cook", "Eric Barr", "Matthew Barr"],
  }),
  trip({
    flightCode: "DL2561", origin: "LGA", scheduledTime: "20:39", airSide: "B1", vehicleLabel: "2 Sprinters", vendor: "Home James / BKA",
    notes: "Crossed-out Dopsovic/Finnegan entries excluded. Vehicle split pending.", carSeats: 0, boosters: 0,
    driverName: "", driverPhone: "", vehicleNumber: "", status: "EXPECTED", ownerName: "Aaron", sortOrder: 230,
    names: ["Ava Jackson", "Gaye Jackson", "Kevin Jackson", "Logan Jackson", "Olivia Forbell", "Ryan Forbell", "Sophia Forbell", "Michael Reidy", "Norman Reidy", "Kathryn Reidy", "Bea Small", "Jonathan Small", "Katie Small", "May Small"],
  }),
  trip({
    flightCode: "UA2294", origin: "ORD", scheduledTime: "21:37", airSide: "B2", vehicleLabel: "SUV", vendor: "Miguel",
    notes: "", carSeats: 0, boosters: 0, driverName: "", driverPhone: "", vehicleNumber: "", status: "EXPECTED",
    ownerName: "Tammy", sortOrder: 240,
    names: ["Leonard Gousse", "Pierre Gousse", "Josephine Gousse", "Maio Martin"],
  }),
  trip({
    flightCode: "UA1377", origin: "EWR", scheduledTime: "09:57", airSide: "B2", vehicleLabel: "SUV", vendor: "BKA",
    notes: "", carSeats: 0, boosters: 0, driverName: "", driverPhone: "", vehicleNumber: "", status: "EXPECTED",
    ownerName: "Tammy", sortOrder: 5,
    names: ["Alessia Casagrande", "Fabio Casagrande", "Luca Casagrande", "Samantha Casagrande"],
  }),
  trip({
    flightCode: "UA1643", origin: "ORD", scheduledTime: "13:01", airSide: "B2", vehicleLabel: "SUV", vendor: "Home James",
    notes: "1 booster seat", carSeats: 0, boosters: 1, driverName: "", driverPhone: "", vehicleNumber: "", status: "EXPECTED",
    ownerName: "Tammy", sortOrder: 75,
    names: ["Ada Griffin", "Rikki Griffin"],
  }),
];

export const NBCU_FLIGHTS = [
  { flightCode: "UA1377", status: "LANDED", actualAt: "09:33", scheduledAt: "09:57", estimatedAt: "", gate: "", baggage: "", source: "mco-note" },
  { flightCode: "DL2049", status: "LANDED", actualAt: "09:44", scheduledAt: "10:15", estimatedAt: "", gate: "", baggage: "", source: "mco-note" },
  { flightCode: "DL1580", status: "LANDED", actualAt: "10:22", scheduledAt: "10:28", estimatedAt: "", gate: "", baggage: "", source: "mco-note" },
  { flightCode: "DL1511", status: "LANDED", actualAt: "10:54", scheduledAt: "11:05", estimatedAt: "", gate: "", baggage: "", source: "mco-note" },
  { flightCode: "UA486", status: "LANDED", actualAt: "12:10", scheduledAt: "11:57", estimatedAt: "12:10", gate: "", baggage: "", source: "mco-note" },
  { flightCode: "DL2019", status: "LANDED", actualAt: "12:17", scheduledAt: "12:44", estimatedAt: "", gate: "", baggage: "", source: "mco-note" },
  { flightCode: "UA1739", status: "LANDED", actualAt: "12:56", scheduledAt: "13:15", estimatedAt: "", gate: "", baggage: "", source: "mco-note" },
  { flightCode: "UA1643", status: "LANDED", actualAt: "13:01", scheduledAt: "13:01", estimatedAt: "", gate: "", baggage: "", source: "mco-note" },
  { flightCode: "DL2564", status: "LANDED", actualAt: "14:24", scheduledAt: "14:47", estimatedAt: "", gate: "", baggage: "", source: "mco-note" },
  { flightCode: "DL482", status: "LANDED", actualAt: "14:52", scheduledAt: "15:25", estimatedAt: "", gate: "", baggage: "", source: "mco-note" },
  { flightCode: "UA2008", status: "LANDED", actualAt: "15:15", scheduledAt: "15:20", estimatedAt: "", gate: "", baggage: "", source: "mco-note" },
  { flightCode: "UA2845", status: "LANDED", actualAt: "15:47", scheduledAt: "16:09", estimatedAt: "", gate: "", baggage: "", source: "mco-note" },
  { flightCode: "UA1997", status: "ON_TIME", actualAt: "", scheduledAt: "16:54", estimatedAt: "16:17", gate: "", baggage: "", source: "mco-note" },
  { flightCode: "DL1996", status: "ON_TIME", actualAt: "", scheduledAt: "18:14", estimatedAt: "17:39", gate: "72", baggage: "31", source: "mco-note" },
  { flightCode: "UA1268", status: "ON_TIME", actualAt: "", scheduledAt: "18:24", estimatedAt: "18:03", gate: "47", baggage: "22", source: "mco-note" },
  { flightCode: "AA977", status: "ON_TIME", actualAt: "", scheduledAt: "19:56", estimatedAt: "19:31", gate: "50", baggage: "24", source: "mco-note" },
  { flightCode: "UA1900", status: "DELAYED", actualAt: "", scheduledAt: "20:17", estimatedAt: "20:30", gate: "41", baggage: "23", source: "mco-note" },
  { flightCode: "DL2561", status: "ON_TIME", actualAt: "", scheduledAt: "20:39", estimatedAt: "20:23", gate: "82", baggage: "31", source: "mco-note" },
  { flightCode: "UA2294", status: "ON_TIME", actualAt: "", scheduledAt: "21:37", estimatedAt: "21:23", gate: "44", baggage: "20", source: "mco-note" },
];

export function nbcuPaxCount() {
  return NBCU_TRIPS.reduce((sum, trip) => sum + trip.passengers.length, 0);
}

export function nbcuFlightCount() {
  return new Set(NBCU_TRIPS.map((trip) => trip.flightCode)).size;
}

export function airlineOf(flightCode: string) {
  return airlineName(airlineCode(flightCode));
}
