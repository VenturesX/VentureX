import type { Metadata } from "next";
import { FieldChrome } from "@/components/field/field-chrome";
import { ShuttleBoard } from "@/components/shuttle/shuttle-board";

export const metadata: Metadata = {
  title: "Route 3 · Shuttle tracking",
  description: "Live Route 3 map, GPS pucks, and curb relay for IACP 2026.",
};

export default function ShuttlePage() {
  return (
    <div className="min-h-dvh bg-black text-white">
      <FieldChrome mode="shuttle" />
      <ShuttleBoard />
    </div>
  );
}
