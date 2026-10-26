export type PlaceSuggestion = {
  id: string;
  name: string;
  address: string;
  label: string;
};

type LocalPlace = {
  id: string;
  name: string;
  address: string;
  area: string;
};

const LOCAL_PLACES: LocalPlace[] = [
  { id: "mco", name: "Orlando International Airport (MCO)", address: "1 Jeff Fuqua Boulevard, Orlando, FL 32827", area: "MCO airport" },
  { id: "mco-a", name: "Orlando International Airport (MCO), Terminal A", address: "1 Jeff Fuqua Boulevard, Orlando, FL 32827", area: "MCO airport" },
  { id: "mco-b", name: "Orlando International Airport (MCO), Terminal B", address: "1 Jeff Fuqua Boulevard, Orlando, FL 32827", area: "MCO airport" },
  { id: "mco-c", name: "Orlando International Airport (MCO), Terminal C", address: "1 Jeff Fuqua Boulevard, Orlando, FL 32827", area: "MCO airport" },
  { id: "occc-west", name: "Orange County Convention Center, West Concourse", address: "9800 International Drive, Orlando, FL 32819", area: "Convention Center International Drive" },
  { id: "occc-south", name: "Orange County Convention Center, South Concourse", address: "9899 International Drive, Orlando, FL 32819", area: "Convention Center International Drive" },
  { id: "occc-north", name: "Orange County Convention Center, North Concourse", address: "9400 Universal Boulevard, Orlando, FL 32819", area: "Convention Center Universal" },

  { id: "hyatt-regency-orlando", name: "Hyatt Regency Orlando", address: "9801 International Drive, Orlando, FL 32819", area: "International Drive Convention Center" },
  { id: "rosen-centre", name: "Rosen Centre Hotel", address: "9840 International Drive, Orlando, FL 32819", area: "International Drive Convention Center" },
  { id: "rosen-plaza", name: "Rosen Plaza Hotel", address: "9700 International Drive, Orlando, FL 32819", area: "International Drive Convention Center" },
  { id: "hilton-orlando", name: "Hilton Orlando", address: "6001 Destination Parkway, Orlando, FL 32819", area: "International Drive Convention Center" },
  { id: "rosen-shingle-creek", name: "Rosen Shingle Creek", address: "9939 Universal Boulevard, Orlando, FL 32819", area: "International Drive Convention Center" },
  { id: "rosen-inn-international", name: "Rosen Inn International", address: "7600 International Drive, Orlando, FL 32819", area: "International Drive" },
  { id: "rosen-inn-pointe", name: "Rosen Inn at Pointe Orlando", address: "9000 International Drive, Orlando, FL 32819", area: "International Drive" },
  { id: "doubletree-seaworld", name: "DoubleTree by Hilton Orlando at SeaWorld", address: "10100 International Drive, Orlando, FL 32821", area: "International Drive SeaWorld" },
  { id: "renaissance-seaworld", name: "Renaissance Orlando at SeaWorld", address: "6677 Sea Harbor Drive, Orlando, FL 32821", area: "International Drive SeaWorld" },
  { id: "jw-grande-lakes", name: "JW Marriott Orlando Grande Lakes", address: "4040 Central Florida Parkway, Orlando, FL 32837", area: "International Drive" },
  { id: "ritz-grande-lakes", name: "The Ritz-Carlton Orlando, Grande Lakes", address: "4012 Central Florida Parkway, Orlando, FL 32837", area: "International Drive" },
  { id: "world-center", name: "Orlando World Center Marriott", address: "8701 World Center Drive, Orlando, FL 32821", area: "Convention Center" },
  { id: "gaylord-palms", name: "Gaylord Palms Resort & Convention Center", address: "6000 West Osceola Parkway, Kissimmee, FL 34746", area: "Convention Center" },
  { id: "signia-bonnet", name: "Signia by Hilton Orlando Bonnet Creek", address: "14100 Bonnet Creek Resort Lane, Orlando, FL 32821", area: "Disney Lake Buena Vista" },
  { id: "waldorf-bonnet", name: "Waldorf Astoria Orlando", address: "14200 Bonnet Creek Resort Lane, Orlando, FL 32821", area: "Disney Lake Buena Vista" },

  { id: "hilton-lbv", name: "Hilton Orlando Lake Buena Vista", address: "1751 Hotel Plaza Boulevard, Lake Buena Vista, FL 32830", area: "Lake Buena Vista Disney Springs" },
  { id: "holiday-inn-lbv", name: "Holiday Inn Orlando — Disney Springs Area", address: "1805 Hotel Plaza Boulevard, Lake Buena Vista, FL 32830", area: "Lake Buena Vista Disney Springs" },
  { id: "wyndham-lbv", name: "Wyndham Lake Buena Vista", address: "1850 Hotel Plaza Boulevard, Lake Buena Vista, FL 32830", area: "Lake Buena Vista Disney Springs" },
  { id: "b-resort", name: "B Resort & Spa Lake Buena Vista", address: "1905 Hotel Plaza Boulevard, Lake Buena Vista, FL 32830", area: "Lake Buena Vista Disney Springs" },
  { id: "doubletree-lbv", name: "DoubleTree Suites by Hilton Orlando Disney Springs Area", address: "2305 Hotel Plaza Boulevard, Lake Buena Vista, FL 32830", area: "Lake Buena Vista Disney Springs" },
  { id: "buena-vista-palace", name: "Hilton Orlando Buena Vista Palace", address: "1900 East Buena Vista Drive, Lake Buena Vista, FL 32830", area: "Lake Buena Vista Disney Springs" },

  { id: "magic-kingdom", name: "Magic Kingdom Park", address: "1180 Seven Seas Drive, Lake Buena Vista, FL 32830", area: "Disney theme park" },
  { id: "epcot", name: "EPCOT", address: "200 Epcot Center Drive, Lake Buena Vista, FL 32830", area: "Disney theme park" },
  { id: "hollywood-studios", name: "Disney's Hollywood Studios", address: "351 South Studio Drive, Lake Buena Vista, FL 32830", area: "Disney theme park" },
  { id: "animal-kingdom", name: "Disney's Animal Kingdom Theme Park", address: "2901 Osceola Parkway, Bay Lake, FL 32830", area: "Disney theme park" },
  { id: "universal-studios", name: "Universal Studios Florida", address: "6000 Universal Boulevard, Orlando, FL 32819", area: "Universal theme park" },
  { id: "islands", name: "Universal Islands of Adventure", address: "6000 Universal Boulevard, Orlando, FL 32819", area: "Universal theme park" },
  { id: "seaworld", name: "SeaWorld Orlando", address: "7007 Sea World Drive, Orlando, FL 32821", area: "theme park International Drive" },

  { id: "grand-floridian", name: "Disney's Grand Floridian Resort & Spa", address: "4401 Floridian Way, Lake Buena Vista, FL 32830", area: "Disney" },
  { id: "contemporary", name: "Disney's Contemporary Resort", address: "4600 North World Drive, Lake Buena Vista, FL 32830", area: "Disney" },
  { id: "polynesian", name: "Disney's Polynesian Village Resort", address: "1600 Seven Seas Drive, Lake Buena Vista, FL 32830", area: "Disney" },
  { id: "yacht-club", name: "Disney's Yacht Club Resort", address: "1700 Epcot Resorts Boulevard, Lake Buena Vista, FL 32830", area: "Disney" },
  { id: "beach-club", name: "Disney's Beach Club Resort", address: "1800 Epcot Resorts Boulevard, Lake Buena Vista, FL 32830", area: "Disney" },
  { id: "boardwalk", name: "Disney's BoardWalk Inn", address: "2101 Epcot Resorts Boulevard, Lake Buena Vista, FL 32830", area: "Disney" },
  { id: "swan", name: "Walt Disney World Swan", address: "1200 Epcot Resorts Boulevard, Lake Buena Vista, FL 32830", area: "Disney" },
  { id: "dolphin", name: "Walt Disney World Dolphin", address: "1500 Epcot Resorts Boulevard, Lake Buena Vista, FL 32830", area: "Disney" },
  { id: "coronado", name: "Disney's Coronado Springs Resort", address: "1000 West Buena Vista Drive, Lake Buena Vista, FL 32830", area: "Disney" },
  { id: "ak-lodge", name: "Disney's Animal Kingdom Lodge", address: "2901 Osceola Parkway, Bay Lake, FL 32830", area: "Disney" },
  { id: "pop-century", name: "Disney's Pop Century Resort", address: "1050 Century Drive, Lake Buena Vista, FL 32830", area: "Disney" },
  { id: "art-of-animation", name: "Disney's Art of Animation Resort", address: "1850 Animation Way, Lake Buena Vista, FL 32830", area: "Disney" },
  { id: "caribbean-beach", name: "Disney's Caribbean Beach Resort", address: "900 Cayman Way, Lake Buena Vista, FL 32830", area: "Disney" },
  { id: "port-orleans-riverside", name: "Disney's Port Orleans Resort — Riverside", address: "1251 Riverside Drive, Lake Buena Vista, FL 32830", area: "Disney" },
  { id: "port-orleans-fq", name: "Disney's Port Orleans Resort — French Quarter", address: "2201 Orleans Drive, Lake Buena Vista, FL 32830", area: "Disney" },
  { id: "all-star-sports", name: "Disney's All-Star Sports Resort", address: "1701 West Buena Vista Drive, Lake Buena Vista, FL 32830", area: "Disney" },
  { id: "all-star-music", name: "Disney's All-Star Music Resort", address: "1801 West Buena Vista Drive, Lake Buena Vista, FL 32830", area: "Disney" },
  { id: "all-star-movies", name: "Disney's All-Star Movies Resort", address: "1901 West Buena Vista Drive, Lake Buena Vista, FL 32830", area: "Disney" },
  { id: "saratoga", name: "Disney's Saratoga Springs Resort & Spa", address: "1960 Broadway, Lake Buena Vista, FL 32830", area: "Disney" },
  { id: "old-key-west", name: "Disney's Old Key West Resort", address: "1510 North Cove Road, Lake Buena Vista, FL 32830", area: "Disney" },

  { id: "portofino", name: "Loews Portofino Bay Hotel at Universal Orlando", address: "5601 Universal Boulevard, Orlando, FL 32819", area: "Universal" },
  { id: "hard-rock", name: "Hard Rock Hotel at Universal Orlando", address: "5800 Universal Boulevard, Orlando, FL 32819", area: "Universal" },
  { id: "royal-pacific", name: "Loews Royal Pacific Resort at Universal Orlando", address: "6300 Hollywood Way, Orlando, FL 32819", area: "Universal" },
  { id: "cabana-bay", name: "Universal's Cabana Bay Beach Resort", address: "6550 Adventure Way, Orlando, FL 32819", area: "Universal" },
  { id: "aventura", name: "Universal's Aventura Hotel", address: "6725 Adventure Way, Orlando, FL 32819", area: "Universal" },
  { id: "surfside", name: "Universal's Endless Summer Resort — Surfside Inn and Suites", address: "7000 Universal Boulevard, Orlando, FL 32819", area: "Universal" },
  { id: "dockside", name: "Universal's Endless Summer Resort — Dockside Inn and Suites", address: "7125 Universal Boulevard, Orlando, FL 32819", area: "Universal" },
];

export async function suggestPlaces(query: string): Promise<PlaceSuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (key) {
    try {
      const remote = await googleSuggestions(q, key);
      if (remote.length > 0) return mergeSuggestions(remote, localSuggestions(q));
    } catch (error) {
      console.error("Google Places lookup failed; using the local Orlando list.");
      if (process.env.NODE_ENV === "development") console.error(error);
    }
  }
  return localSuggestions(q);
}

export function localSuggestions(query: string): PlaceSuggestion[] {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  return LOCAL_PLACES.filter((place) => {
    const haystack = `${place.name} ${place.address} ${place.area}`.toLowerCase();
    return tokens.every((token) => haystack.includes(token));
  })
    .slice(0, 8)
    .map(toSuggestion);
}

function toSuggestion(place: LocalPlace): PlaceSuggestion {
  return {
    id: place.id,
    name: place.name,
    address: place.address,
    label: `${place.name}, ${place.address}`,
  };
}

function mergeSuggestions(primary: PlaceSuggestion[], extra: PlaceSuggestion[]) {
  const seen = new Set(primary.map((place) => place.label.toLowerCase()));
  const merged = [...primary];
  for (const place of extra) {
    if (seen.has(place.label.toLowerCase())) continue;
    seen.add(place.label.toLowerCase());
    merged.push(place);
    if (merged.length >= 8) break;
  }
  return merged.slice(0, 8);
}

async function googleSuggestions(query: string, apiKey: string): Promise<PlaceSuggestion[]> {
  const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
    },
    body: JSON.stringify({
      input: query,
      includedRegionCodes: ["us"],
      locationBias: {
        circle: {
          center: { latitude: 28.45, longitude: -81.47 },
          radius: 40000,
        },
      },
    }),
    signal: AbortSignal.timeout(4000),
  });
  if (!response.ok) throw new Error(`Places lookup failed (${response.status})`);
  const json = (await response.json()) as {
    suggestions?: Array<{
      placePrediction?: {
        placeId?: string;
        text?: { text?: string };
        structuredFormat?: {
          mainText?: { text?: string };
          secondaryText?: { text?: string };
        };
      };
    }>;
  };
  return (json.suggestions ?? [])
    .map((item, index) => {
      const prediction = item.placePrediction;
      const name = prediction?.structuredFormat?.mainText?.text || prediction?.text?.text || "";
      const address = prediction?.structuredFormat?.secondaryText?.text || "";
      const label = address ? `${name}, ${address}` : prediction?.text?.text || name;
      if (!label) return null;
      return {
        id: prediction?.placeId || `google-${index}`,
        name: name || label,
        address,
        label,
      };
    })
    .filter((place): place is PlaceSuggestion => Boolean(place))
    .slice(0, 8);
}
