"use client";

import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { GuestStatusBadge, PriorityBadge } from "@/components/status-badge";
import { postJson, useLive } from "@/hooks/use-live";
import { formatTime, formatWait, fullName, minutesBetween } from "@/lib/utils";
import type { LiveSnapshot } from "@/components/portals/types";

export function MeetGreetBoard({ eventId }: { eventId: string }) {
  const { data, error, loading, refresh } = useLive<LiveSnapshot>(`/api/ops/live?eventId=${eventId}`, eventId);
  const [q, setQ] = useState("");
  const [includeParty, setIncludeParty] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const matches = useMemo(() => {
    if (!data) return [];
    const query = q.trim().toLowerCase();
    const pool = data.guests.filter((g) =>
      ["EXPECTED", "ARRIVED", "FOUND", "CHECKED_IN", "QUEUED", "NEEDS_ASSISTANCE"].includes(g.status),
    );
    if (!query) return pool.slice(0, 12);
    return pool.filter((g) =>
      [g.firstName, g.lastName, g.partyCode, g.confirmationCode, g.flightNumber, g.email]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(query)),
    );
  }, [data, q]);

  async function act(guestId: string, action: string) {
    setBusy(`${guestId}:${action}`);
    try {
      await postJson("/api/ops/check-in", { guestId, action, includeParty });
      toast.success(action === "queue" ? "Party placed in curb queue" : "Updated");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(null);
    }
  }

  if (loading && !data) return <p className="text-muted-foreground">Loading arrivals hall…</p>;
  if (error) return <p className="text-rose-400">{error}</p>;
  if (!data) return <p className="text-muted-foreground">No live event.</p>;

  const selected = matches[0];
  const party = selected?.partyCode
    ? data.guests.filter((g) => g.partyCode === selected.partyCode)
    : selected
      ? [selected]
      : [];

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-primary">Meet & greet · Terminal C</p>
        <h1 className="text-2xl font-semibold mt-1">Find the guest. Check the party. Feed the queue.</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Staff-assisted check-in is the beta path. Search name, confirmation, party, or flight.
        </p>
      </div>

      <div className="grid sm:grid-cols-4 gap-3">
        <Stat label="In curb queue" value={String(data.queue.count)} />
        <Stat label="Longest wait" value={formatWait(data.queue.longestWait)} warn={data.queue.longestWait >= data.queue.waitTargetMinutes} />
        <Stat label="VIP in queue" value={String(data.queue.vipCount)} />
        <Stat label="Wait target" value={`${data.queue.waitTargetMinutes}m`} />
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Whitaker, WHT-04, AA 1823, IAAPA-WHT-04…"
          className="h-12 pl-10 text-base"
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={includeParty} onCheckedChange={(v) => setIncludeParty(Boolean(v))} />
        Apply to full party / batch
      </label>

      <div className="grid lg:grid-cols-[1fr_20rem] gap-4">
        <div className="space-y-3">
          {matches.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-muted-foreground">
              No matching guests in the arrivals working set. Try last name or flight.
            </div>
          ) : (
            matches.map((guest) => (
              <article key={guest.id} className="rounded-2xl border border-white/10 bg-card p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold">{fullName(guest.firstName, guest.lastName)}</h2>
                    <p className="text-sm text-muted-foreground">
                      {guest.partyCode} · {guest.partySize} pax · {guest.flightNumber} · ETA {formatTime(guest.flightEta)}
                    </p>
                    <p className="text-xs text-muted-foreground">{guest.confirmationCode} · {guest.hotelName}</p>
                  </div>
                  <div className="flex gap-2">
                    <PriorityBadge priority={guest.priority} />
                    <GuestStatusBadge status={guest.status} />
                  </div>
                </div>
                {guest.assistanceNotes ? (
                  <p className="text-sm text-orange-200 bg-orange-950/50 rounded-lg px-3 py-2">{guest.assistanceNotes}</p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button size="lg" variant="secondary" disabled={busy !== null} onClick={() => void act(guest.id, "found")}>
                    Found
                  </Button>
                  <Button size="lg" disabled={busy !== null} onClick={() => void act(guest.id, "check_in")}>
                    Check in
                  </Button>
                  <Button size="lg" variant="default" disabled={busy !== null} onClick={() => void act(guest.id, "queue")}>
                    Place in queue
                  </Button>
                  <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => void act(guest.id, "assistance")}>
                    Needs assist
                  </Button>
                  <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => void act(guest.id, "no_show")}>
                    No show
                  </Button>
                </div>
                {guest.status === "QUEUED" && guest.queuedAt ? (
                  <p className="text-xs text-amber-200">In queue {formatWait(minutesBetween(guest.queuedAt))}</p>
                ) : null}
              </article>
            ))
          )}
        </div>
        <aside className="rounded-2xl border border-white/10 bg-card p-4 h-fit space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Users className="size-4 text-primary" />
            Party on the floor
          </div>
          {party.length === 0 ? (
            <p className="text-sm text-muted-foreground">Search a guest to see their batch.</p>
          ) : (
            <ul className="space-y-2">
              {party.map((g) => (
                <li key={g.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>{fullName(g.firstName, g.lastName)}</span>
                  <GuestStatusBadge status={g.status} />
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">
            Queue zone is the circular curb geofence. Dispatch sees counts the moment you place a party.
          </p>
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-card px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold tabular-nums ${warn ? "text-amber-300" : ""}`}>{value}</div>
    </div>
  );
}
