"use client";

import { useEffect, useState } from "react";
import { displayFlight } from "@/lib/light/posts";
import { ScreenSkeleton } from "@/components/premium/skeleton";
import { SwipeCard, SwipeRow } from "@/components/premium/swipe-row";

type Client = {
  name: string;
  hotels: string;
  finalReportOnly: boolean;
  showLiveFlights: boolean;
  showLateAlerts: boolean;
  showHotelConfirm: boolean;
  late: { flights: number; pax: number };
  flights: { flightCode: string; status: string; gate: string; baggage: string }[];
  trips: {
    id: string;
    flightCode: string;
    vehicleLabel: string;
    driverName: string;
    sentAt: string | null;
    receivedAt: string | null;
    stage: string;
    expected: number;
    receivedCount: number | null;
    names: string[];
    etaLabel: string;
  }[];
};

export function ClientView({ code }: { code: string }) {
  const [data, setData] = useState<Client | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetch(`/api/light/client?code=${encodeURIComponent(code)}`).then(async (response) => {
        if (response.ok) setData((await response.json()) as Client);
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [code]);
  if (!data) return <ScreenSkeleton />;
  return (
    <div className="mx-auto w-full max-w-lg space-y-4 px-4 py-4 text-white" data-testid="client-view">
      <h1 className="text-3xl font-bold tracking-tight">{data.name}</h1>
      <p className="text-sm text-vd-muted">{data.hotels}</p>
      {data.trips.length ? (
        <SwipeRow title="Your trips">
          {data.trips.map((trip) => (
            <SwipeCard key={trip.id} kicker="Arrival" title={displayFlight(trip.flightCode)} time={trip.etaLabel || trip.stage} status={trip.stage} tone={trip.stage === "SENT" ? "green" : "accent"} />
          ))}
        </SwipeRow>
      ) : null}
      {data.showLateAlerts && data.late.flights > 0 ? <p className="rounded-xl border border-red-500 px-3 py-2 text-sm">{data.late.flights} flights past close</p> : null}
      {data.showLiveFlights ? (
        <ul className="space-y-1 text-sm">
          {data.flights.map((flight) => <li key={flight.flightCode}>{displayFlight(flight.flightCode)} · {flight.status}{flight.gate ? ` · Gate ${flight.gate}` : ""}</li>)}
        </ul>
      ) : null}
      {data.trips.map((trip) => (
        <article key={trip.id} className="rounded-card bg-vd-card p-4 text-sm ring-1 ring-white/10">
          <p className="font-semibold">{displayFlight(trip.flightCode)} · {trip.stage}</p>
          <p>{trip.vehicleLabel}{trip.driverName ? ` · ${trip.driverName}` : ""}{trip.etaLabel ? ` · ETA ${trip.etaLabel}` : ""}</p>
          {trip.sentAt ? <p>Sent {new Date(trip.sentAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</p> : null}
          {data.showHotelConfirm && trip.receivedAt ? <p>Received {trip.receivedCount} of {trip.expected}</p> : null}
          <ol className="mt-1 list-decimal pl-5">{trip.names.map((name) => <li key={name}>{name}</li>)}</ol>
        </article>
      ))}
      {data.finalReportOnly && data.trips.length === 0 ? <p className="text-sm">Final report is empty so far.</p> : null}
    </div>
  );
}
