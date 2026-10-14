"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";

type Row = { id: string; name: string; phone: string; bestTime: string; status: string; createdAt: string };

export function CallbackList() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/callbacks");
        const json = (await response.json()) as { rows?: Row[]; error?: string };
        if (!response.ok) throw new Error(json.error ?? "Could not load callbacks");
        if (!cancelled) setRows(json.rows ?? []);
      } catch (error) {
        if (!cancelled) toast.error(error instanceof Error ? error.message : "Could not load callbacks");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function mark(row: Row) {
    const status = row.status === "CALLED" ? "NEW" : "CALLED";
    const response = await fetch("/api/callbacks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: row.id, status }),
    });
    if (!response.ok) {
      toast.error("Could not update that callback");
      return;
    }
    setRows((current) => current.map((item) => (item.id === row.id ? { ...item, status } : item)));
  }

  if (rows.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Callback requests</h2>
      {rows.map((row) => (
        <article key={row.id} className="rounded-2xl border border-white/10 bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold">{row.name}</h3>
              <p className="text-sm text-muted-foreground"><a className="underline" href={`tel:${row.phone}`}>{row.phone}</a> · {row.bestTime}</p>
            </div>
            <span className="text-xs text-muted-foreground">{formatDateTime(row.createdAt)}</span>
          </div>
          <Button className="mt-3 h-11" variant={row.status === "CALLED" ? "outline" : "default"} onClick={() => void mark(row)}>
            {row.status === "CALLED" ? "Called" : "Mark called"}
          </Button>
        </article>
      ))}
    </section>
  );
}
