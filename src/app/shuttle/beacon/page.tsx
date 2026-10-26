"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PUCK_IDS } from "@/lib/shuttle/route3";

export default function BeaconPage() {
  return (
    <div className="min-h-dvh bg-black px-4 py-6 text-white">
      <Suspense fallback={<p className="text-sm text-[#d5dbe6]">Opening the GPS beacon…</p>}>
        <BeaconForm />
      </Suspense>
    </div>
  );
}

function BeaconForm() {
  const params = useSearchParams();
  const initial = params.get("puck") ?? "R3-01";
  const [puckId, setPuckId] = useState(PUCK_IDS.includes(initial as (typeof PUCK_IDS)[number]) ? initial : "R3-01");
  const [sharing, setSharing] = useState(false);
  const [status, setStatus] = useState("Beacon is off.");
  const [point, setPoint] = useState("");

  useEffect(() => {
    if (!sharing || typeof navigator === "undefined" || !navigator.geolocation) return;
    const watch = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, heading, speed } = position.coords;
        setPoint(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        void fetch("/api/shuttle/beacon", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            puckId,
            lat: latitude,
            lng: longitude,
            heading,
            speedMps: speed,
          }),
        }).then((response) => {
          setStatus(response.ok ? `Sharing ${puckId}` : "The board did not take that point.");
        }).catch(() => setStatus("No connection. The phone is still watching GPS."));
      },
      () => setStatus("Location permission is off for this phone."),
      { enableHighAccuracy: true, maximumAge: 4000 },
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [sharing, puckId]);

  return (
    <div className="mx-auto max-w-lg space-y-4" data-testid="beacon-root">
      <Link href="/shuttle" className="text-[12px] font-semibold text-[#9ecbff]">Back to Route 3</Link>
      <h1 className="text-2xl font-semibold">GPS beacon</h1>
      <p className="text-sm text-[#d5dbe6]">
        This phone shares its location with the Route 3 board for the puck you pick. Stop sharing any time. It does not sign into EventFalcon.
      </p>
      <select value={puckId} onChange={(event) => setPuckId(event.target.value)} className="h-11 w-full rounded-xl border border-white/15 bg-black px-3" data-testid="beacon-puck">
        {PUCK_IDS.map((id) => <option key={id} value={id}>{id}</option>)}
      </select>
      <button
        type="button"
        data-testid="beacon-toggle"
        onClick={() => {
          setSharing((value) => !value);
          if (sharing) setStatus("Beacon stopped.");
        }}
        className="h-14 w-full rounded-2xl bg-gradient-to-r from-[#1E90FF] to-[#8B5CF6] text-lg font-semibold"
      >
        {sharing ? "Stop sharing" : "Start sharing"}
      </button>
      <p data-testid="beacon-status">{status}</p>
      {point ? <p className="font-mono text-sm">{point}</p> : null}
    </div>
  );
}
