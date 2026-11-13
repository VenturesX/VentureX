import Link from "next/link";
import { ClipboardList, Hotel, MessageSquare, Plane, Settings, Users } from "lucide-react";
import { Tile } from "@/components/premium/tile";

const links = [
  ["/light/NBCU", "NBCU board", Plane],
  ["/light/NBCU/intake", "Manifest intake", ClipboardList],
  ["/light/NBCU/setup", "Program setup", Settings],
  ["/light/text", "Text simulator", MessageSquare],
  ["/light/NBCU/client", "Client view", Users],
  ["/light/h/nbcu-20", "Hotel desk", Hotel],
] as const;

export default function LightHome() {
  return (
    <div className="mx-auto w-full max-w-lg space-y-4 px-4 py-6 text-white">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#4da3ff]">VentureX light</p>
      <h1 className="text-3xl font-bold tracking-tight">Airport meet and greet</h1>
      <p className="text-sm text-vd-muted">NBCU Family Weekend is loaded for Nov 5 at MCO.</p>
      <div className="grid grid-cols-3 gap-3">
        {links.map(([href, label, Icon]) => (
          <Tile key={href} href={href} label={label} icon={<Icon className="size-5" />} tone="accent" />
        ))}
      </div>
      <Link href="/team" className="inline-flex min-h-11 items-center text-sm font-semibold text-[#4da3ff]">Team Login</Link>
    </div>
  );
}
