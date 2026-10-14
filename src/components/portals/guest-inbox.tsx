"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Row = {
  id: string;
  category: string;
  message: string;
  name: string | null;
  phone: string | null;
  duplicateCount: number;
  status: string;
  createdAt: string;
  movementName?: string | null;
};

const LABELS: Record<string, string> = {
  PICKUP: "Pickup",
  SCHEDULE: "Schedule",
  LOST: "Lost item",
  ACCESSIBILITY: "Accessibility",
  OTHER: "Other",
};

export function GuestInbox() {
  const [eventName, setEventName] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState<"OPEN" | "HANDLED" | "ALL">("OPEN");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/guest/requests");
        const json = (await response.json()) as { rows?: Row[]; eventName?: string; error?: string };
        if (!response.ok) throw new Error(json.error ?? "Could not load guest questions");
        if (cancelled) return;
        setRows(json.rows ?? []);
        setEventName(json.eventName ?? "");
      } catch (error) {
        if (!cancelled) toast.error(error instanceof Error ? error.message : "Could not load guest questions");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = rows.filter((row) => filter === "ALL" || row.status === filter);

  async function setStatus(row: Row, status: "OPEN" | "HANDLED") {
    const response = await fetch("/api/guest/requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: row.id, status }),
    });
    if (!response.ok) {
      toast.error("Could not update that question");
      return;
    }
    setRows((current) => current.map((item) => (item.id === row.id ? { ...item, status } : item)));
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-primary">Guest questions</p>
        <h1 className="mt-1 text-2xl font-semibold">{eventName || "This event"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">One card per question. Repeat notes are grouped instead of flooding the list.</p>
      </div>
      <div className="flex gap-2">
        {(["OPEN", "HANDLED", "ALL"] as const).map((value) => (
          <button key={value} type="button" className={`h-10 rounded-full px-4 text-sm ${filter === value ? "bg-primary text-white" : "bg-secondary text-muted-foreground"}`} onClick={() => setFilter(value)}>
            {value === "ALL" ? "All" : value === "OPEN" ? "Open" : "Handled"}
          </button>
        ))}
      </div>
      {visible.length === 0 ? <p className="rounded-2xl border border-white/10 p-4 text-sm text-muted-foreground">No questions in this view.</p> : null}
      <div className="grid gap-3">
        {visible.map((row) => (
          <article key={row.id} className="rounded-2xl border border-white/10 bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{LABELS[row.category] ?? row.category}</p>
            <h2 className="mt-1 text-lg font-semibold">{row.message}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {row.duplicateCount > 1 ? `${row.duplicateCount} guests asked this. ` : ""}
              {row.name || "No name"}
              {row.phone ? ` · ${row.phone}` : ""}
              {row.movementName ? ` · ${row.movementName}` : ""}
            </p>
            <div className="mt-3">
              {row.status === "OPEN" ? (
                <Button className="h-12 px-4" onClick={() => void setStatus(row, "HANDLED")}>Mark handled</Button>
              ) : (
                <Button variant="outline" className="h-12 px-4" onClick={() => void setStatus(row, "OPEN")}>Reopen</Button>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
