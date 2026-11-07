import { Suspense } from "react";
import { FlightDesk } from "@/components/team/flight-desk";

export default function CrewClipboardPage() {
  return (
    <Suspense fallback={<p className="p-6 text-white">Opening the clipboard...</p>}>
      <FlightDesk mode="clipboard" />
    </Suspense>
  );
}
