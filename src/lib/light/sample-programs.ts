import type { PrismaClient } from "@prisma/client";
import { hashAccessCodes } from "@/lib/crew-access";
import { todayET } from "@/lib/light/checkin";

const REV = "sample-jobs-4";

type Item = {
  title: string;
  kind: string;
  timeLabel?: string;
  sortKey?: string;
  summary?: string;
  detail?: string;
  spot?: string;
  route?: string;
  frequency?: string;
  flightCode?: string;
  guestVisible?: boolean;
};

type Staff = { name: string; role: string; post: string; shift: string; company: string; dayCode: string; phone: string };

type Spec = {
  code: string;
  aliases: string;
  name: string;
  city: string;
  jobKind: "SHUTTLE" | "AIRPORT" | "EVENT";
  hotels: string;
  hotelLabel: string;
  serviceDate: string;
  demoDate: string;
  demoTime: string;
  windowClose: string;
  timezone?: string;
  items: Item[];
  staff: Staff[];
  trips?: Array<{
    flightCode: string;
    origin: string;
    scheduledTime: string;
    airSide: string;
    postCode: string;
    vehicleLabel: string;
    notes?: string;
    passengers: Array<{ firstName: string; lastName: string }>;
  }>;
};

const LAST = "Last pickup from hotels is 60 minutes before the end time.";

function route(name: string, color: string, pickup: string, hotels: string, hours: string): Item {
  return {
    title: name,
    kind: "ROUTE",
    summary: color,
    spot: pickup,
    detail: `${hotels}\n${hours}\n${LAST}\nTransportation managed by TTS.`,
    frequency: hours,
    timeLabel: LAST,
    sortKey: name,
    guestVisible: true,
  };
}

function hotel(name: string, pickup: string, routeName: string, address: string): Item {
  return { title: name, kind: "HOTEL", summary: address, spot: pickup, route: routeName, guestVisible: true, sortKey: name };
}

const SATX_HOURS = "Sun 6/28 4:00 PM–10:00 PM every 30 min. Mon 6/29 6:00–10:30 AM every 15–20; 10:30 AM–4:30 PM every 30; 4:30 PM–event end every 15–20. Tue 6/30 and Wed 7/1 6:00–10:30 AM 15–20; 10:30 AM–3:30 PM 30; 3:30–6:30 PM 15–20. Thu 7/2 8:00 AM–1:00 PM 15–20; 1–3 PM 30; 3 PM–event end 15–20.";

const SATX: Spec = {
  code: "SATX26",
  aliases: "SATX26",
  name: "San Antonio Convention",
  city: "San Antonio",
  jobKind: "SHUTTLE",
  hotels: "Henry B. Gonzalez Convention Center",
  hotelLabel: "Henry B. Gonzalez Convention Center",
  serviceDate: "2026-06-28",
  demoDate: "2026-06-28",
  demoTime: "17:00",
  windowClose: "22:00",
  items: [
    route("R1 Red", "Red", "Outer lane or lobby, as marked for your hotel", "Drury Plaza Airport, Marriott Airport, and Doubletree Airport: Outer Lane, Lobby. Estancia del Norte: Lobby.", SATX_HOURS),
    route("R2 Blue", "Blue", "Outer lane, lobby, or Halm St. curbside", "Crowne Plaza Airport and Courtyard Airport: Outer Lane, Lobby. LaQuinta Airport: Curbside, Halm St.", SATX_HOURS),
    route("R3 Green", "Green", "Lobby, parking lot by the lobby, or Horizon Hill Blvd curbside", "Marriott Northwest Medical Center: parking lot next to lobby. Doubletree Northwest and Drury Northwest: Lobby. LaQuinta Medical Center: Curbside, Horizon Hill Blvd behind the hotel.", SATX_HOURS),
    route("R4 Purple", "Purple", "Richland Hills Dr. curbside or lobby", "Homewood Suites Sea World: Curbside, Richland Hills Dr. Holiday Inn Northwest Sea World: Lobby.", SATX_HOURS),
    route("R5 Orange", "Orange", "W Cesar E Chavez curbside or lobby outer lane", "Doubletree Downtown: Curbside, W Cesar E Chavez. Courtyard Downtown/Market Square: Outer Lane, Lobby.", SATX_HOURS),
    route("R6 Pink", "Pink", "Hotel curbside on the street named for your hotel", "Limited. The St. Anthony: Curbside, Navarro St. Hotel Indigo: Curbside, N St. Mary's. Emily Morgan: opposite curb on Ave E.", SATX_HOURS),
    route("R7 Yellow", "Yellow", "Soledad St. or the Embassy Suites curb", "Limited. Embassy Suites Riverwalk: Curbside, Soledad St. AC Hotel and Element Riverwalk: at Embassy Suites. Intercontinental Riverwalk: opposite curb, Pecan St.", SATX_HOURS),
    route("R8 Lime", "Lime", "N St. Mary's at Drury Inn & Suites", "Limited. Drury Inn & Suites: Curbside, N St. Mary's. Gunther, Valencia, Holiday Inn Riverwalk, Courtyard Riverwalk, Canopy, and Omni La Mansion: at Drury Inn & Suites.", SATX_HOURS),
    route("R9 Teal", "Teal", "The curb named for your hotel, or at The Westin", "Limited. Hyatt Place: Curbside, S St. Mary's. Riverwalk Plaza: Curbside, Dwyer Ave. Westin Riverwalk: Curbside, Market St. Hotel Contessa and Drury Plaza Riverwalk: at The Westin.", SATX_HOURS),
    hotel("Drury Plaza Airport", "Outer Lane, Lobby", "R1 Red", "Drury Plaza Airport"),
    hotel("Marriott Airport", "Outer Lane, Lobby", "R1 Red", "Marriott Airport"),
    hotel("Doubletree Airport", "Outer Lane, Lobby", "R1 Red", "Doubletree Airport"),
    hotel("Estancia del Norte", "Lobby", "R1 Red", "Estancia del Norte"),
    hotel("Crowne Plaza Airport", "Outer Lane, Lobby", "R2 Blue", "Crowne Plaza Airport"),
    hotel("Courtyard Airport", "Outer Lane, Lobby", "R2 Blue", "Courtyard Airport"),
    hotel("LaQuinta Airport", "Curbside, Halm St.", "R2 Blue", "LaQuinta Airport"),
    hotel("Marriott Northwest Medical Center", "Parking lot next to lobby", "R3 Green", "Marriott Northwest Medical Center"),
    hotel("Doubletree Northwest", "Lobby", "R3 Green", "Doubletree Northwest"),
    hotel("Drury Northwest", "Lobby", "R3 Green", "Drury Northwest"),
    hotel("LaQuinta Medical Center", "Curbside, Horizon Hill Blvd behind hotel", "R3 Green", "LaQuinta Medical Center"),
    hotel("Homewood Suites Sea World", "Curbside, Richland Hills Dr.", "R4 Purple", "Homewood Suites Sea World"),
    hotel("Holiday Inn Northwest Sea World", "Lobby", "R4 Purple", "Holiday Inn Northwest Sea World"),
    hotel("Doubletree Downtown", "Curbside, W Cesar E Chavez", "R5 Orange", "Doubletree Downtown"),
    hotel("Courtyard Downtown Market Square", "Outer Lane, Lobby", "R5 Orange", "Courtyard Downtown/Market Square"),
    hotel("The St. Anthony", "Curbside, Navarro St.", "R6 Pink", "The St. Anthony"),
    hotel("Hotel Indigo", "Curbside, N St. Mary's", "R6 Pink", "Hotel Indigo"),
    hotel("Emily Morgan", "Opposite curb on Ave E", "R6 Pink", "Emily Morgan"),
    hotel("Embassy Suites Riverwalk", "Curbside, Soledad St.", "R7 Yellow", "Embassy Suites Riverwalk"),
    hotel("AC Hotel and Element Riverwalk", "At Embassy Suites", "R7 Yellow", "AC Hotel & Element Riverwalk"),
    hotel("Intercontinental Riverwalk", "Opposite curb, Pecan St.", "R7 Yellow", "Intercontinental Riverwalk"),
    hotel("Drury Inn and Suites", "Curbside, N St. Mary's", "R8 Lime", "Drury Inn & Suites"),
    hotel("Westin Riverwalk", "Curbside, Market St.", "R9 Teal", "Westin Riverwalk"),
    hotel("Hyatt Place", "Curbside, S St. Mary's", "R9 Teal", "Hyatt Place"),
    { kind: "WAVE", title: "Knibbe Ranch Rodeo", timeLabel: "5:45–6:15 PM", sortKey: "17:45", summary: "Wednesday special. Loads from the Convention Center, return 9:00–9:30 PM from Knibbe Ranch.", spot: "Henry B. Gonzalez Convention Center", guestVisible: true },
    { kind: "TODAY", title: "Sunday service", timeLabel: "4:00 PM–10:00 PM", sortKey: "16:00", summary: "Every 30 minutes to the convention center.", spot: "Your hotel curb", guestVisible: true },
    { kind: "SHUTTLE", title: "Sunday loop", timeLabel: "4:00 PM", sortKey: "16:00", frequency: "Every 30 minutes", spot: "Your hotel curb", summary: "To the convention center", guestVisible: true },
    { kind: "NOTE", title: "Sunday report", timeLabel: "2:30 PM", summary: "Staff report 2:30 PM Sunday. A staffer at every loading location. Log all ridership. Breaks are staggered with your route partner. Monday expect full ridership for Opening Session 7–9 PM. Staff may ride in about 7 PM if the curbs are clear.", guestVisible: false, sortKey: "14:30" },
  ],
  staff: [
    { name: "Melissa Stephenson", role: "Lead", post: "SACC Lead", shift: "Sunday", company: "TTS", dayCode: "8801", phone: "+15550008801" },
    { name: "Aaron Molina", role: "Route", post: "Route 2 Crowne Plaza Airport", shift: "14:30–22:30", company: "TTS", dayCode: "8802", phone: "+15550008802" },
    { name: "Marissa Molina", role: "Route", post: "Route 2 La Quinta Airport", shift: "14:30–22:30", company: "TTS", dayCode: "8803", phone: "+15550008803" },
    { name: "Edgar Boswell", role: "Route", post: "Route 1 Drury Airport", shift: "Sunday", company: "TTS", dayCode: "8804", phone: "+15550008804" },
    { name: "Shay Lee Stamps", role: "Route", post: "Route 3 Marriott NW", shift: "Sunday", company: "TTS", dayCode: "8805", phone: "+15550008805" },
    { name: "Mike Doherty", role: "Route", post: "Route 7 Embassy Riverwalk", shift: "Sunday", company: "TTS", dayCode: "8806", phone: "+15550008806" },
  ],
};

function flight(code: string, time: string, sort: string, origin: string, terminal: string, spot: string): Item {
  return { kind: "FLIGHT", title: code, flightCode: code.replace(/\s/g, ""), timeLabel: time, sortKey: sort, summary: origin, route: terminal, spot, detail: "Check in with a team member at Level 1 Ground Transportation.\nThen go to the vehicle your host named.", guestVisible: true };
}

function depart(code: string, hotelTime: string, sort: string, terminal: string): Item {
  return { kind: "DEPART", title: code, flightCode: code.replace(/\s/g, ""), timeLabel: hotelTime, sortKey: sort, summary: terminal, spot: "Orlando World Center Marriott main entrance", route: "Leave the hotel at the time for your group's departure.", guestVisible: true };
}

const KB: Spec = {
  code: "KB426",
  aliases: "260502,KB426",
  name: "KB4-CON 2026",
  city: "Orlando",
  jobKind: "AIRPORT",
  hotels: "Orlando World Center Marriott",
  hotelLabel: "Orlando World Center Marriott",
  serviceDate: "2026-05-11",
  demoDate: "2026-05-11",
  demoTime: "14:00",
  windowClose: "22:30",
  items: [
    flight("WN 852", "8:15 PM", "20:15", "Las Vegas", "A2", "Level 1 Ground Transportation. A team member meets you there."),
    flight("LA 8186", "7:30 PM", "19:30", "Sao Paulo", "B1", "International arrivals, then Level 1 Ground Transportation."),
    flight("WN 3504", "11:35 AM", "11:35", "New Orleans", "A2", "Level 1 Ground Transportation."),
    flight("WN 3971", "1:15 PM", "13:15", "Providence", "A2", "Level 1 Ground Transportation."),
    depart("B6 494", "2:00 PM", "14:00", "Terminal C"),
    depart("UA 1268", "5:30 PM", "17:30", "Terminal B"),
    depart("UA 468", "4:30 AM", "04:30", "Terminal B"),
    depart("AA 599", "5:30 AM", "05:30", "Terminal B"),
    depart("UA 2065", "11:00 AM", "11:00", "Terminal B"),
    depart("WN 1139", "11:30 AM", "11:30", "Terminal A"),
    hotel("Orlando World Center Marriott", "Main entrance", "", "Orlando World Center Marriott"),
    { kind: "TODAY", title: "Arrivals day", timeLabel: "Monday", summary: "Meet the team at Level 1 Ground Transportation. Vehicles are SUV or sedan to the Marriott.", guestVisible: true, sortKey: "08:00" },
    { kind: "NOTE", title: "Monday sheet", summary: "Hotel drop is the main entrance. Transportation partner is Avalon. Vehicles are SUV and sedan.", guestVisible: false, sortKey: "08:00" },
  ],
  staff: [
    { name: "Aaron", role: "Lead", post: "Lead", shift: "08:00–22:30", company: "Avalon", dayCode: "2601", phone: "+15550002601" },
    { name: "Marissa", role: "Greeter", post: "Arrivals", shift: "08:00–22:30", company: "Avalon", dayCode: "2602", phone: "+15550002602" },
    { name: "Agnes Bonne", role: "Greeter", post: "Arrivals", shift: "09:00–18:00", company: "Avalon", dayCode: "2603", phone: "+15550002603" },
    { name: "Victoria Merkulova", role: "Greeter", post: "Arrivals", shift: "12:30–22:30", company: "Avalon", dayCode: "2604", phone: "+15550002604" },
    { name: "Donna Molina", role: "Greeter", post: "Arrivals", shift: "12:30–22:30", company: "Avalon", dayCode: "2605", phone: "+15550002605" },
    { name: "Joel Levine", role: "Greeter", post: "Terminal C", shift: "12:00–22:30", company: "Avalon", dayCode: "2606", phone: "+15550002606" },
    { name: "Paco Perez", role: "Greeter", post: "Arrivals", shift: "13:30–21:30", company: "Avalon", dayCode: "2607", phone: "+15550002607" },
  ],
  trips: [
    { flightCode: "WN852", origin: "LAS", scheduledTime: "20:15", airSide: "A2", postCode: "A_HIGH", vehicleLabel: "SUV", notes: "arrival", passengers: [{ firstName: "Beth", lastName: "Duke" }, { firstName: "Chelle", lastName: "Duke" }] },
    { flightCode: "LA8186", origin: "GRU", scheduledTime: "19:30", airSide: "B1", postCode: "B_HIGH", vehicleLabel: "Sedan", notes: "arrival", passengers: [{ firstName: "Rodrigo", lastName: "Larrabure" }] },
    { flightCode: "WN3504", origin: "MSY", scheduledTime: "11:35", airSide: "A2", postCode: "A_HIGH", vehicleLabel: "SUV", notes: "arrival", passengers: [{ firstName: "Theresa", lastName: "Vivirito" }, { firstName: "Gina", lastName: "Longstreth" }, { firstName: "Maddie", lastName: "Taliancich" }] },
    { flightCode: "WN3971", origin: "PVD", scheduledTime: "13:15", airSide: "A2", postCode: "A_HIGH", vehicleLabel: "Sedan", notes: "arrival", passengers: [{ firstName: "Dianne", lastName: "Adkins" }] },
    { flightCode: "B6494", origin: "MCO", scheduledTime: "16:34", airSide: "C", postCode: "C", vehicleLabel: "SUV", notes: "depart hotel 14:00", passengers: [{ firstName: "Minahan", lastName: "" }, { firstName: "Sheikh", lastName: "" }] },
    { flightCode: "UA1268", origin: "MCO", scheduledTime: "19:50", airSide: "B", postCode: "B_HIGH", vehicleLabel: "Sedan", notes: "depart hotel 17:30", passengers: [{ firstName: "Mehta", lastName: "" }] },
    { flightCode: "UA468", origin: "MCO", scheduledTime: "07:00", airSide: "B", postCode: "B_HIGH", vehicleLabel: "Sedan", notes: "depart hotel 04:30", passengers: [{ firstName: "Popper", lastName: "" }] },
    { flightCode: "AA599", origin: "MCO", scheduledTime: "08:03", airSide: "B", postCode: "B_HIGH", vehicleLabel: "Sedan", notes: "depart hotel 05:30", passengers: [{ firstName: "Sato", lastName: "" }] },
    { flightCode: "UA2065", origin: "MCO", scheduledTime: "13:40", airSide: "B", postCode: "B_HIGH", vehicleLabel: "SUV", notes: "depart hotel 11:00", passengers: [{ firstName: "Adams", lastName: "" }] },
    { flightCode: "WN1139", origin: "MCO", scheduledTime: "14:10", airSide: "A", postCode: "A_HIGH", vehicleLabel: "SUV", notes: "depart hotel 11:30", passengers: [{ firstName: "Guzman", lastName: "" }, { firstName: "Byrnes", lastName: "" }] },
  ],
};

const IFDA: Spec = {
  code: "IFDA26",
  aliases: "261033,IFDA26",
  name: "IFDA 2026",
  city: "Orlando",
  jobKind: "EVENT",
  hotels: "Disney's Coronado Springs",
  hotelLabel: "Disney's Coronado Springs",
  serviceDate: "2026-10-23",
  demoDate: "2026-10-23",
  demoTime: "06:30",
  windowClose: "16:00",
  items: [
    { kind: "WAVE", title: "Buses to Osceola Heritage Park", timeLabel: "7:00 AM", sortKey: "07:00", summary: "Buses to Osceola Heritage Park leave Coronado Springs Convention Entrance at 7:00 AM.", spot: "Coronado Springs Convention Entrance", detail: "11 buses, general attendees, about 585. Also 7:15.", guestVisible: true },
    { kind: "WAVE", title: "Judges, volunteers, and competitors", timeLabel: "5:30 AM", sortKey: "05:30", summary: "Early buses leave Coronado Springs Convention Entrance at 5:30 AM for Osceola Heritage Park.", spot: "Coronado Springs Convention Entrance", detail: "9 buses, about 456. Also 5:45.", guestVisible: true },
    { kind: "WAVE", title: "Port Orleans to the park", timeLabel: "5:30 AM", sortKey: "05:31", summary: "A mini bus leaves Port Orleans for Osceola Heritage Park at 5:30 AM.", spot: "Port Orleans", detail: "1 mini, about 18.", guestVisible: true },
    { kind: "WAVE", title: "Hilton Palace to the park", timeLabel: "5:30 AM", sortKey: "05:32", summary: "A mini bus leaves Hilton Orlando Lake Buena Vista Palace for Osceola Heritage Park at 5:30 AM.", spot: "Hilton Orlando Lake Buena Vista Palace", detail: "1 mini, about 4.", guestVisible: true },
    { kind: "WAVE", title: "Breakfast to Coronado Springs", timeLabel: "6:00 AM", sortKey: "06:00", summary: "Breakfast coaches leave Port Orleans and the Hilton Palace for Coronado Springs at 6:00 AM.", spot: "Your hotel lobby", detail: "1 motor from Port Orleans, about 53. 3 motors from the Hilton Palace, about 128.", guestVisible: true },
    { kind: "WAVE", title: "Overflow shuttle", timeLabel: "10:15 AM–4:00 PM", sortKey: "10:15", summary: "Overflow shuttle between Coronado Springs, Port Orleans, and the Hilton Palace every 30 minutes.", spot: "Hotel lobby", frequency: "Every 30 minutes", guestVisible: true },
    { kind: "NOTE", title: "Friday timeline", timeLabel: "4:30 AM", sortKey: "04:30", summary: "4:30 AM staff briefing. 5:15 AM vehicles stage. Destination is Silver Spurs Arena, 1901 Chief Osceola Trail, Kissimmee FL 34744.", detail: "Resources: 14 motor coaches, 1 transportation manager, 7 coordinators. Partner: Meeting Movers.", guestVisible: false },
    hotel("Disney's Coronado Springs", "Convention Entrance", "", "Disney's Coronado Springs"),
    hotel("Port Orleans", "Lobby", "", "Disney's Port Orleans"),
    hotel("Hilton Orlando Lake Buena Vista Palace", "Lobby", "", "Hilton Orlando Lake Buena Vista Palace"),
    { kind: "TODAY", title: "Friday transfer", timeLabel: "5:30 AM", summary: "Transfers to Osceola Heritage Park from Coronado Springs Convention Entrance.", guestVisible: true, sortKey: "05:30" },
    { kind: "SHUTTLE", title: "First wave", timeLabel: "5:30 AM", sortKey: "05:30", spot: "Coronado Springs Convention Entrance", frequency: "", guestVisible: true },
  ],
  staff: [
    { name: "Program lead", role: "Lead", post: "Coronado Springs", shift: "4:30 AM briefing", company: "Meeting Movers", dayCode: "1033", phone: "+15550001033" },
  ],
};

const SAMPLES = [SATX, KB, IFDA];

export async function ensureSamplePrograms(db: PrismaClient) {
  const today = todayET();
  for (const spec of SAMPLES) {
    let program = await db.lightProgram.findUnique({ where: { code: spec.code } });
    if (program && program.seedRevision !== REV) {
      await db.lightProgram.delete({ where: { id: program.id } });
      program = null;
    }
    if (!program) {
      program = await db.lightProgram.create({
        data: {
          name: spec.name,
          code: spec.code,
          aliases: spec.aliases,
          accessCodeHash: await hashAccessCodes([spec.code, ...spec.aliases.split(",")], true),
          city: spec.city,
          jobKind: spec.jobKind,
          hotels: spec.hotels,
          hotelLabel: spec.hotelLabel,
          serviceDate: spec.serviceDate,
          demoDate: spec.demoDate,
          demoTime: spec.demoTime,
          windowClose: spec.windowClose,
          timezone: spec.timezone || "America/New_York",
          status: "LIVE",
          seedRevision: REV,
          schedule: {
            create: [
              ...spec.items.map((item, index) => ({ ...item, sortKey: item.sortKey || String(index).padStart(2, "0"), guestVisible: item.guestVisible !== false })),
              ...spec.staff.map((person) => ({ kind: "STAFF", title: person.name, timeLabel: person.shift, summary: person.company, spot: person.role, route: person.post, guestVisible: false, sortKey: person.shift })),
            ],
          },
          roster: {
            create: spec.staff.map((person) => ({
              name: person.name,
              role: person.role,
              postCode: person.post,
              expectedPost: person.post,
              phone: person.phone,
              dayCode: person.dayCode,
              dayCodeDate: today,
              checkedInAt: new Date(),
            })),
          },
          trips: {
            create: (spec.trips || []).map((trip, index) => ({
              flightCode: trip.flightCode,
              origin: trip.origin,
              scheduledTime: trip.scheduledTime,
              airSide: trip.airSide,
              postCode: trip.postCode,
              vehicleLabel: trip.vehicleLabel,
              notes: trip.notes || "",
              vendor: "Avalon",
              sortOrder: index,
              passengers: { create: trip.passengers.map((pax, paxIndex) => ({ ...pax, sortOrder: paxIndex })) },
            })),
          },
          flights: {
            create: (spec.trips || []).map((trip) => ({
              flightCode: trip.flightCode,
              scheduledAt: trip.scheduledTime,
              terminal: trip.airSide,
              status: "SCHEDULED",
              source: "manual",
            })),
          },
        },
      });
    } else {
      await db.lightRoster.updateMany({
        where: { programId: program.id, dayCode: { not: "" } },
        data: { dayCodeDate: today, checkedOutAt: null },
      });
    }
  }
}
