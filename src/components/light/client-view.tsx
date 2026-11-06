"use client";

import { useEffect, useState } from "react";
import { displayFlight } from "@/lib/light/posts";

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
  if (!data) return <p className="p-4 text-sm text-white">Loading client view...</p>;
  return (
    <div className="mx-auto w-full max-w-lg space-y-3 px-3 py-3 text-white" data-testid="client-view">
      <h1 className="text-2xl font-semibold">{data.name}</h1>
      <p className="text-sm text-[#d5dbe6]">{data.hotels}</p>
      {data.showLateAlerts && data.late.flights > 0 ? <p className="rounded-xl border border-red-500 px-3 py-2 text-sm">{data.late.flights} flights past close</p> : null}
      {data.showLiveFlights ? (
        <ul className="space-y-1 text-sm">
          {data.flights.map((flight) => <li key={flight.flightCode}>{displayFlight(flight.flightCode)} · {flight.status}{flight.gate ? ` · Gate ${flight.gate}` : ""}</li>)}
        </ul>
      ) : null}
      {data.trips.map((trip) => (
        <article key={trip.id} className="rounded-2xl bg-[#0c0e12] p-3 text-sm">
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
