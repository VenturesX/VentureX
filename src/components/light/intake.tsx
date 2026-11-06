"use client";

import Link from "next/link";
import { useState } from "react";
import type { ManifestRow } from "@/lib/light/parse-manifest";
import { card, field, offBtn, onBtn } from "@/components/light/styles";

const SAMPLE = `Date,Airline,Flight,Time,Last Name,First Name,Origin,Air Side,Vehicle,Notes,Car Seats,Cell,Vendor
2026-11-05,Delta,DL1580,10:28 AM,Apjohn,George,BOS,B1,SUV,,0,,Miguel
2026-11-05,Delta,DL1580,10:28 AM,Hauben,Greysen,BOS,B1,SUV,,0,,Miguel`;

const COLUMNS: { key: keyof ManifestRow; label: string }[] = [
  { key: "date", label: "Date" },
  { key: "airline", label: "Airline" },
  { key: "flight", label: "Flight" },
  { key: "time", label: "Time" },
  { key: "lastName", label: "Last" },
  { key: "firstName", label: "First" },
  { key: "origin", label: "Origin" },
  { key: "airSide", label: "Air side" },
  { key: "vehicle", label: "Vehicle" },
  { key: "notes", label: "Notes" },
  { key: "carSeats", label: "Seats" },
  { key: "cell", label: "Cell" },
  { key: "vendor", label: "Vendor" },
];

export function LightIntake({ code }: { code: string }) {
  const [text, setText] = useState("");
  const [rows, setRows] = useState<ManifestRow[]>([]);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState("");

  async function parseText() {
    const response = await fetch("/api/light/intake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const json = (await response.json()) as { rows: ManifestRow[]; note?: string };
    setRows(json.rows);
    setNote(json.note || `${json.rows.length} rows`);
  }

  async function onFile(file: File) {
    const body = new FormData();
    body.set("file", file);
    const response = await fetch("/api/light/intake", { method: "POST", body });
    const json = (await response.json()) as { rows?: ManifestRow[]; note?: string; error?: string };
    setRows(json.rows || []);
    setNote(json.note || json.error || `${json.rows?.length ?? 0} rows`);
  }

  async function publish() {
    const response = await fetch("/api/light/intake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publish: true, code, rows }),
    });
    const json = (await response.json()) as { parties?: number; error?: string };
    setSaved(json.error || `Published ${json.parties} parties`);
  }

  function edit(index: number, key: keyof ManifestRow, value: string) {
    setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)));
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-3 px-3 py-3 text-white" data-testid="light-intake">
      <Link href={`/light/${code}`} className="text-sm text-[#9ecbff]">Back to board</Link>
      <h1 className="text-2xl font-semibold">Manifest intake</h1>
      <p className="text-sm text-[#d5dbe6]">Upload a file or paste the sheet. Review every row, then publish.</p>
      <textarea className={`${field} min-h-28 py-2`} aria-label="Paste manifest" value={text} onChange={(event) => setText(event.target.value)} placeholder="Paste CSV or rows" />
      <div className="grid grid-cols-2 gap-1">
        <button type="button" className={offBtn} onClick={() => { setText(SAMPLE); }}>Sample rows</button>
        <button type="button" className={onBtn} onClick={() => void parseText()}>Read paste</button>
      </div>
      <label className={`${offBtn} w-full`}>
        Upload file
        <input className="sr-only" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.csv,.xlsx,.xls,image/*" onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void onFile(file);
        }} />
      </label>
      {note ? <p className="text-sm">{note}</p> : null}
      {rows.length > 0 ? (
        <div className={`${card} overflow-x-auto`} data-testid="review-grid">
          <table className="min-w-[760px] text-left text-xs">
            <thead>
              <tr>{COLUMNS.map((column) => <th key={column.key} className="px-1 py-2">{column.label}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index}>
                  {COLUMNS.map((column) => (
                    <td key={column.key} className="px-1 py-1">
                      <input className="h-11 w-24 rounded-lg border border-white/10 bg-black px-2" aria-label={`${column.label} ${index + 1}`} value={row[column.key]} onChange={(event) => edit(index, column.key, event.target.value)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className={`${onBtn} mt-3 w-full`} onClick={() => void publish()}>Publish board</button>
          {saved ? <p className="mt-2 text-sm">{saved}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
