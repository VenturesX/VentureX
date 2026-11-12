export function PhotoCard({
  title,
  subtitle,
  gradient,
  onClick,
}: {
  title: string;
  subtitle: string;
  gradient: string;
  onClick?: () => void;
}) {
  const className = "vd-press relative flex h-40 w-[72%] max-w-xs shrink-0 snap-start flex-col justify-end overflow-hidden rounded-tile p-4 text-left";
  const body = (
    <>
      <span className="pointer-events-none absolute inset-0" style={{ background: gradient }} aria-hidden="true" />
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" aria-hidden="true" />
      <span className="relative text-lg font-bold text-white">{title}</span>
      <span className="relative text-sm text-white/80">{subtitle}</span>
    </>
  );
  if (!onClick) return <article className={className}>{body}</article>;
  return (
    <button type="button" className={className} onClick={onClick}>
      {body}
    </button>
  );
}
