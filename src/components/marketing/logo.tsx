import { useId } from "react";

/** Map pin with a forward arrow. The arrow is filled black so it reads as cut into the pin. */
const PIN_PATH =
  "M32 3C19.3 3 9 13.1 9 25.5c0 9.4 6.2 17.6 11.2 23.6C23.7 53.6 28.4 58.6 32 61.5c3.6-2.9 8.3-7.9 11.8-12.4C48.8 43.1 55 34.9 55 25.5 55 13.1 44.7 3 32 3z";
const ARROW_PATH = "M25 17.5 46 25.5 25 33.5Z";

export function VentureMark({ className }: { className?: string }) {
  const id = `vd-pin-${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="10" y1="2" x2="54" y2="62" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E90FF" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <path fill={`url(#${id})`} d={PIN_PATH} />
      <path fill="#000000" d={ARROW_PATH} />
    </svg>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="font-semibold uppercase leading-none text-white">
      <span className={compact ? "block text-[12px] tracking-[0.22em]" : "block text-[15px] tracking-[0.24em]"}>VENTURE</span>
      <span className={compact ? "mt-0.5 block text-[8px] tracking-[0.34em] text-white" : "mt-1 block text-[10px] tracking-[0.36em] text-white"}>
        DIRECTORS
      </span>
    </span>
  );
}
