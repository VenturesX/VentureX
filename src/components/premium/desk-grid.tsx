import { Bus, Car, ClipboardCheck, ClipboardList, Plane, Radio } from "lucide-react";
import { Tile, type TileTone } from "@/components/premium/tile";

export const DESK_KEYS = ["manifest", "flights", "dispatch", "clipboard", "shuttle", "drive"] as const;
export type DeskKey = (typeof DESK_KEYS)[number];

const TILES: Array<{ key: DeskKey; label: string; hint: string; tone: TileTone; icon: typeof Plane }> = [
  { key: "manifest", label: "Manifest", hint: "Guest list", tone: "accent", icon: ClipboardList },
  { key: "flights", label: "Flights", hint: "Arrivals", tone: "green", icon: Plane },
  { key: "dispatch", label: "Dispatch", hint: "Send downs", tone: "amber", icon: Radio },
  { key: "clipboard", label: "Clipboard", hint: "Check-in", tone: "accent", icon: ClipboardCheck },
  { key: "shuttle", label: "Shuttle", hint: "Loops", tone: "green", icon: Bus },
  { key: "drive", label: "Drive", hint: "On the road", tone: "red", icon: Car },
];

export function DeskGrid({
  hrefFor,
  onOpen,
  disabled,
}: {
  hrefFor?: (key: DeskKey) => string | undefined;
  onOpen?: (key: DeskKey) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {TILES.map((tile) => (
        <Tile
          key={tile.key}
          icon={<tile.icon className="size-5" />}
          label={tile.label}
          hint={tile.hint}
          tone={tile.tone}
          href={hrefFor?.(tile.key)}
          onClick={onOpen ? () => onOpen(tile.key) : undefined}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
