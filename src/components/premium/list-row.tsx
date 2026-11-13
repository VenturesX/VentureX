import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function ListRow({
  icon,
  title,
  subtitle,
  href,
  onClick,
  disabled,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const className = cn(
    "vd-press flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left",
    disabled && "pointer-events-none opacity-50",
  );
  const body = (
    <>
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-black text-[#4da3ff] ring-1 ring-white/10" aria-hidden="true">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-white">{title}</span>
        {subtitle ? <span className="mt-0.5 block text-sm text-vd-muted">{subtitle}</span> : null}
      </span>
      <ChevronRight className="size-5 shrink-0 text-vd-muted" aria-hidden="true" />
    </>
  );
  if (href) return <Link href={href} className={className}>{body}</Link>;
  return (
    <button type="button" className={className} onClick={onClick} disabled={disabled}>
      {body}
    </button>
  );
}
