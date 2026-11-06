export type HotelDraft = {
  hotelLabel: string;
  driverName: string;
  vendor: string;
  vehicleLabel: string;
  vehicleNumber: string;
  flightCode: string;
  etaLabel: string;
  names: string[];
};

export function hotelMessage(input: HotelDraft): string {
  const driver = input.driverName.trim() || input.vendor.trim() || "Pending";
  const vehicle = [input.vehicleLabel.trim(), input.vehicleNumber.trim() ? `#${input.vehicleNumber.trim()}` : ""]
    .filter(Boolean)
    .join(" ");
  const lines = [
    `${input.hotelLabel.trim() || "HOTEL"} — EN ROUTE`,
    "",
    `Driver: ${driver}`,
    `Vehicle: ${vehicle || "Pending"}`,
    `Flight: ${input.flightCode}`,
    `Passengers: ${input.names.length}`,
    `Estimated arrival: ${input.etaLabel.trim() || "Pending"}`,
    "",
    ...input.names.map((name, index) => `${index + 1}. ${name}`),
  ];
  return lines.join("\n");
}

export function paxName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim();
}
