import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const TONES = {
  accent: "bg-[#4da3ff]/15 text-[#4da3ff]",
  green: "bg-[#30d158]/15 text-[#30d158]",
  amber: "bg-[#ff9f0a]/15 text-[#ffb340]",
  red: "bg-[#ff453a]/15 text-[#ff6961]",
} as const;

export type TileTone = keyof typeof TONES;

export function Tile({
  icon,
  label,
  hint,
  tone = "accent",
  href,
  onClick,
  disabled,
}: {
  icon: ReactNode;
  label: string;
  hint?: string;
  tone?: TileTone;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const className = cn(
    "vd-press flex aspect-square min-h-0 w-full min-w-0 flex-col items-start justify-between overflow-hidden rounded-tile bg-vd-elevated p-3 text-left ring-1 ring-white/10",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4da3ff]",
    disabled && "pointer-events-none opacity-50",
  );
  const body = (
    <>
      <span className={cn("grid size-10 place-items-center rounded-2xl", TONES[tone])} aria-hidden="true">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block break-words text-[13px] font-bold leading-tight text-white">{label}</span>
        {hint ? <span className="mt-0.5 line-clamp-2 block break-words text-[11px] leading-tight text-vd-muted">{hint}</span> : null}
      </span>
    </>
  );
  if (href) {
    return (
      <Link href={href} className={className} aria-disabled={disabled}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" className={className} onClick={onClick} disabled={disabled}>
      {body}
    </button>
  );
}
