import type { ReactNode } from "react";

export function SwipeRow({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="px-1 text-xl font-bold tracking-tight text-white">{title}</h2>
      <div className="vd-swipe -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1">{children}</div>
    </section>
  );
}

export function SwipeCard({
  kicker,
  title,
  time,
  status,
  tone = "accent",
  onClick,
}: {
  kicker: string;
  title: string;
  time: string;
  status: string;
  tone?: "accent" | "green" | "amber" | "red" | "muted";
  onClick?: () => void;
}) {
  const toneClass = {
    accent: "text-[#4da3ff]",
    green: "text-[#30d158]",
    amber: "text-[#ffb340]",
    red: "text-[#ff6961]",
    muted: "text-vd-muted",
  }[tone];
  const className = "vd-press flex w-[78%] max-w-xs shrink-0 snap-start flex-col rounded-card bg-vd-card p-4 text-left ring-1 ring-white/10";
  const body = (
    <>
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-vd-muted">{kicker}</span>
      <span className="mt-3 text-lg font-bold leading-tight text-white">{title}</span>
      <span className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-white">{time}</span>
      <span className={`mt-2 text-sm font-semibold ${toneClass}`}>{status}</span>
    </>
  );
  if (!onClick) return <article className={className}>{body}</article>;
  return (
    <button type="button" className={className} onClick={onClick}>
      {body}
    </button>
  );
}
