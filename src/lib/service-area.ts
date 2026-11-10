import { OTHER_CITY, OTHER_FLORIDA_CITY } from "@/lib/brand";

export const QUOTE_MARKETS = ["Orlando", "Tampa", "Fort Myers", "Miami", "Jacksonville", "Daytona Beach", OTHER_FLORIDA_CITY, OTHER_CITY] as const;

export type QuoteMarket = (typeof QUOTE_MARKETS)[number];

const BANNED =
  /\b(anaheim|denver|colorado|california|disneyland|los angeles|dia\b|lax\b)\b/i;

const OTHER_STATE =
  /,\s*(AL|AK|AZ|AR|CA|CO|CT|DE|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\b|\b(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming)\b/i;

export const AREA_ERROR = "Florida is our home base. For locations outside Florida, we will confirm availability with you.";

export function requiresMarketCity(market: string): boolean {
  return market === OTHER_CITY || market === OTHER_FLORIDA_CITY;
}

export function isQuoteMarket(value: string): value is QuoteMarket {
  return (QUOTE_MARKETS as readonly string[]).includes(value);
}

export function outOfAreaMessage(place: string): string | null {
  const value = place.trim();
  if (!value) return null;
  if (BANNED.test(value)) return AREA_ERROR;
  const state = value.match(OTHER_STATE);
  if (!state) return null;
  const token = (state[1] || state[2] || "").toUpperCase();
  if (token === "FL" || token === "FLORIDA") return null;
  return AREA_ERROR;
}

const AREA_HINTS = [
  "tampa",
  "fort myers",
  "miami",
  "jacksonville",
  "southwest florida international",
  "orlando",
  "kissimmee",
  "lake buena vista",
  "bay lake",
  "celebration",
  "winter park",
  "winter garden",
  "windermere",
  "ocoee",
  "clermont",
  "davenport",
  "four corners",
  "championsgate",
  "reunion",
  "haines city",
  "poinciana",
  "st. cloud",
  "saint cloud",
  "sanford",
  "lake mary",
  "altamonte",
  "maitland",
  "apopka",
  "oviedo",
  "casselberry",
  "longwood",
  "heathrow",
  "doctor phillips",
  "daytona",
  "daytona beach",
  "cape canaveral",
  "port canaveral",
  "cocoa",
  "merritt island",
  "titusville",
  "rockledge",
  "viera",
  "international drive",
  "universal",
  "disney",
  "seaworld",
  "mco",
  "orange county",
  "osceola",
  "seminole",
  "brevard",
  "central florida",
];

export function isServiceAreaLabel(label: string): boolean {
  const value = label.toLowerCase();
  if (BANNED.test(value) && !value.includes("florida") && !/\bfl\b/.test(value)) return false;
  if (outOfAreaMessage(label)) return false;
  if (/\bfl\b|\bflorida\b/i.test(value)) return true;
  return AREA_HINTS.some((hint) => value.includes(hint));
}
