"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEMOS = [
  { role: "Admin", email: "admin@venture.direct", note: "CRUD, overrides, manifest" },
  { role: "Dispatch", email: "dispatch@venture.direct", note: "Queue, assign, curb clipboard" },
  { role: "Meet & Greet", email: "greeter@venture.direct", note: "Find, check in, queue" },
  { role: "Driver", email: "driver1@venture.direct", note: "Marcus Hale · V-101" },
  { role: "Client", email: "client@venture.direct", note: "Horizon DMC read-only" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("greeter@venture.direct");
  const [password, setPassword] = useState("VentureOps!26");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(nextEmail = email) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: nextEmail,
          password,
          next: new URLSearchParams(window.location.search).get("next") ?? "",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Sign in failed");
      router.push(json.redirect);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-dvh grid lg:grid-cols-2">
      <section className="hidden lg:flex flex-col justify-between p-12 border-r border-white/10">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary">
            <Compass className="size-5" />
          </span>
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-primary">Venture</div>
            <div className="text-lg font-semibold leading-none">Directors</div>
          </div>
        </div>
        <div className="max-w-md space-y-4">
          <p className="text-sm uppercase tracking-[0.2em] text-primary/80">Orlando arrivals</p>
          <h1 className="text-4xl font-semibold leading-tight">
            Direct the path of travel for the whole group.
          </h1>
          <p className="text-muted-foreground text-lg">
            Meet-and-greet, curb queue, dispatch assignment, and driver status —
            one operational truth across every role on the floor.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">IAAPA Expo 2026 · MCO Terminal C → Hyatt Regency Orlando</p>
      </section>
      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md space-y-6">
          <div className="lg:hidden flex items-center gap-2">
            <Compass className="size-5 text-primary" />
            <span className="font-semibold">Venture Directors</span>
          </div>
          <div>
            <h2 className="text-2xl font-semibold">Sign in to ops</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Seed password for every demo account: <code>VentureOps!26</code>
            </p>
          </div>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            {error ? <p className="text-sm text-rose-400">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Signing in…" : "Enter portal"}
            </Button>
          </form>
          <div className="grid gap-2">
            {DEMOS.map((demo) => (
              <button
                key={demo.email}
                type="button"
                onClick={() => {
                  setEmail(demo.email);
                  void submit(demo.email);
                }}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-card px-3 py-2.5 text-left hover:border-primary/50"
              >
                <span>
                  <span className="block text-sm font-medium">{demo.role}</span>
                  <span className="block text-xs text-muted-foreground">{demo.note}</span>
                </span>
                <span className="text-[11px] text-primary">{demo.email}</span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
