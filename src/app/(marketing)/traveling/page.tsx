import type { Metadata } from "next";
import { TravelingBoard } from "@/components/marketing/traveling-board";

export const metadata: Metadata = {
  title: "Traveling with us now — Venture Directors",
  description: "Pickup notes, schedule, and a way to ask the event team a question.",
};

export default function TravelingPage() {
  return <TravelingBoard />;
}
