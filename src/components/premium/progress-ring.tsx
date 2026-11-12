export function ProgressRing({
  done,
  total,
  label,
  sample = false,
}: {
  done: number;
  total: number;
  label: string;
  sample?: boolean;
}) {
  const safeTotal = Math.max(total, 1);
  const ratio = Math.max(0, Math.min(1, done / safeTotal));
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * ratio;
  return (
    <div className="flex items-center gap-4 rounded-card bg-vd-card p-4 ring-1 ring-white/10" role="img" aria-label={`${done} of ${total} ${label}${sample ? ", sample" : ""}`}>
      <svg viewBox="0 0 88 88" className="size-20 shrink-0" aria-hidden="true">
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
      <div>
        <p className="text-2xl font-bold tabular-nums tracking-tight text-white">
          {done} <span className="text-lg font-semibold text-vd-muted">of {total}</span>
        </p>
        <p className="text-sm text-vd-muted">{label}</p>
        {sample ? <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#ffb340]">Sample</p> : null}
      </div>
    </div>
  );
}
