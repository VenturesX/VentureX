"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useLive } from "@/hooks/use-live";
import { formatDateTime } from "@/lib/utils";
import type { LiveSnapshot } from "@/components/portals/types";

type Row = Record<string, unknown> & { id: string };

export function AdminBoard({ eventId }: { eventId: string }) {
  const live = useLive<LiveSnapshot>(`/api/ops/live?eventId=${eventId}`, eventId);
  const [tab, setTab] = useState("overview");

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-primary">Admin</p>
        <h1 className="text-2xl font-semibold mt-1">Configure the event spine</h1>
        <p className="text-sm text-muted-foreground">
          Clients, events, circular queue zones, routes, users, operators, vehicles, drivers, alerts, and the guest manifest.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-secondary/50 p-1">
          {[
            ["overview", "Overview"],
            ["clients", "Clients"],
            ["events", "Events"],
            ["locations", "Locations"],
            ["geofences", "Queue zones"],
            ["routes", "Routes"],
            ["users", "Users"],
            ["operators", "Operators"],
            ["vehicles", "Vehicles"],
            ["drivers", "Drivers"],
            ["alerts", "Alerts & timing"],
            ["manifest", "Manifest"],
          ].map(([value, label]) => (
            <TabsTrigger key={value} value={value} className="text-xs">
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="space-y-3 pt-4">
          {live.data ? (
            <div className="grid sm:grid-cols-3 gap-3">
              <Info label="Event" value={live.data.event.name} />
              <Info label="Client" value={live.data.event.client.name} />
              <Info label="Guests on file" value={String(live.data.guests.length)} />
              <Info label="Wait target" value={`${live.data.event.waitTargetMinutes} minutes`} />
              <Info
                label="Queue zone"
                value={
                  live.data.event.geofences[0]
                    ? `${live.data.event.geofences[0].name} · ${live.data.event.geofences[0].radiusMeters}m`
                    : "None"
                }
              />
              <Info label="Last live tick" value={formatDateTime(live.data.generatedAt)} />
            </div>
          ) : (
            <p className="text-muted-foreground">Loading…</p>
          )}
        </TabsContent>

        <TabsContent value="clients"><Crud resource="clients" fields={["name", "contactName", "contactEmail", "contactPhone", "notes"]} /></TabsContent>
        <TabsContent value="events">
          <Crud
            resource="events"
            fields={["name", "code", "city", "timezone", "clientId", "startsAt", "endsAt", "waitTargetMinutes"]}
            eventId={eventId}
          />
        </TabsContent>
        <TabsContent value="locations">
          <Crud resource="locations" fields={["name", "type", "address", "lat", "lng", "eventId", "notes"]} defaults={{ eventId }} />
        </TabsContent>
        <TabsContent value="geofences">
          <p className="text-sm text-muted-foreground mb-3">
            Beta 0 supports circular zones only. Adjust radius to resize the curb queue.
          </p>
          <Crud
            resource="geofences"
            fields={["name", "kind", "centerLat", "centerLng", "radiusMeters", "eventId", "locationId"]}
            defaults={{ eventId, kind: "QUEUE_ZONE" }}
          />
        </TabsContent>
        <TabsContent value="routes">
          <Crud resource="routes" fields={["name", "originId", "destinationId", "estimatedMinutes", "eventId"]} defaults={{ eventId }} />
        </TabsContent>
        <TabsContent value="users">
          <Crud resource="users" fields={["name", "email", "role", "phone", "password", "clientId"]} />
        </TabsContent>
        <TabsContent value="operators">
          <Crud resource="operators" fields={["name", "contactEmail", "phone", "notes"]} />
        </TabsContent>
        <TabsContent value="vehicles">
          <Crud
            resource="vehicles"
            fields={["name", "fleetNumber", "type", "capacity", "status", "operatorId", "eventId", "notes"]}
            defaults={{ eventId, status: "AVAILABLE" }}
          />
        </TabsContent>
        <TabsContent value="drivers">
          <Crud resource="drivers" fields={["name", "email", "phone", "licenseNumber", "operatorId", "password"]} />
        </TabsContent>
        <TabsContent value="alerts">
          <div className="grid lg:grid-cols-2 gap-6">
            <Crud resource="alerts" fields={["eventId", "waitThresholdMinutes", "vipWaitThresholdMinutes", "queueCapacityAlert"]} defaults={{ eventId }} />
            <Crud resource="presets" fields={["eventId", "name", "loadMinutes", "travelMinutes", "bufferMinutes"]} defaults={{ eventId }} />
          </div>
        </TabsContent>
        <TabsContent value="manifest">
          <ManifestImport eventId={eventId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-card px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function Crud({
  resource,
  fields,
  defaults = {},
}: {
  resource: string;
  fields: string[];
  eventId?: string;
  defaults?: Record<string, string>;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState<Record<string, string>>({ ...defaults });
  const [editing, setEditing] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/admin/${resource}`);
    const json = await res.json();
    setRows((json.rows ?? []) as Row[]);
  }

  useEffect(() => {
    void load();
  }, [resource]);

  async function save() {
    const payload = { ...form, ...(editing ? { id: editing } : {}) };
    const res = await fetch(`/api/admin/${resource}`, {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? "Save failed");
      return;
    }
    toast.success(editing ? "Updated" : "Created");
    setForm({ ...defaults });
    setEditing(null);
    await load();
  }

  async function remove(id: string) {
    const res = await fetch(`/api/admin/${resource}?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Delete failed");
      return;
    }
    toast.success("Soft-deleted");
    await load();
  }

  function labelOf(row: Row) {
    return String(row.name ?? row.email ?? row.fleetNumber ?? row.code ?? row.id);
  }

  return (
    <div className="grid lg:grid-cols-[22rem_1fr] gap-4 pt-4">
      <form
        className="rounded-2xl border border-white/10 bg-card p-4 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <h3 className="font-medium">{editing ? "Edit" : "Create"} {resource}</h3>
        {fields.map((field) => (
          <div key={field} className="space-y-1">
            <Label className="text-xs capitalize">{field}</Label>
            {field === "notes" ? (
              <Textarea value={form[field] ?? ""} onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))} />
            ) : (
              <Input
                value={form[field] ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
              />
            )}
          </div>
        ))}
        <div className="flex gap-2">
          <Button type="submit" size="sm">{editing ? "Save" : "Create"}</Button>
          {editing ? (
            <Button type="button" size="sm" variant="ghost" onClick={() => { setEditing(null); setForm({ ...defaults }); }}>
              Cancel
            </Button>
          ) : null}
        </div>
      </form>
      <div className="rounded-2xl border border-white/10 bg-card overflow-auto max-h-[32rem]">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Record</th>
              <th className="px-3 py-2">Id</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-white/5">
                <td className="px-3 py-2 font-medium">{labelOf(row)}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{row.id.slice(0, 10)}</td>
                <td className="px-3 py-2 text-right space-x-2">
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => {
                      setEditing(row.id);
                      const next: Record<string, string> = { ...defaults };
                      for (const field of fields) {
                        const value = row[field];
                        if (value != null) next[field] = String(value);
                      }
                      setForm(next);
                    }}
                  >
                    Edit
                  </Button>
                  <Button size="xs" variant="ghost" onClick={() => void remove(row.id)}>
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ManifestImport({ eventId }: { eventId: string }) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<{ guests: Row[]; total: number; pages: number } | null>(null);
  const [importResult, setImportResult] = useState<string | null>(null);

  async function search(nextPage = page) {
    const res = await fetch(
      `/api/ops/guests?eventId=${eventId}&q=${encodeURIComponent(q)}&page=${nextPage}&pageSize=20`,
    );
    setResult(await res.json());
    setPage(nextPage);
  }

  useEffect(() => {
    void search(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function onFile(file: File) {
    const form = new FormData();
    form.set("file", file);
    form.set("eventId", eventId);
    const res = await fetch("/api/admin/manifest", { method: "POST", body: form });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? "Import failed");
      return;
    }
    setImportResult(
      `Created ${json.created}. Duplicates skipped: ${json.duplicates?.length ?? 0}. Validation errors: ${json.errors?.length ?? 0}.`,
    );
    toast.success("Manifest imported");
    await search(1);
  }

  return (
    <div className="space-y-4 pt-4">
      <div className="rounded-2xl border border-white/10 bg-card p-4 space-y-3">
        <h3 className="font-medium">CSV import</h3>
        <p className="text-sm text-muted-foreground">
          Columns: firstName, lastName, email, phone, partySize, partyCode, flightNumber, flightEta, hotelName, confirmationCode, priority.
          Duplicates match confirmation code or name+flight+email. Sample file is in <code>data/sample-manifest.csv</code>.
        </p>
        <Input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onFile(file);
          }}
        />
        {importResult ? <p className="text-sm text-emerald-300">{importResult}</p> : null}
      </div>
      <div className="flex gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search 30k-scale manifest…" />
        <Button onClick={() => void search(1)}>Search</Button>
      </div>
      <div className="rounded-2xl border border-white/10 bg-card overflow-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Guest</th>
              <th className="px-3 py-2">Party</th>
              <th className="px-3 py-2">Flight</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {result?.guests.map((g) => (
              <tr key={g.id} className="border-t border-white/5">
                <td className="px-3 py-2">{String(g.firstName)} {String(g.lastName)}</td>
                <td className="px-3 py-2 text-muted-foreground">{String(g.partyCode ?? "")}</td>
                <td className="px-3 py-2 text-muted-foreground">{String(g.flightNumber ?? "")}</td>
                <td className="px-3 py-2">{String(g.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{result?.total ?? 0} guests</span>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => void search(page - 1)}>
            Prev
          </Button>
          <Button size="sm" variant="ghost" disabled={!result || page >= result.pages} onClick={() => void search(page + 1)}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
