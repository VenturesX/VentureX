"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { buildSeedPrograms, syncOfficialDays } from "@/lib/clipboard/seed-data";
import {
  activeRoster,
  addMinutes,
  autoAssignPucks,
  blankIngress,
  boardingTotal,
  breakStatusOf,
  BREAK_LABEL,
  breaksCopyText,
  cycleBreak,
  cycleRoster,
  dayTotals,
  departureCopyText,
  describeDay,
  displayBus,
  dispatchLogCopyText,
  formatPhone,
  logDeparture,
  markBatchSynced,
  newId,
  nowClock,
  nudgeCount,
  repeatRoster,
  resetCount,
  rosterCopyText,
  selectRoster,
  setCount,
  siteCodeFromBusPuck,
  siteLabel,
  suggestDayLabel,
  summaryLine,
  telHref,
} from "@/lib/clipboard/logic";
import { BatchPanel, EgressFooter, egressPax, egressRunLabel, IngressCard, PhoneToggle } from "@/components/clipboard/field-ops";
import type { ClipboardDay, ClipboardProgram, DispatchRun, HeadwayMinutes, RosterRow } from "@/lib/clipboard/types";
import { publishCurbRun } from "@/lib/shuttle/client";
import { CrewBar, CurbSelect, RelayStrip } from "@/components/shuttle/crew-bar";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "vd.clipboard.v1";
const SELECTION_KEY = "vd.clipboard.selection";

type Panel =
  | { type: "program" }
  | { type: "new-day" }
  | { type: "edit-day" }
  | { type: "roster"; id: string | null }
  | { type: "run"; id: string | null };

export function ClipboardBoard({
  backHref = "/shuttle",
  backLabel = "Live map",
}: {
  backHref?: string;
  backLabel?: string;
}) {
  const [programs, setPrograms] = useState<ClipboardProgram[] | null>(null);
  const [programId, setProgramId] = useState<string | null>(null);
  const [dayId, setDayId] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [sync, setSync] = useState<"loading" | "saved" | "saving" | "phone">("loading");
  const [breakEditId, setBreakEditId] = useState<string | null>(null);
  const [withPhones, setWithPhones] = useState(false);
  const latest = useRef<ClipboardProgram[] | null>(null);
  const selection = useRef({ programId: "", dayId: "" });
  const saveChain = useRef(Promise.resolve());
  const saveTimer = useRef<number | null>(null);
  const copiedTimer = useRef<number | null>(null);

  function adopt(next: ClipboardProgram[], status: "saved" | "phone") {
    const saved = readSelection();
    const program = next.find((item) => item.id === saved?.programId) ?? next[0];
    const day = program?.days.find((item) => item.id === saved?.dayId) ?? program?.days[program.days.length - 1] ?? null;
    latest.current = next;
    selection.current = { programId: program?.id ?? "", dayId: day?.id ?? "" };
    setPrograms(next);
    setProgramId(program?.id ?? null);
    setDayId(day?.id ?? null);
    setSync(status);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* private mode */
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/clipboard");
        if (!response.ok) throw new Error("clipboard unavailable");
        const body = (await response.json()) as { programs: ClipboardProgram[]; persisted?: boolean };
        if (cancelled) return;
        adopt(syncOfficialDays(body.programs).programs, body.persisted === false ? "phone" : "saved");
      } catch {
        if (cancelled) return;
        adopt(readLocalPrograms(), "phone");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function commit(next: ClipboardProgram[], immediate = false) {
    latest.current = next;
    setPrograms(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* private mode */
    }
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    const fire = () => {
      const snapshot = latest.current;
      if (!snapshot) return;
      setSync("saving");
      saveChain.current = saveChain.current
        .then(async () => {
          const response = await fetch("/api/clipboard", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ programs: snapshot }),
          });
          if (!response.ok) throw new Error("save failed");
          const saved = (await response.json()) as { persisted?: boolean };
          if (latest.current === snapshot) setSync(saved.persisted === false ? "phone" : "saved");
        })
        .catch(() => {
          if (latest.current === snapshot) setSync("phone");
        });
    };
    if (immediate) fire();
    else saveTimer.current = window.setTimeout(fire, 350);
  }

  function patchDay(update: (day: ClipboardDay) => ClipboardDay, immediate = false) {
    const current = latest.current;
    const { programId: pid, dayId: did } = selection.current;
    if (!current || !pid || !did) return;
    commit(
      current.map((program) =>
        program.id !== pid
          ? program
          : { ...program, days: program.days.map((item) => (item.id === did ? update(item) : item)) },
      ),
      immediate,
    );
  }

  function chooseProgram(nextId: string) {
    const program = latest.current?.find((item) => item.id === nextId);
    const nextDay = program?.days[program.days.length - 1]?.id ?? null;
    selection.current = { programId: nextId, dayId: nextDay ?? "" };
    setProgramId(nextId);
    setDayId(nextDay);
    if (nextDay) remember(nextId, nextDay);
  }

  function chooseDay(nextDayId: string) {
    selection.current = { programId: selection.current.programId, dayId: nextDayId };
    setDayId(nextDayId);
    if (selection.current.programId) remember(selection.current.programId, nextDayId);
  }

  async function copyBlock(key: string, text: string) {
    const ok = await writeClipboard(text);
    if (!ok) return;
    setCopied(key);
    if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
    copiedTimer.current = window.setTimeout(() => setCopied((current) => (current === key ? null : current)), 1600);
  }

  if (!programs || !programId) {
    return <p className="px-4 py-8 text-sm text-[#d5dbe6]">Opening clipboard…</p>;
  }

  const program = programs.find((item) => item.id === programId) ?? programs[0];
  const day = program.days.find((item) => item.id === dayId) ?? null;
  const yesterday = program.days[program.days.length - 1] ?? null;

  return (
    <div data-testid="clipboard-root" className="mx-auto w-full max-w-lg overflow-x-hidden px-2.5 pb-8 pt-3">
      <header className="mb-3 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[#7eb6ff]">Venture Directors</p>
            <h1 className="text-[1.65rem] font-semibold leading-none tracking-tight">Clipboard</h1>
            <p className="mt-1 text-[12px] text-[#d5dbe6]">Group Transportation, Handled.</p>
          </div>
          <div className="text-right">
            <Link href={backHref} className="text-[12px] font-medium text-[#9ecbff] underline-offset-2 hover:underline">
              {backLabel}
            </Link>
            <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[#9aa6ba]" data-testid="sync-state">
              {sync === "saving" ? "Saving" : sync === "phone" ? "On this phone" : sync === "saved" ? "Saved" : "Opening"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <label className="sr-only" htmlFor="clipboard-program">Program</label>
          <select
            id="clipboard-program"
            data-testid="program-select"
            value={program.id}
            onChange={(event) => chooseProgram(event.target.value)}
            className="h-11 min-w-0 flex-1 rounded-xl border border-white/15 bg-[#0c0e12] px-3 text-sm font-medium text-white"
          >
            {programs.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => setPanel({ type: "program" })} className={chip}>
            + Program
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {program.days.map((item) => (
            <button
              key={item.id}
              type="button"
              data-testid="day-tab"
              data-day={item.label}
              onClick={() => chooseDay(item.id)}
              className={cn(
                "min-h-10 rounded-full px-3 py-1 text-left text-[12px] font-semibold leading-tight",
                item.id === day?.id
                  ? "bg-gradient-to-r from-[#1E90FF] to-[#8B5CF6] text-white"
                  : "bg-[#141820] text-[#d5dbe6] ring-1 ring-white/10",
              )}
            >
              {item.label}
            </button>
          ))}
          <button type="button" data-testid="new-day" onClick={() => setPanel({ type: "new-day" })} className={chip}>
            + New Day
          </button>
        </div>
      </header>

      {day ? (
        <DaySheet
          day={day}
          copied={copied}
          breakEditId={breakEditId}
          onCopy={(key, text) => void copyBlock(key, text)}
          onEditDay={() => setPanel({ type: "edit-day" })}
          onAddRoster={() => setPanel({ type: "roster", id: null })}
          onEditRoster={(id) => setPanel({ type: "roster", id })}
          onBreakEdit={setBreakEditId}
          onBreak={(id, breakText) =>
            patchDay(
              (current) => ({
                ...current,
                roster: current.roster.map((row) => (row.id === id ? { ...row, breakText: breakText.trim() || "--" } : row)),
              }),
              true,
            )
          }
          onSelectRoster={(id) => patchDay((current) => selectRoster(current, id), true)}
          onCycle={(direction) => patchDay((current) => cycleRoster(current, direction), true)}
          onHeadway={(headway) => patchDay((current) => ({ ...current, headwayMinutes: headway }), true)}
          onNextDispatch={(nextDispatch) => patchDay((current) => ({ ...current, nextDispatch }), false)}
          onNudgeTime={(delta) => patchDay((current) => ({ ...current, nextDispatch: addMinutes(current.nextDispatch, delta) }), true)}
          onNow={() => patchDay((current) => ({ ...current, nextDispatch: nowClock() }), true)}
          onCount={(stop, delta) => patchDay((current) => nudgeCount(current, stop, delta), true)}
          onReset={() => patchDay((current) => resetCount(current), true)}
          onSplit={(splitMode) => patchDay((current) => ({ ...current, splitMode }), true)}
          onLogged={(pendingLogged) => patchDay((current) => ({ ...current, pendingLogged }), true)}
          onNote={(pendingNote) => patchDay((current) => ({ ...current, pendingNote }), false)}
          onDepart={() =>
            patchDay((current) => {
              const next = logDeparture(current);
              const run = next.runs[next.runs.length - 1];
              const previous = current.runs[current.runs.length - 1];
              if (run && run !== previous) void publishCurbRun(run);
              return next;
            }, true)
          }
          onToggleRun={(id) =>
            patchDay(
              (current) => ({
                ...current,
                runs: current.runs.map((run) => (run.id === id ? { ...run, logged: !run.logged } : run)),
              }),
              true,
            )
          }
          onAddRun={() => setPanel({ type: "run", id: null })}
          onEditRun={(id) => setPanel({ type: "run", id })}
          withPhones={withPhones}
          onPhones={setWithPhones}
          onAutoAssign={() => patchDay((current) => ({ ...current, roster: autoAssignPucks(current.roster) }), true)}
          onCycleBreak={(id) =>
            patchDay((current) => ({ ...current, roster: current.roster.map((row) => (row.id === id ? cycleBreak(row) : row)) }), true)
          }
          onZero={() => patchDay((current) => setCount(current, 0), true)}
          onToRoute={() => patchDay((current) => ({ ...setCount(current, 0), pendingNote: "to route" }), true)}
          onSyncRun={(id) =>
            patchDay((current) => ({ ...current, runs: current.runs.map((run) => (run.id === id ? { ...run, synced: !run.synced } : run)) }), true)
          }
          onSyncBatch={() => patchDay((current) => markBatchSynced(current), true)}
          onMode={(mode) =>
            patchDay((current) => ({
              ...current,
              mode,
              ingress: mode === "special" && current.ingress.length === 0 ? blankIngress() : current.ingress,
              overageEnabled: mode === "special" ? current.overageEnabled : current.overageEnabled,
              departureStop: mode === "special" && !current.departureStop ? "Universal" : current.departureStop || "Residence Inn",
            }), true)
          }
          onIngress={(id, count) =>
            patchDay((current) => ({ ...current, ingress: current.ingress.map((stop) => (stop.id === id ? { ...stop, count } : stop)) }), true)
          }
          onOverage={(overageEnabled) => patchDay((current) => ({ ...current, overageEnabled }), true)}
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-white/20 px-4 py-10 text-center">
          <p className="text-sm text-[#d5dbe6]">No day on this program yet.</p>
          <button type="button" onClick={() => setPanel({ type: "new-day" })} className={cn(chip, "mt-3")}>
            + New Day
          </button>
        </div>
      )}

      {panel?.type === "program" ? (
        <ProgramSheet
          onClose={() => setPanel(null)}
          onCreate={(name) => {
            const created: ClipboardProgram = { id: newId(), name, days: [] };
            const next = [...(latest.current ?? []), created];
            commit(next, true);
            selection.current = { programId: created.id, dayId: "" };
            setProgramId(created.id);
            setDayId(null);
            setPanel(null);
          }}
        />
      ) : null}
      {panel?.type === "new-day" ? (
        <NewDaySheet
          count={program.days.length + 1}
          yesterday={yesterday}
          onClose={() => setPanel(null)}
          onCreate={(created) => {
            const next = (latest.current ?? []).map((item) =>
              item.id === program.id ? { ...item, days: [...item.days, created] } : item,
            );
            commit(next, true);
            selection.current = { programId: program.id, dayId: created.id };
            setDayId(created.id);
            remember(program.id, created.id);
            setPanel(null);
          }}
        />
      ) : null}
      {panel?.type === "edit-day" && day ? (
        <EditDaySheet
          day={day}
          canDelete={program.days.length > 1}
          onClose={() => setPanel(null)}
          onSave={(patch) => {
            patchDay((current) => ({ ...current, ...patch }), true);
            setPanel(null);
          }}
          onDelete={() => {
            const nextDays = program.days.filter((item) => item.id !== day.id);
            const next = (latest.current ?? []).map((item) => (item.id === program.id ? { ...item, days: nextDays } : item));
            const fallback = nextDays[nextDays.length - 1];
            commit(next, true);
            if (fallback) {
              selection.current = { programId: program.id, dayId: fallback.id };
              setDayId(fallback.id);
              remember(program.id, fallback.id);
            }
            setPanel(null);
          }}
        />
      ) : null}
      {panel?.type === "roster" && day ? (
        <RosterSheet
          key={panel.id ?? "new-roster"}
          initial={day.roster.find((row) => row.id === panel.id) ?? null}
          onClose={() => setPanel(null)}
          onSave={(row) => {
            patchDay((current) => {
              const exists = current.roster.some((item) => item.id === row.id);
              const roster = exists ? current.roster.map((item) => (item.id === row.id ? row : item)) : [...current.roster, row];
              const activeRosterId = current.activeRosterId ?? row.id;
              return { ...current, roster, activeRosterId };
            }, true);
            setPanel(null);
          }}
          onDelete={(id) => {
            patchDay((current) => {
              const roster = current.roster.filter((item) => item.id !== id);
              const activeRosterId = current.activeRosterId === id ? roster[0]?.id ?? null : current.activeRosterId;
              return { ...current, roster, activeRosterId };
            }, true);
            setPanel(null);
          }}
        />
      ) : null}
      {panel?.type === "run" && day ? (
        <RunSheet
          key={panel.id ?? "new-run"}
          day={day}
          initial={day.runs.find((run) => run.id === panel.id) ?? null}
          onClose={() => setPanel(null)}
          onSave={(run) => {
            patchDay((current) => {
              const exists = current.runs.some((item) => item.id === run.id);
              const runs = exists ? current.runs.map((item) => (item.id === run.id ? run : item)) : [...current.runs, run];
              return { ...current, runs };
            }, true);
            setPanel(null);
          }}
          onDelete={(id) => {
            patchDay((current) => ({ ...current, runs: current.runs.filter((item) => item.id !== id) }), true);
            setPanel(null);
          }}
        />
      ) : null}
    </div>
  );
}

function DaySheet({
  day,
  copied,
  breakEditId,
  onCopy,
  onEditDay,
  onAddRoster,
  onEditRoster,
  onBreakEdit,
  onBreak,
  onSelectRoster,
  onCycle,
  onHeadway,
  onNextDispatch,
  onNudgeTime,
  onNow,
  onCount,
  onReset,
  onSplit,
  onLogged,
  onNote,
  onDepart,
  onToggleRun,
  onAddRun,
  onEditRun,
  withPhones,
  onPhones,
  onAutoAssign,
  onCycleBreak,
  onZero,
  onToRoute,
  onSyncRun,
  onSyncBatch,
  onMode,
  onIngress,
  onOverage,
}: {
  day: ClipboardDay;
  copied: string | null;
  breakEditId: string | null;
  withPhones: boolean;
  onPhones: (value: boolean) => void;
  onAutoAssign: () => void;
  onCycleBreak: (id: string) => void;
  onZero: () => void;
  onToRoute: () => void;
  onSyncRun: (id: string) => void;
  onSyncBatch: () => void;
  onMode: (mode: ClipboardDay["mode"]) => void;
  onIngress: (id: string, count: number) => void;
  onOverage: (enabled: boolean) => void;
  onCopy: (key: string, text: string) => void;
  onEditDay: () => void;
  onAddRoster: () => void;
  onEditRoster: (id: string) => void;
  onBreakEdit: (id: string | null) => void;
  onBreak: (id: string, value: string) => void;
  onSelectRoster: (id: string) => void;
  onCycle: (direction: -1 | 1) => void;
  onHeadway: (headway: HeadwayMinutes) => void;
  onNextDispatch: (value: string) => void;
  onNudgeTime: (delta: number) => void;
  onNow: () => void;
  onCount: (stop: "a" | "b", delta: number) => void;
  onReset: () => void;
  onSplit: (split: boolean) => void;
  onLogged: (logged: boolean) => void;
  onNote: (note: string) => void;
  onDepart: () => void;
  onToggleRun: (id: string) => void;
  onAddRun: () => void;
  onEditRun: (id: string) => void;
}) {
  const loading = activeRoster(day);
  const site = loading ? loading.siteCode || siteCodeFromBusPuck(loading.busPuck) : "";
  const totals = dayTotals(day);

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] leading-snug text-[#e7edf6]" data-testid="day-notes">{day.notes}</p>
        <button type="button" onClick={onEditDay} className="shrink-0 text-[12px] font-medium text-[#9ecbff]">
          Edit day
        </button>
      </div>
      <div className="grid grid-cols-2 gap-1">
        <button type="button" data-testid="mode-loop" onClick={() => onMode("loop")} className={day.mode === "loop" ? modeOn : modeOff}>Loop</button>
        <button type="button" data-testid="mode-special" onClick={() => onMode("special")} className={day.mode === "special" ? modeOn : modeOff}>Special event</button>
      </div>
      <CrewBar />
      <CurbSelect />
      <RelayStrip />
      {day.mode === "special" ? <IngressCard day={day} onCount={onIngress} onOverage={onOverage} /> : null}

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0c0e12]">
        <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9ecbff]">Driver roster</h2>
          <div className="flex flex-wrap gap-1.5">
            <CopyButton testId="copy-roster" copied={copied === "roster"} label="Copy Roster" onClick={() => onCopy("roster", rosterCopyText(day.roster, withPhones))} />
            <CopyButton testId="copy-breaks" copied={copied === "breaks"} label="Copy Breaks" onClick={() => onCopy("breaks", breaksCopyText(day.roster, withPhones))} />
            <button type="button" onClick={onAddRoster} className={chip}>+ Driver</button>
          </div>
        </div>
        <div className="space-y-2 px-2.5 pb-2">
          <PhoneToggle withPhones={withPhones} onChange={onPhones} />
          <button type="button" data-testid="auto-assign" onClick={onAutoAssign} className="h-11 w-full rounded-xl bg-white text-[13px] font-semibold text-black">
            Auto-Assign Pucks 3.1–3.6 Top-to-Bottom
          </button>
        </div>
        <div className={cn(rosterGrid, "px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#b7c3d6]")}>
          <span>Bus\Puck</span>
          <span>Driver</span>
          <span>Phone</span>
          <span>Break</span>
        </div>
        <ul data-testid="roster">
          {day.roster.map((row) => (
            <li
              key={row.id}
              data-testid="roster-row"
              className={cn(
                cn(rosterGrid, "border-t border-white/10 px-2 py-1.5"),
                row.id === loading?.id && "bg-white/[0.04]",
              )}
            >
              <button type="button" onClick={() => onEditRoster(row.id)} className="min-w-0 text-left">
                <span className="block truncate font-mono text-[12px] font-semibold text-white">{displayBus(row)}</span>
                {row.siteCode ? <span className="block text-[10px] text-[#8ec5ff]">{row.siteCode}</span> : <span className="block text-[10px] text-[#f0d48a]">No puck</span>}
              </button>
              <button type="button" onClick={() => onEditRoster(row.id)} className="truncate text-left text-[13px] font-medium">
                {row.driver}
              </button>
              <a href={telHref(row.phone) || undefined} className="whitespace-nowrap font-mono text-[11px] text-[#d7e8ff] underline-offset-2 hover:underline">
                {formatPhone(row.phone)}
              </a>
              <div className="min-w-0">
                <button type="button" data-testid="break-status" onClick={() => onCycleBreak(row.id)} className="block w-full truncate text-left text-[11px] font-semibold text-[#d7e8ff]">
                  {BREAK_LABEL[breakStatusOf(row)]}
                </button>
                {breakEditId === row.id ? (
                  <input
                    autoFocus
                    defaultValue={row.breakText === "--" ? "" : row.breakText}
                    aria-label={`Break for ${row.driver}`}
                    onBlur={(event) => {
                      onBreak(row.id, event.target.value);
                      onBreakEdit(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") (event.target as HTMLInputElement).blur();
                    }}
                    className="mt-1 h-8 w-full min-w-0 rounded-md border border-[#1E90FF] bg-black px-1.5 text-[12px] text-white"
                  />
                ) : (
                  <button type="button" onClick={() => onBreakEdit(row.id)} className="block w-full truncate text-left text-[11px] text-[#f2f5fb]">
                    {row.breakText || "--"}
                  </button>
                )}
              </div>
            </li>
          ))}
          {day.roster.length === 0 ? <li className="px-3 py-4 text-sm text-[#b7c3d6]">Add the first driver.</li> : null}
        </ul>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-[#0c0e12] p-2.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9ecbff]">On deck</h2>
          <button
            type="button"
            data-testid="split-toggle"
            aria-pressed={day.splitMode}
            onClick={() => onSplit(!day.splitMode)}
            className={cn(chip, day.splitMode && "bg-[#1E90FF] text-white")}
          >
            {day.splitMode ? `${day.stopAName} / ${day.stopBName}` : "Split stops"}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Previous bus" onClick={() => onCycle(-1)} className={cycleBtn}>‹</button>
          <div className="min-w-0 flex-1 text-center" data-testid="loading-bus">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[#9ecbff]">Currently loading</p>
            <p className="truncate font-mono text-2xl font-semibold leading-tight">{loading?.busPuck ?? "No bus"}</p>
            <p className="truncate text-sm text-[#e7edf6]">
              {loading ? `${loading.driver}${site ? ` · ${site}` : ""}` : "Add a driver to load"}
            </p>
          </div>
          <button type="button" aria-label="Next bus" onClick={() => onCycle(1)} className={cycleBtn}>›</button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {day.roster.map((row) => (
            <button
              key={row.id}
              type="button"
              data-testid="roster-chip"
              onClick={() => onSelectRoster(row.id)}
              className={cn(
                "min-h-11 min-w-[30%] flex-1 rounded-xl border px-2 py-1 text-left",
                row.id === loading?.id
                  ? "border-transparent bg-gradient-to-br from-[#1E90FF] to-[#8B5CF6]"
                  : "border-white/15 bg-black",
              )}
            >
              <span className="block truncate font-mono text-[10px] text-white/80">{row.busPuck}</span>
              <span className="block truncate text-sm font-semibold">{row.driver}</span>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
          <div>
            <label htmlFor="next-dispatch" className="text-[10px] uppercase tracking-[0.16em] text-[#9ecbff]">Next dispatch</label>
            <div className="mt-1 flex items-center gap-1">
              <button type="button" aria-label="Five minutes earlier" onClick={() => onNudgeTime(-5)} className={miniBtn}>−5m</button>
              <input
                id="next-dispatch"
                data-testid="next-dispatch"
                value={day.nextDispatch}
                onChange={(event) => onNextDispatch(event.target.value)}
                className="h-11 min-w-0 flex-1 rounded-xl border border-white/15 bg-black px-2 text-center font-mono text-lg font-semibold"
              />
              <button type="button" aria-label="Five minutes later" onClick={() => onNudgeTime(5)} className={miniBtn}>+5m</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1">
            <button type="button" data-testid="headway-15" aria-pressed={day.headwayMinutes === 15} onClick={() => onHeadway(15)} className={headwayClass(day.headwayMinutes === 15)}>15m</button>
            <button type="button" data-testid="headway-20" aria-pressed={day.headwayMinutes === 20} onClick={() => onHeadway(20)} className={headwayClass(day.headwayMinutes === 20)}>20m</button>
            <button type="button" data-testid="now-button" onClick={onNow} className="col-span-2 h-10 rounded-xl bg-white text-sm font-semibold text-black">Now</button>
          </div>
        </div>

        {day.splitMode ? (
          <div className="grid grid-cols-2 gap-2">
            <Counter name={day.stopAName} value={day.clickerA} testPrefix="stop-a" onDelta={(delta) => onCount("a", delta)} onReset={() => onCount("a", -9999)} />
            <Counter name={day.stopBName} value={day.clickerB} testPrefix="stop-b" onDelta={(delta) => onCount("b", delta)} onReset={() => onCount("b", -9999)} />
          </div>
        ) : (
          <Counter name="Boarding" value={day.clickerA} large testPrefix="stop-a" onDelta={(delta) => onCount("a", delta)} onReset={onReset} />
        )}
        <p className="text-center text-sm font-medium text-[#e7edf6]" data-testid="clicker-count">
          {day.splitMode ? `Total ${boardingTotal(day)}` : `${boardingTotal(day)} on board`}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" data-testid="zero-pax" onClick={onZero} className={chip + " h-11 justify-center"}>0 pax</button>
          <button type="button" data-testid="zero-route" onClick={onToRoute} className={chip + " h-11 justify-center"}>0 pax (to route)</button>
        </div>
        <label className="flex min-h-12 items-center gap-3 rounded-xl bg-black px-3 text-sm">
          <input
            data-testid="log-site-toggle"
            type="checkbox"
            checked={day.pendingLogged}
            onChange={(event) => onLogged(event.target.checked)}
            className="size-6 accent-[#1E90FF]"
          />
          <span>{site ? <>Log to client site <strong>{site} ✓</strong></> : "No client site code on this bus"}</span>
        </label>
        <input
          data-testid="site-note"
          value={day.pendingNote}
          onChange={(event) => onNote(event.target.value)}
          placeholder="Optional site note"
          className={field}
        />
        <button
          type="button"
          data-testid="depart"
          disabled={!loading}
          onClick={onDepart}
          className="h-14 w-full rounded-2xl bg-gradient-to-r from-[#1E90FF] to-[#8B5CF6] text-lg font-semibold text-white disabled:opacity-40"
        >
          Depart / Log Run
        </button>
      </section>

      <BatchPanel day={day} onSync={onSyncBatch} />
      {day.mode === "special" ? <EgressFooter day={day} /> : null}
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0c0e12]" data-testid={day.mode === "special" ? "egress-log" : "loop-log"}>
        <div className="space-y-2 px-2.5 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9ecbff]">{day.mode === "special" ? "Egress returns" : "Dispatch log"}</h2>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[12px] text-[#d5dbe6]">{totals.runs} runs · {totals.pax} pax</span>
            <button type="button" onClick={onAddRun} className={chip}>+ Run</button>
          </div>
          <CopyButton
            testId="copy-last"
            copied={copied === "last"}
            label="Copy Last Departure"
            onClick={() => {
              const last = day.runs[day.runs.length - 1];
              if (last) onCopy("last", departureCopyText(last, day));
            }}
          />
        </div>
        <div className={cn(logGrid, "px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#b7c3d6]")}>
          <span>Time</span>
          <span>Bus\Puck</span>
          <span>Driver</span>
          <span>Pax</span>
          <span>Site</span>
        </div>
        <ul data-testid="dispatch-log">
          {day.runs.map((run, index) => (
            <li key={run.id} data-testid="run-row" className="border-t border-white/10 px-2 py-1.5 text-[12px]">
              <div className={logGrid}>
                <button type="button" data-testid="run-time" onClick={() => onEditRun(run.id)} className="text-left font-mono font-medium">
                  {run.timeLabel}
                </button>
                <span className="truncate font-mono">{run.busPuck.replace(/\\/g, "/")}</span>
                <span className="truncate">{run.driver}</span>
                <span className="font-semibold tabular-nums" data-testid="run-pax">
                  {day.mode === "special" ? `${egressRunLabel(day.runs, index)} · ${egressPax(run)}` : egressPax(run)}
                  {day.splitMode ? (
                    <span className="mt-0.5 block text-[10px] font-medium leading-tight text-[#c5d4ea]">
                      {shortStop(day.stopAName)} {run.stopAPax ?? 0}
                      <br />
                      {shortStop(day.stopBName)} {run.stopBPax ?? 0}
                    </span>
                  ) : null}
                </span>
                <button type="button" data-testid="run-site" onClick={() => onToggleRun(run.id)} className="break-words text-left leading-tight text-[#f4f7fb]">
                  {siteLabel(run)}
                </button>
              </div>
              <div className="mt-1 flex items-start justify-between gap-2">
                <p className="min-w-0 text-[11px] leading-snug text-[#d7e8ff]" data-testid="departure-line">{departureCopyText(run, day)}</p>
                <div className="flex shrink-0 gap-1">
                  <button type="button" data-testid="copy-departure" onClick={() => onCopy(`run-${run.id}`, departureCopyText(run, day))} className="h-8 rounded-lg bg-white/10 px-2 text-[11px] font-semibold">
                    {copied === `run-${run.id}` ? "Copied" : "Copy"}
                  </button>
                  <button type="button" data-testid="sync-run" onClick={() => onSyncRun(run.id)} className="h-8 rounded-lg bg-white/10 px-2 text-[11px] font-semibold">
                    {run.synced === false ? "Pending" : "Synced"}
                  </button>
                </div>
              </div>
            </li>
          ))}
          {day.runs.length === 0 ? <li className="px-3 py-4 text-sm text-[#b7c3d6]">No runs logged yet.</li> : null}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-black px-2.5 py-2.5" data-testid="log-summary">
          <p className="text-sm font-semibold leading-snug">{summaryLine(day)}</p>
          <CopyButton testId="copy-log" copied={copied === "log"} label="Copy Dispatch Log" onClick={() => onCopy("log", dispatchLogCopyText(day))} />
        </div>
        </div>
      </section>
    </div>
  );
}

function Counter({
  name,
  value,
  large,
  testPrefix,
  onDelta,
  onReset,
}: {
  name: string;
  value: number;
  large?: boolean;
  testPrefix: string;
  onDelta: (delta: number) => void;
  onReset: () => void;
}) {
  return (
    <div className="rounded-2xl bg-black px-2 py-2">
      <p className="text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9ecbff]">{name}</p>
      <p className={cn("text-center font-mono font-semibold tabular-nums leading-none", large ? "text-7xl" : "text-5xl")} data-testid={`${testPrefix}-value`}>
        {value}
      </p>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        <button type="button" data-testid={`${testPrefix}-minus`} aria-label={`Remove one ${name}`} onClick={() => onDelta(-1)} className={countBtn}>−1</button>
        <button type="button" data-testid={`${testPrefix}-plus`} aria-label={`Add one ${name}`} onClick={() => onDelta(1)} className={cn(countBtn, "bg-gradient-to-b from-[#1E90FF] to-[#3b6cff]")}>+1</button>
        <button type="button" data-testid={`${testPrefix}-plus5`} aria-label={`Add five ${name}`} onClick={() => onDelta(5)} className={countBtn}>+5</button>
      </div>
      <button type="button" data-testid={`${testPrefix}-reset`} onClick={onReset} className="mt-1.5 h-10 w-full rounded-xl text-sm font-semibold text-[#d5dbe6] ring-1 ring-white/15">
        Reset
      </button>
    </div>
  );
}

function CopyButton({ label, copied, onClick, testId }: { label: string; copied: boolean; onClick: () => void; testId: string }) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className={cn(
        "h-9 rounded-lg px-2.5 text-[12px] font-semibold",
        copied ? "bg-emerald-400 text-black" : "bg-white/10 text-white ring-1 ring-white/15",
      )}
    >
      {copied ? "Copied" : label}
    </button>
  );
}

function ProgramSheet({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string) => void }) {
  const [name, setName] = useState("");
  return (
    <Sheet title="New program" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim()) return;
          onCreate(name.trim());
        }}
      >
        <input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Program name" className={field} />
        <button type="submit" className={primaryBtn}>Create program</button>
      </form>
    </Sheet>
  );
}

function NewDaySheet({
  count,
  yesterday,
  onClose,
  onCreate,
}: {
  count: number;
  yesterday: ClipboardDay | null;
  onClose: () => void;
  onCreate: (day: ClipboardDay) => void;
}) {
  const [date, setDate] = useState("");
  const [label, setLabel] = useState(`Day ${count}`);
  const [labelDirty, setLabelDirty] = useState(false);
  const [location, setLocation] = useState("");
  const [repeat, setRepeat] = useState(Boolean(yesterday?.roster.length));

  return (
    <Sheet title="New day" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          const roster = repeat && yesterday ? repeatRoster(yesterday.roster) : [];
          onCreate({
            id: newId(),
            label: label.trim() || `Day ${count}`,
            notes: describeDay(date, location),
            splitMode: false,
            stopAName: "Hilton",
            stopBName: "Element",
            headwayMinutes: yesterday?.headwayMinutes ?? 15,
            nextDispatch: "7:00 AM",
            activeRosterId: roster[0]?.id ?? null,
            clickerA: 0,
            clickerB: 0,
            pendingLogged: Boolean(roster[0]?.siteCode),
            pendingNote: "",
            mode: "loop",
            seedRevision: "",
            departureStop: "Residence Inn",
            ingress: [],
            overageEnabled: false,
            roster,
            runs: [],
          });
        }}
      >
        <label className="block text-xs text-[#c5d0e2]">
          Date
          <input
            type="date"
            value={date}
            onChange={(event) => {
              const next = event.target.value;
              setDate(next);
              if (!labelDirty) setLabel(suggestDayLabel(next, count));
            }}
            className={cn(field, "mt-1")}
          />
        </label>
        <label className="block text-xs text-[#c5d0e2]">
          Label
          <input
            data-testid="new-day-label"
            value={label}
            onChange={(event) => {
              setLabelDirty(true);
              setLabel(event.target.value);
            }}
            className={cn(field, "mt-1")}
          />
        </label>
        <label className="block text-xs text-[#c5d0e2]">
          Location notes
          <input
            data-testid="new-day-location"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Residence Inn SeaWorld Dispatch"
            className={cn(field, "mt-1")}
          />
        </label>
        <label className="flex min-h-12 items-start gap-3 rounded-xl bg-black px-3 py-3 text-sm">
          <input
            data-testid="repeat-roster"
            type="checkbox"
            checked={repeat}
            disabled={!yesterday?.roster.length}
            onChange={(event) => setRepeat(event.target.checked)}
            className="mt-0.5 size-6 accent-[#1E90FF]"
          />
          <span>
            <span className="block font-medium">Repeat yesterday&apos;s driver roster</span>
            <span className="mt-0.5 block text-[12px] text-[#b7c3d6]">
              {yesterday
                ? `Copies drivers, bus\\puck, and phones from ${yesterday.label}. Breaks reset.`
                : "Add a day with a roster first."}
            </span>
          </span>
        </label>
        <button type="submit" data-testid="create-day" className={primaryBtn}>Start day</button>
      </form>
    </Sheet>
  );
}

function EditDaySheet({
  day,
  canDelete,
  onClose,
  onSave,
  onDelete,
}: {
  day: ClipboardDay;
  canDelete: boolean;
  onClose: () => void;
  onSave: (patch: Pick<ClipboardDay, "label" | "notes" | "splitMode" | "stopAName" | "stopBName">) => void;
  onDelete: () => void;
}) {
  const [label, setLabel] = useState(day.label);
  const [notes, setNotes] = useState(day.notes);
  const [splitMode, setSplitMode] = useState(day.splitMode);
  const [stopAName, setStopAName] = useState(day.stopAName);
  const [stopBName, setStopBName] = useState(day.stopBName);
  return (
    <Sheet title="Edit day" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          onSave({
            label: label.trim() || day.label,
            notes: notes.trim(),
            splitMode,
            stopAName: stopAName.trim() || "Stop A",
            stopBName: stopBName.trim() || "Stop B",
          });
        }}
      >
        <input value={label} onChange={(event) => setLabel(event.target.value)} className={field} aria-label="Day label" />
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className={cn(field, "h-auto py-2")} aria-label="Day notes" />
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" checked={splitMode} onChange={(event) => setSplitMode(event.target.checked)} className="size-6 accent-[#1E90FF]" />
          Split passenger counts
        </label>
        {splitMode ? (
          <div className="grid grid-cols-2 gap-2">
            <input value={stopAName} onChange={(event) => setStopAName(event.target.value)} className={field} aria-label="First stop" />
            <input value={stopBName} onChange={(event) => setStopBName(event.target.value)} className={field} aria-label="Second stop" />
          </div>
        ) : null}
        <button type="submit" className={primaryBtn}>Save day</button>
        {canDelete ? (
          <button
            type="button"
            className="h-11 w-full rounded-xl text-sm font-semibold text-rose-300"
            onClick={() => {
              if (window.confirm("Remove this day and its runs?")) onDelete();
            }}
          >
            Remove day
          </button>
        ) : null}
      </form>
    </Sheet>
  );
}

function RosterSheet({
  initial,
  onClose,
  onSave,
  onDelete,
}: {
  initial: RosterRow | null;
  onClose: () => void;
  onSave: (row: RosterRow) => void;
  onDelete: (id: string) => void;
}) {
  const [busPuck, setBusPuck] = useState(initial?.busPuck ?? "");
  const [driver, setDriver] = useState(initial?.driver ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [breakText, setBreakText] = useState(initial?.breakText ?? "--");
  const [siteCode, setSiteCode] = useState(initial?.siteCode ?? "");
  const [fillIn, setFillIn] = useState(initial?.isFillIn ?? false);

  return (
    <Sheet title={initial ? "Edit driver" : "Add driver"} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!busPuck.trim() || !driver.trim()) return;
          const puck = fillIn ? busPuck.trim().replace(/\\/g, "/").split("/")[0] ?? busPuck.trim() : busPuck.trim().replace(/\\/g, "/");
          onSave({
            id: initial?.id ?? newId(),
            busPuck: puck,
            driver: driver.trim(),
            phone: formatPhone(phone),
            breakText: breakText.trim() || "--",
            siteCode: fillIn ? "" : siteCode.trim() || siteCodeFromBusPuck(puck),
            isFillIn: fillIn,
            breakStatus: fillIn ? "fill-in" : initial?.breakStatus || "back",
          });
        }}
      >
        <div className="grid grid-cols-2 gap-2">
          <input
            value={busPuck}
            onChange={(event) => {
              const next = event.target.value;
              const previous = siteCodeFromBusPuck(busPuck);
              const derived = siteCodeFromBusPuck(next);
              setBusPuck(next);
              if (!siteCode || siteCode === previous) setSiteCode(derived);
            }}
            placeholder="241\3.1"
            aria-label="Bus puck"
            className={field}
          />
          <input value={driver} onChange={(event) => setDriver(event.target.value)} placeholder="Driver" aria-label="Driver" className={field} />
          <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="407-555-0100" aria-label="Phone" className={field} />
          <input value={breakText} onChange={(event) => setBreakText(event.target.value)} placeholder="8:00-9:30" aria-label="Break" className={field} />
        </div>
        <input value={siteCode} onChange={(event) => setSiteCode(event.target.value)} placeholder="R3-01" aria-label="Site code" className={field} />
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" checked={fillIn} onChange={(event) => setFillIn(event.target.checked)} className="size-6 accent-[#1E90FF]" />
          Fill-in / relief · no puck
        </label>
        <button type="submit" className={primaryBtn}>Save driver</button>
        {initial ? (
          <button
            type="button"
            className="h-11 w-full rounded-xl text-sm font-semibold text-rose-300"
            onClick={() => {
              if (window.confirm(`Remove ${initial.driver} from the roster?`)) onDelete(initial.id);
            }}
          >
            Remove driver
          </button>
        ) : null}
      </form>
    </Sheet>
  );
}

function RunSheet({
  day,
  initial,
  onClose,
  onSave,
  onDelete,
}: {
  day: ClipboardDay;
  initial: DispatchRun | null;
  onClose: () => void;
  onSave: (run: DispatchRun) => void;
  onDelete: (id: string) => void;
}) {
  const [timeLabel, setTimeLabel] = useState(initial?.timeLabel ?? day.nextDispatch);
  const [busPuck, setBusPuck] = useState(initial?.busPuck ?? "");
  const [driver, setDriver] = useState(initial?.driver ?? "");
  const [pax, setPax] = useState(String(initial?.pax ?? 0));
  const [stopA, setStopA] = useState(String(initial?.stopAPax ?? 0));
  const [stopB, setStopB] = useState(String(initial?.stopBPax ?? 0));
  const [siteCode, setSiteCode] = useState(initial?.siteCode ?? "");
  const [siteNote, setSiteNote] = useState(initial?.siteNote ?? "");
  const [logged, setLogged] = useState(initial?.logged ?? false);
  const [unknown, setUnknown] = useState(initial?.paxUnknown ?? false);
  const [advance, setAdvance] = useState(initial?.advance ?? false);

  return (
    <Sheet title={initial ? "Edit run" : "Add run"} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          const stopAPax = Math.max(0, Number(stopA) || 0);
          const stopBPax = Math.max(0, Number(stopB) || 0);
          onSave({
            id: initial?.id ?? newId(),
            timeLabel: timeLabel.trim() || "—",
            busPuck: busPuck.trim(),
            driver: driver.trim(),
            pax: day.splitMode ? stopAPax + stopBPax : Math.max(0, Number(pax) || 0),
            stopAPax: day.splitMode ? stopAPax : null,
            stopBPax: day.splitMode ? stopBPax : null,
            siteCode: siteCode.trim() || siteCodeFromBusPuck(busPuck),
            siteNote: siteNote.trim() === "--" ? "" : siteNote.trim(),
            logged,
            synced: initial?.synced ?? false,
            paxUnknown: unknown,
            advance,
            stopName: initial?.stopName ?? day.departureStop,
          });
        }}
      >
        <div className="grid grid-cols-2 gap-2">
          <input value={timeLabel} onChange={(event) => setTimeLabel(event.target.value)} aria-label="Time" className={field} />
          <input
            value={busPuck}
            onChange={(event) => {
              const next = event.target.value;
              const previous = siteCodeFromBusPuck(busPuck);
              const derived = siteCodeFromBusPuck(next);
              setBusPuck(next);
              if (!siteCode || siteCode === previous) setSiteCode(derived);
            }}
            aria-label="Bus puck"
            className={field}
          />
          <input value={driver} onChange={(event) => setDriver(event.target.value)} aria-label="Driver" className={field} />
          {day.splitMode ? (
            <>
              <input value={stopA} onChange={(event) => setStopA(event.target.value)} aria-label={day.stopAName} inputMode="numeric" className={field} />
              <input value={stopB} onChange={(event) => setStopB(event.target.value)} aria-label={day.stopBName} inputMode="numeric" className={field} />
            </>
          ) : (
            <input value={pax} onChange={(event) => setPax(event.target.value)} aria-label="Passengers" inputMode="numeric" className={field} />
          )}
        </div>
        <input value={siteCode} onChange={(event) => setSiteCode(event.target.value)} aria-label="Site code" placeholder="R3-01" className={field} />
        <input value={siteNote} onChange={(event) => setSiteNote(event.target.value)} aria-label="Site note" placeholder="Mid-route jump start" className={field} />
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" checked={logged} onChange={(event) => setLogged(event.target.checked)} className="size-6 accent-[#1E90FF]" />
          Logged to client site
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" checked={unknown} onChange={(event) => setUnknown(event.target.checked)} className="size-6 accent-[#1E90FF]" />
          Uncounted pax (--)
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" checked={advance} onChange={(event) => setAdvance(event.target.checked)} className="size-6 accent-[#1E90FF]" />
          0 pax to route
        </label>
        <button type="submit" className={primaryBtn}>Save run</button>
        {initial ? (
          <button
            type="button"
            className="h-11 w-full rounded-xl text-sm font-semibold text-rose-300"
            onClick={() => {
              if (window.confirm("Remove this run from the log?")) onDelete(initial.id);
            }}
          >
            Remove run
          </button>
        ) : null}
      </form>
    </Sheet>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75" role="presentation" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/10 bg-[#101218] p-4 pb-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-10 place-items-center rounded-full bg-white/10 text-lg">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const rosterGrid = "grid grid-cols-[4.35rem_3.7rem_minmax(6.3rem,1.05fr)_minmax(0,0.95fr)] gap-x-1";
const logGrid = "grid grid-cols-[4.55rem_4.2rem_minmax(0,0.62fr)_3.35rem_minmax(0,1.15fr)] gap-x-1";
const chip = "inline-flex h-10 shrink-0 items-center rounded-full bg-[#141820] px-3 text-[12px] font-semibold text-white ring-1 ring-white/15 touch-manipulation";
const modeOn = "h-11 rounded-xl bg-gradient-to-r from-[#1E90FF] to-[#8B5CF6] text-[12px] font-semibold text-white";
const modeOff = "h-11 rounded-xl bg-[#141820] text-[12px] font-semibold text-[#d5dbe6] ring-1 ring-white/10";
const field = "h-11 w-full rounded-xl border border-white/15 bg-black px-3 text-base text-white outline-none focus:border-[#1E90FF]";
const primaryBtn = "h-12 w-full rounded-xl bg-gradient-to-r from-[#1E90FF] to-[#8B5CF6] text-base font-semibold text-white touch-manipulation";
const cycleBtn = "grid size-12 shrink-0 place-items-center rounded-2xl bg-black text-3xl leading-none text-white ring-1 ring-white/15 touch-manipulation";
const miniBtn = "h-11 rounded-xl bg-black px-2 text-[12px] font-semibold text-white ring-1 ring-white/15 touch-manipulation";
const countBtn = "h-16 rounded-2xl bg-[#16181e] text-2xl font-semibold text-white ring-1 ring-white/10 touch-manipulation active:translate-y-px";

function headwayClass(active: boolean) {
  return cn(
    "h-10 rounded-xl px-3 text-sm font-semibold touch-manipulation",
    active ? "bg-white text-black" : "bg-black text-white ring-1 ring-white/15",
  );
}

function shortStop(name: string) {
  return name.slice(0, 3);
}

function readSelection() {
  try {
    const raw = localStorage.getItem(SELECTION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { programId?: string; dayId?: string };
    if (!parsed.programId || !parsed.dayId) return null;
    return { programId: parsed.programId, dayId: parsed.dayId };
  } catch {
    return null;
  }
}

function remember(programId: string, dayId: string) {
  try {
    localStorage.setItem(SELECTION_KEY, JSON.stringify({ programId, dayId }));
  } catch {
    /* private mode */
  }
}

function readLocalPrograms() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return syncOfficialDays(buildSeedPrograms()).programs;
    const parsed = JSON.parse(raw) as ClipboardProgram[];
    if (!Array.isArray(parsed) || parsed.length === 0) return syncOfficialDays(buildSeedPrograms()).programs;
    return syncOfficialDays(parsed).programs;
  } catch {
    return syncOfficialDays(buildSeedPrograms()).programs;
  }
}

async function writeClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
