import { Suspense } from "react";
import { FlightDesk } from "@/components/team/flight-desk";

export default function DispatchPage() {
  return (
    <Suspense fallback={<p className="p-6 text-white">Opening dispatch...</p>}>
      <FlightDesk mode="dispatch" />
    </Suspense>
  );
}