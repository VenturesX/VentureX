"use client";

export function RideBar({
  onOpen,
  onLater,
  laterOpen = false,
}: {
  onOpen?: () => void;
  onLater?: () => void;
  laterOpen?: boolean;
}) {
  return (
    <div className="flex h-14 items-center rounded-full bg-vd-elevated pl-5 pr-1.5 ring-1 ring-white/10">
      <button type="button" className="min-w-0 flex-1 truncate text-left text-base font-semibold text-white" onClick={onOpen}>
        Where&apos;s my ride?
      </button>
      <button
        type="button"
        className="vd-press h-11 rounded-full bg-white px-4 text-sm font-bold text-black"
        aria-expanded={laterOpen}
        onClick={onLater}
      >
        Later
      </button>
    </div>
  );
}
