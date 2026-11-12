export function ProgressRing({
  done,
  total,
  label,
  sample = false,
  compact = false,
}: {
  done: number;
  total: number;
  label: string;
  sample?: boolean;
  compact?: boolean;
}) {
  const safeTotal = Math.max(total, 1);
  const ratio = Math.max(0, Math.min(1, done / safeTotal));
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * ratio;
  return (
    <div className={`flex min-w-0 items-center rounded-card bg-vd-card ring-1 ring-white/10 ${compact ? "gap-2 p-3" : "gap-4 p-4"}`} role="img" aria-label={`${done} of ${total} ${label}${sample ? ", sample" : ""}`}>
      <svg viewBox="0 0 88 88" className={compact ? "size-14 shrink-0" : "size-20 shrink-0"} aria-hidden="true">
        <circle cx="44" cy="44" r={radius} fill="none" stroke="#2a2a2e" strokeWidth="8" />
        {ratio > 0 ? (
          <circle
            cx="44"
            cy="44"
            r={radius}
            fill="none"
            stroke="#30d158"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            transform="rotate(-90 44 44)"
          />
        ) : null}
      </svg>
      <div className="min-w-0">
        <p className={`font-bold tabular-nums tracking-tight text-white ${compact ? "text-lg" : "text-2xl"}`}>
          {done} <span className={`font-semibold text-vd-muted ${compact ? "text-sm" : "text-lg"}`}>of {total}</span>
        </p>
        <p className={`break-words text-vd-muted ${compact ? "text-xs" : "text-sm"}`}>{label}</p>
        {sample ? <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#ffb340]">Sample</p> : null}
      </div>
    </div>
  );
}
