import type { Metadata } from "next";
import { GuestTrip } from "@/components/marketing/guest-trip";
import { siteUrl } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Your trip, live",
  description: "Open your program and see the moves that are posted for you.",
  alternates: { canonical: "/trip" },
  openGraph: { url: `${siteUrl()}/trip`, title: "Your trip, live" },
};

export default function TripPage() {
  return <GuestTrip />;
}
