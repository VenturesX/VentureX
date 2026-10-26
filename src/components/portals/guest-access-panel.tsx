"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type MovementLink = { id: string; name: string; code: string | null; token: string | null };
type View = {
  eventName: string;
  code: string | null;
  access: "TOKEN" | "PIN" | "MANIFEST";
  pin: string | null;
  token: string | null;
  expiresAt: string | null;
  movements: MovementLink[];
};

export function GuestAccessPanel() {
  const [view, setView] = useState<View | null>(null);
  const [access, setAccess] = useState<View["access"]>("TOKEN");
  const [pin, setPin] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/ops/guest-access");
        const json = (await response.json()) as View & { error?: string };
        if (!response.ok) throw new Error(json.error ?? "Could not load guest access");
        if (cancelled) return;
        apply(json, setView, setAccess, setPin, setExpiresAt);
      } catch (error) {
        if (!cancelled) toast.error(error instanceof Error ? error.message : "Could not load guest access");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function post(body: Record<string, string>) {
    setBusy(true);
    try {
      const response = await fetch("/api/ops/guest-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await response.json()) as View & { error?: string };
      if (!response.ok) throw new Error(json.error ?? "Could not update guest access");
      apply(json, setView, setAccess, setPin, setExpiresAt);
      setCopied(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update guest access");
    } finally {
      setBusy(false);
    }
  }

  const link = view?.token ? `${typeof window !== "undefined" ? window.location.origin : ""}/t/${view.token}` : "";

  return (
    <section id="guest-access" className="mb-8 space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[#1E90FF]">Guest access</p>
        <h2 className="mt-1 text-2xl font-semibold">Trip link for this event</h2>
        <p className="mt-1 text-sm text-muted-foreground">The QR code and event code open only this group. Old codes stop working when you make a new link or turn it off.</p>
      </div>
      <div className="rounded-[28px] border-[3px] border-[#1E90FF] bg-black px-5 py-6 text-white shadow-[0_0_32px_rgba(30,144,255,0.28)]">
        <p className="text-center text-[11px] font-semibold tracking-[0.28em] text-[#1E90FF]">VENTURE DIRECTORS</p>
        <h3 className="mt-2 text-center text-2xl font-semibold">Scan for your trip</h3>
        {view?.token ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            id="guest-qr"
            src={`/api/ops/guest-access/qr?v=${encodeURIComponent(view.token)}`}
            alt="QR code for this trip"
            className="mx-auto mt-4 size-40 bg-white p-2"
          />
        ) : (
          <p className="mt-4 text-center text-sm text-white/70">This link is off. Generate a new one so the QR code works again.</p>
        )}
        <p className="mt-4 text-center text-[11px] tracking-[0.22em] text-white/60">EVENT CODE</p>
        <p id="guest-event-code" className="text-center text-3xl font-semibold tracking-[0.28em]">{view?.code ?? "——"}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" className="h-12" disabled={!view?.token || copied} onClick={() => void copy(link, setCopied)}>
          {copied ? "Copied" : "Copy link"}
        </Button>
        <a className={`inline-flex h-12 items-center rounded-lg bg-[#1E90FF] px-4 text-sm font-semibold text-white ${view?.token ? "" : "pointer-events-none opacity-50"}`} href={view?.token ? "/api/ops/guest-access/qr?download=1" : undefined}>
          Download PNG
        </a>
        <Button type="button" variant="outline" className="h-12" disabled={busy} onClick={() => void post({ action: "regenerate" })}>
          New QR code
        </Button>
        <Button type="button" variant="outline" className="h-12" disabled={busy || !view?.token} onClick={() => void post({ action: "revoke" })}>
          Turn off link
        </Button>
      </div>
      <form
        className="grid gap-3 rounded-2xl border border-white/10 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          void post({ action: "save", access, pin, expiresAt });
        }}
      >
        <label className="text-sm font-medium" htmlFor="guest-access-level">Who can open it</label>
        <select id="guest-access-level" value={access} onChange={(event) => setAccess(event.target.value as View["access"])} className="h-12 rounded-xl border border-white/15 bg-black px-3 text-base text-white">
          <option value="TOKEN">Link or code is enough</option>
          <option value="PIN">Shared event PIN</option>
          <option value="MANIFEST">Last name and confirmation</option>
        </select>
        {access === "PIN" ? (
          <>
            <label className="text-sm font-medium" htmlFor="guest-pin">Event PIN</label>
            <input id="guest-pin" value={pin} onChange={(event) => setPin(event.target.value)} maxLength={32} className="h-12 rounded-xl border border-white/15 bg-black px-3 text-base text-white" />
          </>
        ) : null}
        <label className="text-sm font-medium" htmlFor="guest-expiry">Link expires</label>
        <input id="guest-expiry" type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className="h-12 rounded-xl border border-white/15 bg-black px-3 text-base text-white" />
        <Button type="submit" className="h-12" disabled={busy}>Save access</Button>
      </form>
      {view && view.movements.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">A private link for one movement</h3>
          {view.movements.map((movement) => (
            <div key={movement.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 px-3 py-3">
              <div>
                <p className="font-medium">{movement.name}</p>
                <p className="text-sm text-muted-foreground">{movement.code ? `Code ${movement.code}` : "Uses the event link"}</p>
              </div>
              <Button type="button" variant="outline" className="h-11" disabled={busy} onClick={() => void post({ action: "movement", movementId: movement.id, rotate: movement.token ? "1" : "" })}>
                {movement.token ? "New group QR" : "Make a private link"}
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function apply(
  json: View,
  setView: (view: View) => void,
  setAccess: (access: View["access"]) => void,
  setPin: (pin: string) => void,
  setExpiresAt: (value: string) => void,
) {
  setView(json);
  setAccess(json.access);
  setPin(json.pin ?? "");
  setExpiresAt(toLocalInput(json.expiresAt));
}

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

async function copy(link: string, setCopied: (value: boolean) => void) {
  try {
    await navigator.clipboard.writeText(link);
    setCopied(true);
  } catch {
    toast.error("Could not copy the link");
  }
}
