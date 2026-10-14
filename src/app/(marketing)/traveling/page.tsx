import type { Metadata } from "next";
import { TripCodeForm } from "@/components/marketing/trip-code";

export const metadata: Metadata = {
  title: "Traveling with us now — Venture Directors",
  description: "Enter the event code from your planner to open your group's trip.",
};

export default function TravelingPage() {
  return <TripCodeForm />;
}
