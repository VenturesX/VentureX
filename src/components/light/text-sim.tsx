"use client";

import Link from "next/link";
import { useState } from "react";
import { field, offBtn, onBtn } from "@/components/light/styles";

type Line = { direction: "IN" | "OUT"; body: string };

const PHONES = ["+14075550111", "+14075550122", "+14075550133"];

export function TextSim() {
  const [phone, setPhone] = useState(PHONES[0]);
  const [text, setText] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [hotelToken, setHotelToken] = useState("");
  const [late, setLate] = useState("");

  async function send(body: string) {
    const outgoing = body.trim();
    if (!outgoing) return;
    setLines((current) => [...current, { direction: "IN", body: outgoing }]);
    setText("");
    const response = await fetch("/api/light/sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, text: outgoing }),
    });
    const json = (await response.json()) as { reply?: string; hotelToken?: string; error?: string };
    setLines((current) => [...current, { direction: "OUT", body: json.reply || json.error || "No reply" }]);
    if (json.hotelToken) setHotelToken(json.hotelToken);
    const board = await fetch("/api/light/board?code=NBCU").then((item) => item.json()) as { late?: { flights: number; pax: number } };
    if (board.late) setLate(`${board.late.flights} flights past close · ${board.late.pax} guests`);
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-3 px-3 py-3 text-white" data-testid="text-sim">
      <h1 className="text-2xl font-semibold">Text simulator</h1>
      <p className="text-sm text-[#d5dbe6]">Practice the bot before the number is live.</p>
      <label className="block text-sm">Phone
        <select className={`${field} mt-1`} value={phone} onChange={(event) => { setPhone(event.target.value); setLines([]); }}>
          {PHONES.map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>
      <div className="min-h-48 space-y-2 rounded-2xl bg-[#0c0e12] p-3" data-testid="text-thread">
        {lines.map((line, index) => (
          <p key={index} className={`whitespace-pre-wrap break-all rounded-xl px-3 py-2 text-sm ${line.direction === "IN" ? "bg-[#1E90FF]" : "bg-white/10"}`}>{line.body}</p>
        ))}
      </div>
      <div className="flex gap-1">
        <input className={field} aria-label="Text message" value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void send(text); }} />
        <button type="button" className={onBtn} data-testid="text-send" onClick={() => void send(text)}>Send</button>
      </div>
      <div className="grid grid-cols-2 gap-1">
        {["hello", "Aaron 4110", "YES", "B2", "good night", "Miguel 45"].map((sample) => (
          <button key={sample} type="button" className={offBtn} onClick={() => void send(sample)}>{sample}</button>
        ))}
      </div>
      {late ? <p className="rounded-xl border border-red-500 px-3 py-2 text-sm" data-testid="sim-late">{late}</p> : null}
      <div className="grid gap-1">
        <Link href="/light/NBCU" className={offBtn}>Open live board</Link>
        <Link href={hotelToken ? `/light/h/${hotelToken}` : "/light/h/nbcu-20"} className={onBtn} data-testid="sim-hotel">Hotel received</Link>
      </div>
    </div>
  );
}
