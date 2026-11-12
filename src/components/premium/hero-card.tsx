import type { ReactNode } from "react";

export function HeroCard({
  kicker,
  title,
  line,
  children,
}: {
  kicker: string;
  title: string;
  line: string;
  children?: ReactNode;
}) {
  return (
    <section className="rounded-tile bg-vd-elevated p-5 ring-1 ring-white/10">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#4da3ff]">{kicker}</p>
      <h1 className="mt-2 text-[1.75rem] font-bold leading-tight tracking-tight text-white">{title}</h1>
      <p className="mt-1 text-sm text-vd-muted">{line}</p>
      {children ? <div className="mt-4">{children}</div> : null}
    </section>
  );
}
