export const ADD_RIDES = [
  { id: "theme", title: "Theme park", time: "Evening", status: "Request" },
  { id: "dinner", title: "Dinner", time: "Tonight", status: "Request" },
  { id: "gala", title: "Gala", time: "Late", status: "Request" },
  { id: "airport", title: "Airport", time: "Anytime", status: "Request" },
] as const;

export const ORLANDO_PICKS = [
  { title: "Park night", subtitle: "A later pickup after the parks", gradient: "linear-gradient(145deg, #1a3a6b 0%, #0b1c33 55%, #123 100%)" },
  { title: "Dinner hour", subtitle: "Restaurant row, curb to curb", gradient: "linear-gradient(160deg, #5a3a16 0%, #1c140c 60%, #2a1a10 100%)" },
  { title: "I-Drive evening", subtitle: "Hotels, venues, and the loop", gradient: "linear-gradient(150deg, #12382a 0%, #071610 55%, #0c241c 100%)" },
] as const;
