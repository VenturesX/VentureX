import { airlineCode, airlineName, flagsFromText, normalizeFlight, postFor } from "@/lib/light/posts";

export type ManifestRow = {
  date: string;
  airline: string;
  flight: string;
  time: string;
  lastName: string;
  firstName: string;
  origin: string;
  airSide: string;
  vehicle: string;
  notes: string;
  carSeats: string;
  cell: string;
  vendor: string;
};

export type DraftPax = {
  firstName: string;
  lastName: string;
  cell: string;
  notes: string;
};

export type DraftTrip = {
  flightCode: string;
  airline: string;
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
  passengers: DraftPax[];
};

const HEADER_MAP: Record<string, keyof ManifestRow> = {
  date: "date",
  airline: "airline",
  flight: "flight",
  flightnumber: "flight",
  flt: "flight",
  time: "time",
  arrival: "time",
  lastname: "lastName",
  last: "lastName",
  firstname: "firstName",
  first: "firstName",
  origin: "origin",
  from: "origin",
  airside: "airSide",
  side: "airSide",
  post: "airSide",
  vehicle: "vehicle",
  veh: "vehicle",
  notes: "notes",
  note: "notes",
  comments: "notes",
  comment: "notes",
  carseats: "carSeats",
  carseat: "carSeats",
  seats: "carSeats",
  cell: "cell",
  phone: "cell",
  mobile: "cell",
  vendor: "vendor",
  company: "vendor",
};

export function emptyRow(): ManifestRow {
  return {
    date: "",
    airline: "",
    flight: "",
    time: "",
    lastName: "",
    firstName: "",
    origin: "",
    airSide: "",
    vehicle: "",
    notes: "",
    carSeats: "",
    cell: "",
    vendor: "",
  };
}

export function splitPerson(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().replace(/\s+/g, " ").split(" ").filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  const suffix = parts[parts.length - 1];
  if (/^(jr\.?|sr\.?|ii|iii|iv)$/i.test(suffix) && parts.length >= 3) {
    return { firstName: parts.slice(0, -2).join(" "), lastName: parts.slice(-2).join(" ") };
  }
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts[parts.length - 1] };
}

function headerKey(value: string): keyof ManifestRow | null {
  const compact = value.toLowerCase().replace(/[^a-z]/g, "");
  return HEADER_MAP[compact] ?? null;
}

function cleanTime(value: string): string {
  const match = value.trim().match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!match) return "";
  let hours = Number(match[1]);
  const minutes = match[2] ? Number(match[2]) : 0;
  const suffix = match[3]?.toLowerCase();
  if (suffix === "pm" && hours < 12) hours += 12;
  if (suffix === "am" && hours === 12) hours = 0;
  if (hours > 23 || minutes > 59) return "";
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function seatCounts(notes: string, carSeats: string): { carSeats: number; boosters: number } {
  const text = `${notes} ${carSeats}`.toLowerCase();
  const car = text.match(/(\d+)\s*car\s*seat/);
  const booster = text.match(/(\d+)\s*booster/);
  const numeric = carSeats.trim().match(/^\d+$/) ? Number(carSeats) : 0;
  return {
    carSeats: car ? Number(car[1]) : numeric,
    boosters: booster ? Number(booster[1]) : 0,
  };
}

export function rowsFromMatrix(matrix: string[][]): ManifestRow[] {
  const records = matrix.map((line) => line.map((cell) => String(cell ?? "").trim())).filter((line) => line.some(Boolean));
  if (records.length === 0) return [];
  const mapped = records[0].map((cell) => headerKey(cell));
  const hasHeader = mapped.filter(Boolean).length >= 3;
  const body = hasHeader ? records.slice(1) : records;
  return body.map((cells) => {
    const row = emptyRow();
    if (hasHeader) {
      cells.forEach((cell, index) => {
        const key = mapped[index];
        if (key) row[key] = cell;
      });
      if (!row.firstName && !row.lastName) {
        const nameIndex = records[0].findIndex((cell) => /passenger|name/i.test(cell) && !/first|last/i.test(cell));
        if (nameIndex >= 0 && cells[nameIndex]) {
          const person = splitPerson(cells[nameIndex]);
          row.firstName = person.firstName;
          row.lastName = person.lastName;
        }
      }
      return row;
    }
    row.flight = cells[0] ?? "";
    row.origin = cells[1] ?? "";
    row.time = cells[2] ?? "";
    row.airSide = cells[3] ?? "";
    row.vehicle = cells[4] ?? "";
    row.vendor = cells[5] ?? "";
    const person = splitPerson(cells[6] ?? "");
    row.firstName = person.firstName;
    row.lastName = person.lastName;
    row.notes = cells[7] ?? "";
    row.cell = cells[8] ?? "";
    return row;
  }).filter((row) => row.flight || row.lastName || row.firstName);
}

export function parseManifestText(text: string): ManifestRow[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const delimiter = lines[0].includes("\t") ? "\t" : lines[0].includes("|") ? "|" : ",";
  const matrix = lines.map((line) => splitDelimited(line, delimiter));
  return rowsFromMatrix(matrix);
}

function splitDelimited(line: string, delimiter: string): string[] {
  if (delimiter !== ",") return line.split(delimiter).map((cell) => cell.trim());
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (const char of line) {
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

export function groupManifestRows(
  rows: ManifestRow[],
  defaults: { airline: string; postCode: string }[],
): DraftTrip[] {
  const groups = new Map<string, DraftTrip>();
  rows.forEach((row, index) => {
    const flightCode = normalizeFlight(row.flight);
    if (!flightCode && !row.lastName && !row.firstName) return;
    const vehicle = row.vehicle.trim() || "SUV";
    const vendor = row.vendor.trim();
    const time = cleanTime(row.time);
    const key = [flightCode || `row-${index}`, vehicle.toLowerCase(), vendor.toLowerCase(), time].join("|");
    let trip = groups.get(key);
    const seats = seatCounts(row.notes, row.carSeats);
    if (!trip) {
      const airline = row.airline.trim() || airlineName(airlineCode(flightCode));
      const flags = flagsFromText({
        notes: row.notes,
        vehicle,
        airSide: row.airSide,
        carSeats: seats.carSeats,
        boosters: seats.boosters,
      });
      trip = {
        flightCode,
        airline,
        origin: row.origin.trim().toUpperCase(),
        scheduledTime: time,
        airSide: row.airSide.trim().toUpperCase(),
        postCode: postFor(row.airSide, flightCode, defaults),
        vehicleLabel: vehicle,
        vendor,
        notes: row.notes.trim(),
        carSeats: seats.carSeats,
        boosters: seats.boosters,
        flags: flags.join(","),
        passengers: [],
      };
      groups.set(key, trip);
    } else {
      trip.carSeats = Math.max(trip.carSeats, seats.carSeats);
      trip.boosters = Math.max(trip.boosters, seats.boosters);
      if (row.notes.trim() && !trip.notes.includes(row.notes.trim())) {
        trip.notes = [trip.notes, row.notes.trim()].filter(Boolean).join(" ");
      }
      const flags = new Set(trip.flags.split(",").filter(Boolean));
      flagsFromText({
        notes: trip.notes,
        vehicle: trip.vehicleLabel,
        airSide: trip.airSide,
        carSeats: trip.carSeats,
        boosters: trip.boosters,
      }).forEach((flag) => flags.add(flag));
      trip.flags = [...flags].join(",");
    }
    if (row.firstName || row.lastName) {
      trip.passengers.push({
        firstName: row.firstName.trim(),
        lastName: row.lastName.trim(),
        cell: row.cell.trim(),
        notes: "",
      });
    }
  });
  return [...groups.values()];
}
