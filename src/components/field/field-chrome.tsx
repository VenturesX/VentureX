"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const DEMO = { email: "dispatch@venture.direct", password: "VentureOps!26" };

export function FieldChrome({ mode }: { mode: "clipboard" | "shuttle" }) {
  const router = useRouter();
  const [signedIn, setSignedIn] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/auth/me")
      .then(async (response) => {
        const body = (await response.json()) as { user?: { name?: string } | null };
        if (!cancelled) setSignedIn(Boolean(body.user));
      })
      .catch(() => {
        if (!cancelled) setSignedIn(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function enter() {
    setPending(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...DEMO, next: mode === "shuttle" ? "/shuttle" : "/clipboard" }),
      });
      if (response.ok) {
        setSignedIn(true);
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-black/90 px-3 py-2 backdrop-blur">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-2">
        <Link href="/" className="min-w-0">
          <span className="block text-[10px] uppercase tracking-[0.18em] text-[#7eb6ff]">Venture Directors</span>
          <span className="block text-sm font-semibold leading-tight">Shuttle & bus tracking</span>
        </Link>
        {signedIn ? (
          <Link href="/" className="text-[12px] font-medium text-[#9ecbff]">Airport ops</Link>
        ) : (
          <button
            type="button"
            data-testid="staff-entry"
            onClick={() => void enter()}
            disabled={pending}
            className="h-10 shrink-0 rounded-full bg-white px-3 text-[12px] font-semibold text-black disabled:opacity-60"
          >
            {pending ? "Entering…" : "1-tap staff entry"}
          </button>
        )}
      </div>
      <div className="mx-auto mt-2 grid max-w-lg grid-cols-2 gap-1">
        <Link
          href="/clipboard"
          data-testid="tab-clipboard"
          className={cn("rounded-lg px-2 py-2 text-center text-[12px] font-semibold", mode === "clipboard" ? "bg-gradient-to-r from-[#1E90FF] to-[#8B5CF6] text-white" : "bg-[#141820] text-[#d5dbe6]")}
        >
          Curb clipboard
        </Link>
        <Link
          href="/shuttle"
          data-testid="tab-shuttle"
          className={cn("rounded-lg px-2 py-2 text-center text-[12px] font-semibold", mode === "shuttle" ? "bg-gradient-to-r from-[#1E90FF] to-[#8B5CF6] text-white" : "bg-[#141820] text-[#d5dbe6]")}
        >
          Live route map
        </Link>
      </div>
    </header>
  );
}
