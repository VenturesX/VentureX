"use client";

import { useEffect, useState, type FormEvent } from "react";
import { field, onBtn } from "@/components/light/styles";

const DESK = /^\/(team|clipboard|drive|owner|light|shuttle)/;

export function OwnerLock() {
  const [locked, setLocked] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let deadline = 0;
    let lastPost = 0;
    let stopped = false;
    const onDesk = () => DESK.test(window.location.pathname);

    function lock() {
      if (!onDesk()) return;
      setLocked(true);
    }

    void fetch("/api/team/session")
      .then((response) => response.json())
      .then((json: { locked?: boolean; signedIn?: { kind?: string }; ownerIdleSec?: number }) => {
        if (stopped) return;
        if (json.locked) {
          lock();
          return;
        }
        if (json.signedIn?.kind !== "admin") return;
        deadline = Date.now() + Math.max(0, json.ownerIdleSec ?? 0) * 1000;
      })
      .catch(() => undefined);

    function note(event: Event) {
      if (!deadline || locked) return;
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("[data-owner-lock]")) return;
      const now = Date.now();
      if (now - lastPost < 20_000) return;
      lastPost = now;
      void fetch("/api/team/activity", { method: "POST" }).then((response) => {
        if (response.ok) deadline = Date.now() + 15 * 60 * 1000;
        else lock();
      });
    }

    const timer = window.setInterval(() => {
      if (deadline && Date.now() > deadline) lock();
    }, 5000);
    document.addEventListener("pointerdown", note);
    document.addEventListener("keydown", note);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("pointerdown", note);
      document.removeEventListener("keydown", note);
    };
  }, [locked]);

  async function resume(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/team/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "resume", code }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(json.error || "That code didn't match.");
        return;
      }
      setCode("");
      setLocked(false);
      window.dispatchEvent(new Event("vd-owner-unlocked"));
    } catch {
      setError("The request didn't go through. Try again.");
    } finally {
      setPending(false);
    }
  }

  async function signOut() {
    await fetch("/api/team/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: "out" }),
    });
    window.location.assign("/team");
  }

  if (!locked) return null;

  return (
    <div data-owner-lock className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <form className="w-full max-w-md space-y-3 rounded-3xl border border-white/10 bg-[#090b10] p-5 text-white" onSubmit={(event) => void resume(event)}>
        <h2 className="text-2xl font-semibold">Owner hub locked</h2>
        <p className="text-sm text-white/70">15 minutes passed without using the desk. Your program and anything you were typing stay on this page.</p>
        <label className="block text-sm" htmlFor="owner-resume">Owner code</label>
        <input id="owner-resume" type="password" className={field} autoComplete="off" value={code} onChange={(event) => setCode(event.target.value)} />
        <button className={`${onBtn} w-full`} type="submit" disabled={pending || code.trim().length < 2}>Continue</button>
        <button type="button" className="min-h-11 w-full text-sm text-[#9ecbff]" onClick={() => void signOut()}>Sign out</button>
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
      </form>
    </div>
  );
}
