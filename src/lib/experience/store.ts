"use client";

import { useEffect, useState } from "react";

export type Tiers = {
  wayfinding: boolean;
  dashboard: boolean;
  prereg: boolean;
  seatHold: boolean;
};

export type WalkState = {
  tiers: Tiers;
  partners: Array<{ name: string; cut: string }>;
  revenue: number;
  carrier: number;
  staffPay: number;
};

const KEY = "vx.walk.v1";

export const DEFAULT_WALK: WalkState = {
  tiers: { wayfinding: true, dashboard: true, prereg: true, seatHold: true },
  partners: [
    { name: "Venture Directors In-House", cut: "0%" },
    { name: "Meeting Movers", cut: "12%" },
    { name: "Total Transportation Solutions", cut: "15%" },
  ],
  revenue: 48600,
  carrier: 31200,
  staffPay: 6400,
};

export function readWalk(): WalkState {
  if (typeof window === "undefined") return DEFAULT_WALK;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_WALK;
    return { ...DEFAULT_WALK, ...JSON.parse(raw) as WalkState };
  } catch {
    return DEFAULT_WALK;
  }
}

export function writeWalk(next: WalkState) {
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("vx-walk"));
}

export function useWalk() {
  const [state, setState] = useState<WalkState>(DEFAULT_WALK);
  useEffect(() => {
    const pull = () => setState(readWalk());
    pull();
    window.addEventListener("vx-walk", pull);
    window.addEventListener("storage", pull);
    return () => {
      window.removeEventListener("vx-walk", pull);
      window.removeEventListener("storage", pull);
    };
  }, []);
  function update(patch: Partial<WalkState>) {
    const next = { ...readWalk(), ...patch };
    writeWalk(next);
    setState(next);
  }
  function reset() {
    localStorage.removeItem(KEY);
    writeWalk(DEFAULT_WALK);
    setState(DEFAULT_WALK);
  }
  return { state, update, reset };
}

export function moneyMath(state: WalkState) {
  const profit = state.revenue - state.carrier - state.staffPay;
  const margin = state.revenue ? Math.round((profit / state.revenue) * 1000) / 10 : 0;
  return { profit, margin };
}
