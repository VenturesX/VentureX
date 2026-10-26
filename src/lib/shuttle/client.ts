import type { DispatchRun } from "@/lib/clipboard/types";

const CURB_KEY = "vd.shuttle.curb";

export function readCurb() {
  if (typeof window === "undefined") return "r3-s3";
  return window.localStorage.getItem(CURB_KEY) || "r3-s3";
}

export function writeCurb(stopId: string) {
  window.localStorage.setItem(CURB_KEY, stopId);
  window.dispatchEvent(new Event("vd-curb"));
}

export function subscribeCurb(onStoreChange: () => void) {
  window.addEventListener("vd-curb", onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener("vd-curb", onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

export async function publishCurbRun(run: DispatchRun) {
  const stopId = readCurb();
  const coach = coachNumber(run.busPuck);
  const shuttleNumber = shuttleNumberFrom(run.busPuck);
  try {
    await fetch("/api/shuttle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        puckId: run.siteCode || shuttleNumber,
        stopId,
        kind: "depart",
        pax: run.pax,
        driver: run.driver === "Open" ? "" : run.driver,
        coachNumber: coach,
        shuttleNumber,
      }),
    });
  } catch {
    /* The curb sheet still has the run. The map will catch the next relay. */
  }
}

function coachNumber(busPuck: string) {
  const fleet = busPuck.split(/[/\\]/)[0]?.trim() ?? "";
  return /^\d{3,}$/.test(fleet) ? fleet : "";
}

function shuttleNumberFrom(busPuck: string) {
  const parts = busPuck.split(/[/\\]/);
  const puck = parts[1]?.trim();
  if (puck) return puck.replace(".", "-");
  return busPuck.trim();
}
