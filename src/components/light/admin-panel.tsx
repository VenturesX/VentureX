"use client";

import { useEffect, useState } from "react";
import { field, offBtn, onBtn } from "@/components/light/styles";

type Program = {
  id: string;
  name: string;
  code: string;
  textingMode: string;
  showLiveFlights: boolean;
  showLateAlerts: boolean;
  showHotelConfirm: boolean;
  finalReportOnly: boolean;
};
type Message = { id: string; direction: string; phone: string; body: string; createdAt: string };
type Admin = {
  programs: Program[];
  messages: Message[];
  usage: { inbound: number; outbound: number; micro: number };
};

export function LightAdmin() {
  const [data, setData] = useState<Admin | null>(null);
  const [phone, setPhone] = useState("");
  const [body, setBody] = useState("");
  const [programId, setProgramId] = useState("");

  async function load() {
    const response = await fetch("/api/light/admin", { cache: "no-store" });
    if (!response.ok) return;
    const json = (await response.json()) as Admin;
    setData(json);
    setProgramId((current) => current || json.programs[0]?.id || "");
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (!data) return null;
  const dollars = (data.usage.micro / 1_000_000).toFixed(2);

  async function save(program: Program, patch: Partial<Program>) {
    const next = { ...program, ...patch };
    await fetch("/api/light/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
    await load();
  }

  return (
    <section className="space-y-2 rounded-2xl bg-[#0c0e12] p-3" data-testid="light-admin">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9ecbff]">Meet and greet</h2>
      <p className="text-sm">Texts in {data.usage.inbound} · out {data.usage.outbound} · about ${dollars}</p>
      {data.programs.map((program) => (
        <div key={program.id} className="space-y-1 rounded-xl bg-black p-2 text-sm">
          <p className="font-semibold">{program.name}</p>
          <div className="grid grid-cols-3 gap-1">
            {[["on", "Texts on"], ["alerts-only", "Alerts"], ["off", "Texts off"]].map(([mode, label]) => (
              <button key={mode} type="button" className={program.textingMode === mode ? onBtn : offBtn} onClick={() => void save(program, { textingMode: mode })}>
                {label}
              </button>
            ))}
          </div>
          <Toggle label="Live flights" on={program.showLiveFlights} onClick={() => void save(program, { showLiveFlights: !program.showLiveFlights })} />
          <Toggle label="Late alerts" on={program.showLateAlerts} onClick={() => void save(program, { showLateAlerts: !program.showLateAlerts })} />
          <Toggle label="Hotel confirms" on={program.showHotelConfirm} onClick={() => void save(program, { showHotelConfirm: !program.showHotelConfirm })} />
          <Toggle label="Final report only" on={program.finalReportOnly} onClick={() => void save(program, { finalReportOnly: !program.finalReportOnly })} />
        </div>
      ))}
      <h3 className="text-sm font-semibold">Text log</h3>
      <ul className="max-h-64 space-y-1 overflow-auto text-sm">
        {data.messages.map((message) => (
          <li key={message.id}><span className="text-[#9ecbff]">{message.direction}</span> {message.phone}: {message.body}</li>
        ))}
      </ul>
      <select className={field} aria-label="Reply program" value={programId} onChange={(event) => setProgramId(event.target.value)}>
        {data.programs.map((program) => <option key={program.id} value={program.id}>{program.code}</option>)}
      </select>
      <input className={field} aria-label="Reply phone" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Phone" />
      <input className={field} aria-label="Reply text" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Manual reply" />
      <button type="button" className={`${onBtn} w-full`} onClick={() => void fetch("/api/light/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reply", programId, phone, body }) }).then(() => load())}>
        Send reply
      </button>
    </section>
  );
}

function Toggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button type="button" className="flex min-h-11 w-full items-center justify-between text-left" onClick={onClick}>
      <span>{label}</span>
      <span>{on ? "Shown" : "Hidden"}</span>
    </button>
  );
}
