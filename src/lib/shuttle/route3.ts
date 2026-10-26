import type { PuckLink, RouteLeg, ShuttleDesk, ShuttleStop } from "./types";

export const EVENT_CODE = "831519";
export const FALCON_HOST = "eta-main.eventfalcon.com";

export const SUPERVISORS = [
  { name: "Auguste", role: "Route 3 Mgr", phone: "702-277-3669" },
  { name: "Jean Gautier", role: "OCCC Mgr", phone: "321-662-6170" },
  { name: "Evelyn Sim", role: "Transport Desk", phone: "720-550-9406" },
] as const;

export const PUCK_IDS = ["R3-01", "R3-02", "R3-03", "R3-04", "R3-05", "R3-06", "Stealth-01", "Stealth-02", "Stealth-03"] as const;

export const CURB_CHOICES = [
  { id: "occw", label: "OCCC West" },
  { id: "r3-s1", label: "Stop 1 · Donna · Residence Inn" },
  { id: "r3-s3", label: "Stop 3 · Aaron · Element" },
  { id: "r3-s4", label: "Stop 4 · Marissa · SpringHill" },
  { id: "uioa", label: "Chief's Night · Islands of Adventure" },
] as const;

const LOOP_LEGS: RouteLeg[] = [
  { from: "occw", to: "r3-s1", minutes: 7 },
  { from: "r3-s1", to: "r3-s2", minutes: 2 },
  { from: "r3-s2", to: "r3-s3", minutes: 4 },
  { from: "r3-s3", to: "r3-s4", minutes: 2 },
  { from: "r3-s4", to: "occw", minutes: 8 },
];

const NIGHT_LEGS: RouteLeg[] = [
  { from: "r3-s1", to: "r3-s2", minutes: 2 },
  { from: "r3-s2", to: "r3-s3", minutes: 4 },
  { from: "r3-s3", to: "r3-s4", minutes: 2 },
  { from: "r3-s4", to: "uioa", minutes: 18 },
  { from: "uioa", to: "r3-s1", minutes: 20 },
];

export function officialStops(): ShuttleStop[] {
  return [
    {
      id: "occw",
      code: "OCCC-W",
      name: "Orange County Convention Center (West Building)",
      address: "9800 International Dr, Orlando, FL 32819",
      lat: 28.424724,
      lng: -81.469196,
      boarding: "Hub · start and end of the Route 3 loop",
      staffName: "Jean Gautier",
      staffPhone: "321-662-6170",
      walkOvers: [],
      kind: "hub",
    },
    {
      id: "depot",
      code: "DEPOT",
      name: "OCCC West bus depot",
      address: "9800 International Dr, Orlando, FL 32819",
      lat: 28.428664,
      lng: -81.470196,
      boarding: "Staging yard for floaters",
      staffName: "",
      staffPhone: "",
      walkOvers: [],
      kind: "depot",
    },
    {
      id: "r3-s1",
      code: "R3-S1",
      name: "Residence Inn by Marriott Orlando at SeaWorld",
      address: "11000 Westwood Blvd, Orlando, FL 32821",
      lat: 28.405937,
      lng: -81.475356,
      boarding: "Boards at Main Entrance",
      staffName: "Donna Molina",
      staffPhone: "386-848-3148",
      walkOvers: [],
      kind: "stop",
    },
    {
      id: "r3-s2",
      code: "R3-S2",
      name: "Hilton Grand Vacations Club SeaWorld Orlando",
      address: "6924 Grand Vacations Way, Orlando, FL 32821",
      lat: 28.405978,
      lng: -81.471135,
      boarding: "Boards at I-Ride Trolley Stop G16 on Westwood Blvd outside the main gate",
      staffName: "",
      staffPhone: "",
      walkOvers: [],
      kind: "stop",
    },
    {
      id: "r3-s3",
      code: "R3-S3",
      name: "Element Orlando International Drive (at SeaWorld)",
      address: "5750 Central Florida Pkwy, Orlando, FL 32821",
      lat: 28.407203,
      lng: -81.454832,
      boarding: "Boards at Main Entrance",
      staffName: "Aaron Molina",
      staffPhone: "407-655-9795",
      walkOvers: [
        {
          name: "Aloft Orlando International Drive",
          address: "5730 Central Florida Pkwy",
          lat: 28.407307,
          lng: -81.454366,
        },
      ],
      kind: "stop",
    },
    {
      id: "r3-s4",
      code: "R3-S4",
      name: "SpringHill Suites by Marriott Orlando at SeaWorld",
      address: "10801 International Dr, Orlando, FL 32821",
      lat: 28.409047,
      lng: -81.454184,
      boarding: "Boards near Main Entrance",
      staffName: "Marissa Molina",
      staffPhone: "386-337-5515",
      walkOvers: [
        { name: "Fairfield Inn & Suites SeaWorld", address: "10815 International Dr" },
        { name: "TownePlace Suites SeaWorld", address: "10731 International Dr" },
        { name: "Homewood Suites Orlando Theme Parks", address: "6940 Westwood Blvd" },
      ],
      kind: "stop",
    },
    {
      id: "uioa",
      code: "UIOA",
      name: "Universal's Islands of Adventure (Chief's Night)",
      address: "6000 Universal Blvd, Orlando, FL 32819",
      lat: 28.480158,
      lng: -81.470037,
      boarding: "Monday Oct 26, 6:00 PM – 12:00 AM EDT",
      staffName: "",
      staffPhone: "",
      walkOvers: [],
      kind: "event",
    },
  ];
}

export function blankLinks(): PuckLink[] {
  const shifts = ["morning", "night"] as const;
  const links: PuckLink[] = [];
  for (const shift of shifts) {
    PUCK_IDS.forEach((puckId, index) => {
      const routePuck = index < 6;
      links.push({
        puckId,
        shift,
        shuttleNumber: routePuck ? `3-${index + 1}` : "",
        carrier: "",
        coachNumber: "",
        driver: "",
        phone: "",
        checkIn: "",
        release: "",
        breakText: "",
      });
    });
  }
  return links;
}

export function defaultDesk(): ShuttleDesk {
  return {
    mode: "loop",
    eventCode: EVENT_CODE,
    stops: officialStops(),
    loopOrder: ["occw", "r3-s1", "r3-s2", "r3-s3", "r3-s4"],
    nightOrder: ["r3-s1", "r3-s2", "r3-s3", "r3-s4", "uioa"],
    loopLegs: LOOP_LEGS,
    nightLegs: NIGHT_LEGS,
    links: blankLinks(),
    fixes: [],
    relays: [],
  };
}

export function stopIndexLabel(stop: ShuttleStop, order: string[]) {
  if (stop.kind === "depot") return "Yard";
  if (stop.kind === "hub") return "Hub";
  if (stop.kind === "event") return "CN";
  const index = order.indexOf(stop.id);
  return index >= 0 ? String(index) : stop.code;
}
