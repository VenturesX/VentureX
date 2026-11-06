import Link from "next/link";

const links = [
  ["/light/NBCU", "NBCU board"],
  ["/light/NBCU/intake", "Manifest intake"],
  ["/light/NBCU/setup", "Program setup"],
  ["/light/text", "Text simulator"],
  ["/light/NBCU/client", "Client view"],
  ["/light/h/nbcu-20", "Hotel desk"],
];

export default function LightHome() {
  return (
    <div className="mx-auto w-full max-w-lg space-y-3 px-3 py-4 text-white">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9ecbff]">VentureX light</p>
      <h1 className="text-2xl font-semibold">Airport meet and greet</h1>
      <p className="text-sm text-[#d5dbe6]">NBCU Family Weekend is loaded for Nov 5 at MCO.</p>
      <div className="grid gap-2">
        {links.map(([href, label]) => (
          <Link key={href} href={href} className="flex min-h-11 items-center rounded-xl bg-[#141820] px-3 text-sm font-semibold ring-1 ring-white/10">
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
