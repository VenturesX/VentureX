"use client";

import { useEffect, useState } from "react";
import { field } from "@/components/light/styles";
import { GuestSetup } from "@/components/team/guest-setup";

type Staff = { id: string; name: string; phone: string; postCode: string; in: boolean };
type Program = { id: string; name: string; code: string; aliases: string; hasClientCode: boolean; staff: Staff[] };
type Position = { code: string; label: string };
type Snapshot = { programs: Program[]; positions: Position[] };

const blankStaff = { id: "", name: "", phone: "", postCode: "B_HIGH" };

export function AdminOffice() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState("");
  const [draft, setDraft] = useState({ name: "", code: "", aliases: "" });
  const [staff, setStaff] = useState(blankStaff);
  const [clientCode, setClientCode] = useState("");

  async function load() {
    const response = await fetch("/api/team/office");
    const json = (await response.json()) as Snapshot & { error?: string };
    if (!response.ok) {
      setError(json.error || "Could not open programs.");
      return;
    }
    setData(json);
  }

  useEffect(() => {
    void load();
  }, []);

  async function act(body: Record<string, string>) {
    setError("");
    const response = await fetch("/api/team/office", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await response.json()) as Snapshot & { error?: string };
    if (!response.ok) {
      setError(json.error || "Could not save that.");
      return;
    }
    setData(json);
    setClientCode("");
    setStaff(blankStaff);
  }

  const open = data?.programs.find((program) => program.id === openId);

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Programs</h2>
      <p className="text-sm text-white/70">One demo program is seeded. Add the rest here. Codes are stored hashed.</p>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <form className="space-y-2 rounded-2xl border border-white/10 p-4" onSubmit={(event) => { event.preventDefault(); void act({ action: "create-program", ...draft }); }}>
        <p className="font-semibold">New program</p>
        <input className={field} aria-label="New program name" placeholder="Name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
        <input className={field} aria-label="New program code" placeholder="Program code" value={draft.code} onChange={(event) => setDraft({ ...draft, code: event.target.value })} />
        <input className={field} aria-label="Extra text-in codes" placeholder="Extra text-in codes, comma separated" value={draft.aliases} onChange={(event) => setDraft({ ...draft, aliases: event.target.value })} />
        <button className="h-11 rounded-xl bg-white/10 px-4 text-sm font-semibold" type="submit">Add program</button>
      </form>
      <ul className="space-y-3">
        {data?.programs.map((program) => (
          <li key={program.id} className="rounded-2xl border border-white/10 p-4">
            <button type="button" className="w-full text-left" onClick={() => { setOpenId(program.id === openId ? "" : program.id); setError(""); }}>
              <span className="text-lg font-semibold">{program.name}</span>
              <span className="mt-1 block text-sm text-white/60">{program.staff.length} staff{program.hasClientCode ? " · client code set" : ""}</span>
            </button>
            {open?.id === program.id ? (
              <ProgramEditor program={program} positions={data?.positions ?? []} staff={staff} setStaff={setStaff} clientCode={clientCode} setClientCode={setClientCode} act={act} />
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProgramEditor({
  program,
  positions,
  staff,
  setStaff,
  clientCode,
  setClientCode,
  act,
}: {
  program: Program;
  positions: Position[];
  staff: { id: string; name: string; phone: string; postCode: string };
  setStaff: (next: { id: string; name: string; phone: string; postCode: string }) => void;
  clientCode: string;
  setClientCode: (next: string) => void;
  act: (body: Record<string, string>) => Promise<void>;
}) {
  const [name, setName] = useState(program.name);
  const [code, setCode] = useState(program.code);
  const [aliases, setAliases] = useState(program.aliases);
  const [confirmRemove, setConfirmRemove] = useState(false);
  return (
    <div className="mt-4 space-y-4">
      <form className="space-y-2" onSubmit={(event) => { event.preventDefault(); void act({ action: "update-program", id: program.id, name, code, aliases }); }}>
        <input className={field} aria-label="Program name" value={name} onChange={(event) => setName(event.target.value)} />
        <input className={field} aria-label="Program code" value={code} onChange={(event) => setCode(event.target.value)} />
        <input className={field} aria-label="Extra text-in codes" value={aliases} onChange={(event) => setAliases(event.target.value)} />
        <button className="h-11 rounded-xl bg-white/10 px-4 text-sm font-semibold" type="submit">Save program</button>
      </form>
      <form className="space-y-2" onSubmit={(event) => { event.preventDefault(); void act({ action: "set-client-code", id: program.id, code: clientCode }); }}>
        <p className="text-sm font-semibold">Client code</p>
        <input className={field} type="password" aria-label="Client code" placeholder={program.hasClientCode ? "Replace client code" : "Set client code"} value={clientCode} onChange={(event) => setClientCode(event.target.value)} />
        <div className="flex gap-2">
          <button className="h-11 rounded-xl bg-white/10 px-4 text-sm font-semibold" type="submit">Save client code</button>
          {program.hasClientCode ? <button className="h-11 rounded-xl bg-white/10 px-4 text-sm font-semibold" type="button" onClick={() => void act({ action: "clear-client-code", id: program.id })}>Clear</button> : null}
        </div>
        <p className="text-xs text-white/50">If no client code is set, the program code opens the client view.</p>
      </form>
      <button className="h-11 rounded-xl bg-white/10 px-4 text-sm font-semibold" type="button" onClick={() => void act({ action: "reset-day-codes", programId: program.id })}>Reset day codes</button>
      <GuestSetup programId={program.id} owner />
      <div>
        <p className="font-semibold">Staff</p>
        <ul className="mt-2 divide-y divide-white/10">
          {program.staff.map((person) => (
            <li key={person.id} className="flex items-center justify-between gap-3 py-3">
              <span>
                <span className="block font-semibold">{person.name}</span>
                <span className="text-sm text-white/60">{person.phone} · {positions.find((item) => item.code === person.postCode)?.label || person.postCode}{person.in ? " · In" : ""}</span>
              </span>
              <span className="flex gap-2">
                <button className="text-sm text-[#9ecbff]" type="button" onClick={() => setStaff({ id: person.id, name: person.name, phone: person.phone, postCode: person.postCode })}>Edit</button>
                <button className="text-sm text-[#9ecbff]" type="button" onClick={() => void act({ action: "reset-day-codes", programId: program.id, personId: person.id })}>Reset</button>
                <button className="text-sm text-red-300" type="button" onClick={() => void act({ action: "delete-staff", id: person.id })}>Remove</button>
              </span>
            </li>
          ))}
        </ul>
        <form className="mt-3 space-y-2" onSubmit={(event) => { event.preventDefault(); void act({ action: "save-staff", programId: program.id, id: staff.id, name: staff.name, phone: staff.phone, postCode: staff.postCode }); }}>
          <input className={field} aria-label="Staff name" placeholder="Name" value={staff.name} onChange={(event) => setStaff({ ...staff, name: event.target.value })} />
          <input className={field} aria-label="Staff phone" placeholder="Phone" value={staff.phone} onChange={(event) => setStaff({ ...staff, phone: event.target.value })} />
          <select className={field} aria-label="Default position" value={staff.postCode} onChange={(event) => setStaff({ ...staff, postCode: event.target.value })}>
            {positions.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
          </select>
          <button className="h-11 rounded-xl bg-white/10 px-4 text-sm font-semibold" type="submit">{staff.id ? "Save staff" : "Add staff"}</button>
        </form>
      </div>
      {confirmRemove ? (
        <button className="h-11 rounded-xl bg-red-500/20 px-4 text-sm font-semibold text-red-200" type="button" onClick={() => void act({ action: "delete-program", id: program.id })}>Confirm remove</button>
      ) : (
        <button className="h-11 text-sm font-semibold text-red-300" type="button" onClick={() => setConfirmRemove(true)}>Remove program</button>
      )}
    </div>
  );
}
