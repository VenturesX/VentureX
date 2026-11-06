import { parseCommand, postFromChoice, roleFromChoice, titleName } from "@/lib/light/commands";
import { displayFlight, tripInTab } from "@/lib/light/posts";
import { addMinutes, clockLabel } from "@/lib/light/time";

export type TripSnap = {
  id: string;
  flightCode: string;
  origin: string;
  scheduledTime: string;
  postCode: string;
  vehicleLabel: string;
  vendor: string;
  driverName: string;
  status: string;
  pax: number;
  names: string[];
};

export type RosterSnap = {
  name: string;
  role: string;
  postCode: string;
  pending: string;
  lastTripId: string;
};

export type Decision = {
  reply: string;
  roster?: Partial<RosterSnap> & { phone?: string };
  createRoster?: boolean;
  tripUpdates?: Array<{ id: string; driverName?: string; reportedPax?: number; status?: string; etaLabel?: string }>;
  headsUp?: string;
  editAlert?: boolean;
  ping?: boolean;
};

type Input = {
  text: string;
  phone: string;
  programName: string;
  hotelShort: string;
  greetOffsetMin: number;
  link: string;
  roster: RosterSnap | null;
  trips: TripSnap[];
};

export function decideSms(input: Input): Decision {
  const command = parseCommand(input.text);
  const roster = input.roster;

  if (!roster || roster.pending === "code") {
    if (command.kind === "code" || command.kind === "name") {
      return {
        reply: `${input.programName}. What is your name?`,
        createRoster: !roster,
        roster: { pending: "name", phone: input.phone },
      };
    }
    return { reply: "Text the program code to join. Example: NBCU" };
  }

  if (roster.pending === "name" || !roster.name) {
    const name = titleName(input.text);
    if (name.length < 2) return { reply: "Reply with your name." };
    return {
      reply: `Thanks, ${name}. Your role?\n1 Greeter\n2 Dispatcher\n3 Loader\n4 Driver\n5 Lead`,
      roster: { name, pending: "role" },
    };
  }

  if (roster.pending === "role") {
    const role = command.kind === "role" ? command.role : command.kind === "choice" ? roleFromChoice(command.n) : "";
    const post = command.kind === "role" ? command.post : "";
    if (!role) return { reply: "Reply 1 to 5, or a role like Greeter." };
    if ((role === "greeter" || role === "loader") && !post) {
      return {
        reply: "Your post?\n1 A\n2 B High\n3 B Low\n4 C",
        roster: { role, pending: "post" },
      };
    }
    return joined(input, { ...roster, role, postCode: post || roster.postCode || "ALL", pending: "" });
  }

  if (roster.pending === "post") {
    const post = command.kind === "choice" ? postFromChoice(command.n) : command.kind === "role" ? command.post : "";
    if (!post) return { reply: "Reply 1 A, 2 B High, 3 B Low, or 4 C." };
    return joined(input, { ...roster, postCode: post, pending: "" });
  }

  if (roster.pending.startsWith("pick:") || roster.pending.startsWith("sent:")) {
    const markSent = roster.pending.startsWith("sent:");
    const ids = roster.pending.slice(roster.pending.indexOf(":") + 1).split(",").filter(Boolean);
    if (command.kind !== "choice") return { reply: "Reply with the trip number." };
    const trip = input.trips.find((item) => item.id === ids[command.n - 1]);
    if (!trip) return { reply: "That number is not on the list. Reply again." };
    const packed = readPack(roster.lastTripId);
    const count = packed.pax ?? trip.pax;
    const who = packed.driver || trip.driverName || trip.vendor;
    if (markSent) {
      const eta = etaLabel(trip, input.greetOffsetMin);
      return {
        reply: confirmLine(trip, who, count, eta, input.hotelShort),
        roster: { pending: "", lastTripId: trip.id },
        tripUpdates: [{ id: trip.id, driverName: who, reportedPax: count, status: "SENT", etaLabel: eta }],
        editAlert: true,
      };
    }
    return confirmAssign(input, roster, trip, count, who);
  }

  if (roster.pending === "edit") {
    const pax = command.kind === "edit" ? command.pax : command.kind === "choice" || command.kind === "assign" ? ("pax" in command ? command.pax : command.n) : command.kind === "unknown" && /^\d{1,3}$/.test(input.text.trim()) ? Number(input.text.trim()) : undefined;
    if (!pax) return { reply: "Reply the pax count to fix. Example: 46" };
    return applyEdit(input, roster, pax);
  }

  if (command.kind === "code" && roster.role) {
    return joined(input, roster);
  }

  if (command.kind === "edit") {
    if (command.pax) return applyEdit(input, roster, command.pax);
    return { reply: "What should the pax count be?", roster: { pending: "edit" } };
  }

  if (command.kind === "ok") {
    return { reply: "OK. You're on the list.", roster: { pending: "" } };
  }
  if (command.kind === "break") {
    return { reply: "On break. We'll skip you.", roster: { pending: "break" } };
  }
  if (command.kind === "headsup") {
    return { reply: `Dispatcher has it: ${command.body}`, headsUp: command.body, roster: { pending: "" } };
  }
  if (command.kind === "sent") {
    return applySent(input, roster, command.pax, command.flight, command.driver);
  }
  if (command.kind === "assign") {
    return applyAssign(input, roster, command.driver, command.pax);
  }

  return { reply: "Reply a driver and count, like Miguel 45. Or Sent 45 SW 1234 Miguel." };
}

function joined(input: Input, roster: RosterSnap): Decision {
  const view = roster.postCode === "ALL" ? "All" : roster.postCode.replace("_", " ").replace("HIGH", "High").replace("LOW", "Low");
  return {
    reply: `You're on the board as ${labelRole(roster.role)}. Start at ${view}. Open your link: ${input.link}`,
    roster: { name: roster.name, role: roster.role, postCode: roster.postCode, pending: "" },
  };
}

function labelRole(role: string) {
  return role ? role.charAt(0).toUpperCase() + role.slice(1) : "Staff";
}

function pack(pax?: number, driver?: string) {
  return `pax:${pax ?? ""}|driver:${driver ?? ""}`;
}

function readPack(value: string): { pax?: number; driver: string } {
  const pax = value.match(/pax:(\d+)/);
  const driver = value.match(/driver:([^|]*)/);
  return { pax: pax ? Number(pax[1]) : undefined, driver: driver?.[1] ?? "" };
}

function applyAssign(input: Input, roster: RosterSnap, driver: string, pax: number): Decision {
  const matches = matchingTrips(input, roster, driver, undefined);
  if (matches.length === 0) {
    return { reply: `No open ${driver} trip on your post. Reply the flight, like Sent ${pax} DL 2564 ${driver}.` };
  }
  if (matches.length > 1) {
    return {
      reply: choiceReply(matches),
      roster: { pending: `pick:${matches.map((trip) => trip.id).join(",")}`, lastTripId: pack(pax, driver) },
    };
  }
  return confirmAssign(input, roster, matches[0], pax, driver);
}

function applySent(input: Input, roster: RosterSnap, pax: number | undefined, flight: string | undefined, driver: string | undefined): Decision {
  const matches = matchingTrips(input, roster, driver, flight);
  if (matches.length === 0) return { reply: "No matching trip. Reply the flight and driver." };
  if (matches.length > 1) {
    return {
      reply: choiceReply(matches),
      roster: { pending: `sent:${matches.map((trip) => trip.id).join(",")}`, lastTripId: pack(pax, driver) },
    };
  }
  const trip = matches[0];
  const count = pax ?? trip.pax;
  const who = driver || trip.driverName || trip.vendor;
  const eta = etaLabel(trip, input.greetOffsetMin);
  return {
    reply: confirmLine(trip, who, count, eta, input.hotelShort),
    roster: { pending: "", lastTripId: trip.id },
    tripUpdates: [{ id: trip.id, driverName: who, reportedPax: count, status: "SENT", etaLabel: eta }],
    editAlert: true,
  };
}

function applyEdit(input: Input, roster: RosterSnap, pax: number): Decision {
  const trip = input.trips.find((item) => item.id === roster.lastTripId) ?? input.trips.find((item) => item.status === "SENT");
  if (!trip) return { reply: "No trip to edit yet. Send a driver and count first." };
  const eta = trip.status === "SENT" ? etaLabel(trip, input.greetOffsetMin) : "";
  return {
    reply: confirmLine(trip, trip.driverName || trip.vendor, pax, eta || clockLabel(addMinutes(trip.scheduledTime, input.greetOffsetMin)), input.hotelShort),
    roster: { pending: "", lastTripId: trip.id },
    tripUpdates: [{ id: trip.id, reportedPax: pax }],
    editAlert: true,
  };
}

function confirmAssign(input: Input, roster: RosterSnap, trip: TripSnap, pax: number, driver: string): Decision {
  const who = driver || trip.driverName || trip.vendor;
  const eta = clockLabel(addMinutes(trip.scheduledTime, input.greetOffsetMin));
  return {
    reply: confirmLine(trip, who, pax, eta, input.hotelShort),
    roster: { pending: "", lastTripId: trip.id, name: roster.name, role: roster.role, postCode: roster.postCode },
    tripUpdates: [{ id: trip.id, driverName: who, reportedPax: pax, etaLabel: eta }],
  };
}

export function confirmLine(trip: TripSnap, driver: string, pax: number, eta: string, hotel: string) {
  const vehicle = trip.vehicleLabel || "Vehicle";
  const clock = eta || "pending";
  return `Confirmed: ${vehicle}, ${driver}, ${pax} pax, ${displayFlight(trip.flightCode)} to ${hotel}, ETA ${clock}. Reply EDIT to fix.`;
}

function choiceReply(trips: TripSnap[]) {
  const lines = trips.slice(0, 5).map((trip, index) => `${index + 1} ${displayFlight(trip.flightCode)} ${clockLabel(trip.scheduledTime)}`);
  return `Which trip?\n${lines.join("\n")}`;
}

function matchingTrips(input: Input, roster: RosterSnap, driver: string | undefined, flight: string | undefined) {
  const open = input.trips.filter((trip) => trip.status !== "NO_SHOW" && trip.status !== "OWN_TRANSPORT");
  const postFiltered = roster.postCode && roster.postCode !== "ALL" ? open.filter((trip) => tripInTab(trip.postCode, roster.postCode)) : open;
  const pool = postFiltered.length > 0 ? postFiltered : open;
  return pool.filter((trip) => {
    if (flight && trip.flightCode !== flight) return false;
    if (driver && !namesMatch(driver, trip)) return false;
    if (!flight && trip.status === "SENT") return false;
    return true;
  });
}

function namesMatch(driver: string, trip: TripSnap) {
  const needle = driver.toLowerCase();
  return [trip.driverName, trip.vendor, ...trip.names].some((value) => value.toLowerCase().includes(needle));
}

function etaLabel(trip: TripSnap, offset: number) {
  return clockLabel(addMinutes(trip.scheduledTime, offset + 25));
}

export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (value.trim().startsWith("+") && digits.length > 8) return `+${digits}`;
  return value.trim();
}
