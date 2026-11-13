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
  shape = "square",
}: {
  icon: ReactNode;
  label: string;
  hint?: string;
  tone?: TileTone;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  shape?: "square" | "row";
}) {
  const className = cn(
    "vd-press flex min-h-0 w-full min-w-0 overflow-hidden rounded-tile bg-vd-elevated text-left ring-1 ring-white/10",
    shape === "row" ? "min-h-24 flex-row items-center gap-4 p-4" : "aspect-square flex-col items-start justify-between p-3",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4da3ff]",
    disabled && "pointer-events-none opacity-50",
  );
  const body = (
    <>
      <span className={cn("grid size-10 place-items-center rounded-2xl", TONES[tone])} aria-hidden="true">
        {icon}
      </span>
      <span className="min-w-0">
        <span className={cn("block break-words font-bold leading-tight text-white", shape === "row" ? "text-lg" : "text-[13px]")}>{label}</span>
        {hint ? <span className={cn("mt-0.5 line-clamp-2 block break-words leading-tight text-vd-muted", shape === "row" ? "text-sm" : "text-[11px]")}>{hint}</span> : null}
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
