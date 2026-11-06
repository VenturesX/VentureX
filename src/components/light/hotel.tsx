"use client";

import { useEffect, useState } from "react";
import { field, onBtn } from "@/components/light/styles";

type Hotel = {
  message: string;
  expected: number;
  receivedCount: number | null;
  mismatch: boolean;
  names: string[];
};

export function HotelDesk({ token }: { token: string }) {
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [count, setCount] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetch(`/api/light/hotel?token=${encodeURIComponent(token)}`).then(async (response) => {
        if (!response.ok) return;
        const json = (await response.json()) as Hotel;
        setHotel(json);
        setCount(String(json.receivedCount ?? json.expected));
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [token]);

  async function receive() {
    const response = await fetch("/api/light/hotel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, count: Number(count) }),
    });
    const json = (await response.json()) as { mismatch?: boolean; expected?: number; error?: string };
    setNote(json.error || (json.mismatch ? `Count mismatch. Expected ${json.expected}.` : `Received ${count} of ${json.expected}.`));
    setHotel((current) => current ? { ...current, receivedCount: Number(count), mismatch: Boolean(json.mismatch) } : current);
  }

  if (!hotel) return <p className="p-4 text-sm text-white">Loading hotel desk...</p>;
  return (
    <div className="mx-auto w-full max-w-lg space-y-3 px-3 py-3 text-white" data-testid="hotel-desk">
      <h1 className="text-2xl font-semibold">Hotel desk</h1>
      <pre className="whitespace-pre-wrap rounded-2xl bg-[#0c0e12] p-3 text-sm">{hotel.message}</pre>
      <label className="block text-sm">Received count
        <input className={`${field} mt-1`} inputMode="numeric" aria-label="Received count" value={count} onChange={(event) => setCount(event.target.value)} />
      </label>
      <button type="button" className={`${onBtn} w-full`} data-testid="hotel-received" onClick={() => void receive()}>Received</button>
      {note ? <p className={`text-sm ${hotel.mismatch ? "text-red-300" : ""}`} data-testid="hotel-note">{note}</p> : null}
    </div>
  );
}
