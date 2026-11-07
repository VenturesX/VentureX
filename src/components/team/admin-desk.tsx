"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TextSim } from "@/components/light/text-sim";
import { AdminOffice } from "@/components/team/admin-office";
import { AdminQuotes } from "@/components/team/admin-quotes";

type Report = {
  program: { name: string; code: string; showLateAlerts: boolean; showHotelConfirm: boolean; finalReportOnly: boolean };
  moved: { arrivals: number; pax: number; vehicles: number };
  staff: { name: string; post: string; in: string; out: string; hours: string }[];
  notes: { actor: string; action: string; detail: string; at: string }[];
  sheet: { time: string; flight: string; post: string; vehicle: string; count: number; names: string; notes: string }[];
};

const LEVELS = ["Owner", "Lead", "Client"] as const;

export function AdminDesk() {
  const [level, setLevel] = useState<(typeof LEVELS)[number] | "">("");
  const [locked, setLocked] = useState(false);
  const [panel, setPanel] = useState<"desk" | "quotes" | "setup">("desk");
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    void fetch("/api/team/session").then(async (response) => {
      const json = (await response.json()) as { signedIn?: { kind?: string } };
      if (json.signedIn?.kind === "client") {
        setLevel("Client");
        setLocked(true);
        return;
      }
      setLevel("Owner");
    });
  }, []);

  useEffect(() => {
    if (!level) return;
    const timer = window.setTimeout(() => {
      void fetch("/api/team/report").then(async (response) => {
        if (response.ok) setReport((await response.json()) as Report);
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [level]);

  if (!level) {
    return <p className="p-6 text-white">Opening…</p>;
  }

  const clientLimited = level === "Client";
  const showStaff = !clientLimited && !report?.program.finalReportOnly;
  const showNotes = !clientLimited && report?.program.showLateAlerts !== false;

  function csv() {
    if (!report) return;
    const rows = [["Name", "Position", "Check in", "Check out", "Hours"], ...report.staff.map((row) => [row.name, row.post, row.in, row.out, row.hours])];
    const file = new Blob([rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = "nbcu-timesheet.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-5 py-8 text-white print:max-w-none print:text-black" data-testid="admin-desk">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/team" className="text-sm text-[#9ecbff]">Team Login</Link>
        {locked ? <span className="text-sm">{level}</span> : (
          <select className="bg-transparent text-sm" aria-label="View" value={level} onChange={(event) => setLevel(event.target.value as (typeof LEVELS)[number])}>
            {LEVELS.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        )}
      </div>
      <header>
        <p className="text-xs uppercase tracking-[0.16em] text-[#9ecbff] print:text-black">{level}</p>
        <h1 className="text-3xl font-semibold">{report?.program.name ?? "Program"}</h1>
      </header>
      {level !== "Client" ? (
        <div className="flex gap-2 print:hidden">
          {(["desk", "quotes"] as const).map((item) => (
            <button key={item} type="button" className={`h-11 rounded-xl px-4 text-sm font-semibold ${panel === item ? "bg-gradient-to-r from-[#1E90FF] to-[#8B5CF6]" : "bg-white/10"}`} onClick={() => setPanel(item)}>
              {item === "desk" ? "Desk" : "Quotes"}
            </button>
          ))}
          {level === "Owner" ? (
            <button type="button" className={`h-11 rounded-xl px-4 text-sm font-semibold ${panel === "setup" ? "bg-gradient-to-r from-[#1E90FF] to-[#8B5CF6]" : "bg-white/10"}`} onClick={() => setPanel("setup")}>Setup</button>
          ) : null}
        </div>
      ) : null}
      {panel === "quotes" && level !== "Client" ? <AdminQuotes /> : null}
      {panel === "setup" && level === "Owner" ? <AdminOffice /> : null}
      {panel === "desk" || level === "Client" ? <>
      <section className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Arrivals" value={String(report?.moved.arrivals ?? 0)} />
        <Stat label="Pax moved" value={String(report?.moved.pax ?? 0)} />
        <Stat label="Vehicles" value={String(report?.moved.vehicles ?? 0)} />
      </section>
      {showStaff ? (
        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Timesheet</h2>
            <button type="button" className="text-sm font-semibold text-[#9ecbff] print:hidden" onClick={csv}>Export CSV</button>
          </div>
          <table className="mt-2 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/15"><th className="py-2">Name</th><th>Position</th><th>In</th><th>Out</th><th>Hours</th></tr>
            </thead>
            <tbody>
              {report?.staff.map((row) => (
                <tr key={row.name} className="border-b border-white/10">
                  <td className="py-2">{row.name}</td>
                  <td>{row.post}</td>
                  <td>{etTime(row.in)}</td>
                  <td>{etTime(row.out)}</td>
                  <td>{row.hours}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
      {showNotes ? (
        <section>
          <h2 className="text-xl font-semibold">Notes from the shift</h2>
          <ul className="mt-2 space-y-1 text-sm text-white/80">
            {report?.notes.map((note, index) => <li key={index}>{note.actor}: {note.detail || note.action}</li>)}
          </ul>
        </section>
      ) : null}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">End of day</h2>
          <button type="button" className="text-sm font-semibold text-[#9ecbff] print:hidden" onClick={() => window.print()}>Print</button>
        </div>
        <p className="mt-2 text-sm text-white/75">Built from the board and the texts. Nobody turns in paperwork.</p>
      </section>
      {level !== "Client" ? (
        <section className="print:block">
          <h2 className="text-xl font-semibold">Printable manifest</h2>
          <table className="mt-2 w-full text-left text-sm">
            <thead><tr className="border-b border-white/15"><th className="py-2">Time</th><th>Flight</th><th>Post</th><th>Pax</th><th>Vehicle</th></tr></thead>
            <tbody>
              {report?.sheet.map((row) => (
                <tr key={`${row.flight}-${row.names}`} className="border-b border-white/10">
                  <td className="py-2">{row.time}</td><td>{row.flight}</td><td>{row.post}</td><td>{row.count}</td><td>{row.vehicle}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
      {level === "Owner" ? (
        <section className="print:hidden">
          <h2 className="text-xl font-semibold">Text simulator</h2>
          <TextSim />
        </section>
      ) : null}
      </> : null}
    </div>
  );
}

function etTime(value: string) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" });
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-white/10 p-3"><p className="text-2xl font-semibold">{value}</p><p className="text-xs text-white/70">{label}</p></div>;
}
