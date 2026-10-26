import type { Metadata } from "next";
import { TripBoard } from "@/components/marketing/trip-board";

export const metadata: Metadata = {
  title: "Your trip — Venture Directors",
  description: "Pickup notes and the schedule for your group.",
};

export default async function TripPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <TripBoard token={token} />;
}
