export function VentureMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path fill="#1E90FF" d="M5 16.5h9.2L24.8 42h-8.4L5 16.5Z" />
      <path fill="#1E90FF" d="M22.2 6h10.2L38.6 42h-9.1L22.2 6Z" />
    </svg>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="leading-none">
      <span className={compact ? "block text-[13px] font-semibold tracking-[0.16em]" : "block text-[15px] font-semibold tracking-[0.16em]"}>
        VENTURE
      </span>
      <span className={compact ? "mt-0.5 block text-[9px] tracking-[0.28em] text-white/80" : "mt-1 block text-[10px] tracking-[0.28em] text-white/80"}>
        DIRECTORS
      </span>
    </span>
  );
}
