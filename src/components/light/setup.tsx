"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { field, offBtn, onBtn } from "@/components/light/styles";

type Setup = {
  program: {
    code: string;
    name: string;
    clientName: string;
    hotels: string;
    pmName: string;
    pmPhone: string;
    windowClose: string;
    greetOffsetMin: number;
    hotelLabel: string;
    aliases: string;
  };
  posts: { code: string; label: string }[];
  airlines: { airline: string; postCode: string }[];
  rules: { vehicleKind: string; pickupNote: string }[];
  directory: { kind: string; name: string; company: string; phone: string; notes: string }[];
};

export function LightSetup({ code }: { code: string }) {
  const [setup, setSetup] = useState<Setup | null>(null);
  const [saved, setSaved] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetch(`/api/light/setup?code=${encodeURIComponent(code)}`).then(async (response) => {
        if (response.ok) setSetup((await response.json()) as Setup);
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [code]);

  if (!setup) return <p className="p-4 text-sm text-white">Loading setup...</p>;

  async function save() {
    if (!setup) return;
    const current = setup;
    const response = await fetch("/api/light/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...current.program, code, posts: current.posts, airlines: current.airlines, rules: current.rules, directory: current.directory }),
    });
    setSaved(response.ok ? "Saved" : "Could not save");
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-3 px-3 py-3 text-white" data-testid="light-setup">
      <Link href={`/light/${code}`} className="text-sm text-[#9ecbff]">Back to board</Link>
      <h1 className="text-2xl font-semibold">Program setup</h1>
      <label className="block text-sm">Program name<input className={`${field} mt-1`} value={setup.program.name} onChange={(event) => setSetup({ ...setup, program: { ...setup.program, name: event.target.value } })} /></label>
      <label className="block text-sm">Client / DMC<input className={`${field} mt-1`} value={setup.program.clientName} onChange={(event) => setSetup({ ...setup, program: { ...setup.program, clientName: event.target.value } })} /></label>
      <label className="block text-sm">Hotels<input className={`${field} mt-1`} value={setup.program.hotels} onChange={(event) => setSetup({ ...setup, program: { ...setup.program, hotels: event.target.value } })} /></label>
      <label className="block text-sm">PM contact<input className={`${field} mt-1`} value={setup.program.pmName} onChange={(event) => setSetup({ ...setup, program: { ...setup.program, pmName: event.target.value } })} /></label>
      <label className="block text-sm">PM phone<input className={`${field} mt-1`} value={setup.program.pmPhone} onChange={(event) => setSetup({ ...setup, program: { ...setup.program, pmPhone: event.target.value } })} /></label>
      <label className="block text-sm">Shuttle close<input className={`${field} mt-1`} value={setup.program.windowClose} onChange={(event) => setSetup({ ...setup, program: { ...setup.program, windowClose: event.target.value } })} /></label>
      <label className="block text-sm">Greet minutes after gate<input className={`${field} mt-1`} inputMode="numeric" value={setup.program.greetOffsetMin} onChange={(event) => setSetup({ ...setup, program: { ...setup.program, greetOffsetMin: Number(event.target.value) } })} /></label>
      <section>
        <h2 className="text-sm font-semibold">Posts</h2>
        {setup.posts.map((post, index) => (
          <input key={post.code} className={`${field} mt-1`} aria-label={post.code} value={post.label} onChange={(event) => {
            const posts = setup.posts.slice();
            posts[index] = { ...post, label: event.target.value };
            setSetup({ ...setup, posts });
          }} />
        ))}
      </section>
      <section>
        <h2 className="text-sm font-semibold">Airline posts</h2>
        {setup.airlines.map((row, index) => (
          <div key={row.airline} className="mt-1 grid grid-cols-2 gap-1">
            <input className={field} aria-label={`Airline ${index + 1}`} value={row.airline} onChange={(event) => {
              const airlines = setup.airlines.slice();
              airlines[index] = { ...row, airline: event.target.value };
              setSetup({ ...setup, airlines });
            }} />
            <input className={field} aria-label={`Post ${index + 1}`} value={row.postCode} onChange={(event) => {
              const airlines = setup.airlines.slice();
              airlines[index] = { ...row, postCode: event.target.value };
              setSetup({ ...setup, airlines });
            }} />
          </div>
        ))}
      </section>
      <section>
        <h2 className="text-sm font-semibold">Pickup rules</h2>
        {setup.rules.map((row, index) => (
          <label key={row.vehicleKind} className="mt-1 block text-sm">{row.vehicleKind}
            <input className={`${field} mt-1`} value={row.pickupNote} onChange={(event) => {
              const rules = setup.rules.slice();
              rules[index] = { ...row, pickupNote: event.target.value };
              setSetup({ ...setup, rules });
            }} />
          </label>
        ))}
      </section>
      <section>
        <h2 className="text-sm font-semibold">Drivers and vendors</h2>
        {setup.directory.map((row, index) => (
          <div key={`${row.kind}-${index}`} className="mt-1 grid grid-cols-3 gap-1">
            <input className={field} aria-label={`Name ${index + 1}`} value={row.name} onChange={(event) => {
              const directory = setup.directory.slice();
              directory[index] = { ...row, name: event.target.value };
              setSetup({ ...setup, directory });
            }} />
            <input className={field} aria-label={`Company ${index + 1}`} value={row.company} onChange={(event) => {
              const directory = setup.directory.slice();
              directory[index] = { ...row, company: event.target.value };
              setSetup({ ...setup, directory });
            }} />
            <input className={field} aria-label={`Phone ${index + 1}`} value={row.phone} onChange={(event) => {
              const directory = setup.directory.slice();
              directory[index] = { ...row, phone: event.target.value };
              setSetup({ ...setup, directory });
            }} />
          </div>
        ))}
        <button type="button" className={`${offBtn} mt-2 w-full`} onClick={() => setSetup({ ...setup, directory: [...setup.directory, { kind: "DRIVER", name: "", company: "", phone: "", notes: "" }] })}>Add person</button>
      </section>
      <button type="button" className={`${onBtn} w-full`} onClick={() => void save()}>Save setup</button>
      {saved ? <p className="text-sm">{saved}</p> : null}
    </div>
  );
}
