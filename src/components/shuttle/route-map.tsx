"use client";

import { useMemo, useRef, useState } from "react";
import type { RouteLeg, ShuttleStop } from "@/lib/shuttle/types";

type BusMarker = {
  id: string;
  lat: number;
  lng: number;
  heading: number | null;
  label: string;
  detail: string;
};

export function RouteMap({
  stops,
  order,
  legs,
  buses,
  selectedId,
  onSelect,
}: {
  stops: ShuttleStop[];
  order: string[];
  legs: RouteLeg[];
  buses: BusMarker[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const width = 360;
  const height = 280;
  const frame = useMemo(() => {
    const ids = new Set(order);
    const shown = stops.filter((stop) => ids.has(stop.id) || stop.kind === "depot");
    const walk = shown.flatMap((stop) =>
      stop.walkOvers.filter((item): item is typeof item & { lat: number; lng: number } => typeof item.lat === "number" && typeof item.lng === "number"),
    );
    const points = [...shown, ...walk];
    const lats = points.map((point) => point.lat);
    const lngs = points.map((point) => point.lng);
    const latSpan = Math.max(...lats) - Math.min(...lats) || 0.02;
    const lngSpan = Math.max(...lngs) - Math.min(...lngs) || 0.02;
    return {
      shown,
      walk,
      north: Math.max(...lats) + latSpan * 0.22,
      south: Math.min(...lats) - latSpan * 0.22,
      east: Math.max(...lngs) + lngSpan * 0.22,
      west: Math.min(...lngs) - lngSpan * 0.22,
    };
  }, [order, stops]);
  const visible = frame.shown;

  function project(lat: number, lng: number) {
    const x = 18 + ((lng - frame.west) / (frame.east - frame.west)) * (width - 36);
    const y = 18 + ((frame.north - lat) / (frame.north - frame.south)) * (height - 36);
    return { x, y };
  }

  const route = legs
    .map((leg) => {
      const from = stops.find((stop) => stop.id === leg.from);
      const to = stops.find((stop) => stop.id === leg.to);
      if (!from || !to) return "";
      const a = project(from.lat, from.lng);
      const b = project(to.lat, to.lng);
      return `${a.x},${a.y} ${b.x},${b.y}`;
    })
    .filter(Boolean);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#07090d]" data-testid="route-map">
      <div className="flex items-center justify-between px-2.5 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9ecbff]">Route 3</p>
        <div className="flex gap-1">
          <button type="button" className={zoomBtn} onClick={() => setZoom((value) => Math.max(1, value - 0.25))} aria-label="Zoom out">−</button>
          <button type="button" className={zoomBtn} onClick={() => setZoom((value) => Math.min(3, value + 0.25))} aria-label="Zoom in">+</button>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-72 w-full touch-none"
        role="img"
        aria-label="Route 3 live map"
        onPointerDown={(event) => {
          drag.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
        }}
        onPointerMove={(event) => {
          if (!drag.current) return;
          setPan({
            x: drag.current.panX + (event.clientX - drag.current.x),
            y: drag.current.panY + (event.clientY - drag.current.y),
          });
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerLeave={() => {
          drag.current = null;
        }}
      >
        <rect width={width} height={height} fill="#07090d" />
        <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
          <polyline points={route.join(" ")} fill="none" stroke="#1E90FF" strokeWidth={3 / zoom} strokeLinejoin="round" strokeLinecap="round" opacity={0.9} />
          {visible.map((stop) => {
            const point = project(stop.lat, stop.lng);
            const index = order.indexOf(stop.id);
            const badge = stop.kind === "depot" ? "Y" : stop.kind === "hub" ? "H" : stop.kind === "event" ? "CN" : index > 0 ? String(index) : stop.code;
            const active = selectedId === stop.id;
            return (
              <g key={stop.id} onClick={() => onSelect(stop.id)} data-testid={`stop-${stop.id}`} className="cursor-pointer">
                <circle cx={point.x} cy={point.y} r={active ? 11 : 8} fill={active ? "#8B5CF6" : "#101820"} stroke="#f4f7fb" strokeWidth={1.4} />
                <text x={point.x} y={point.y + 3} textAnchor="middle" fontSize={7} fill="white" fontWeight={700}>{badge}</text>
                <text x={point.x + 12} y={point.y - 8} fontSize={8} fill="#f4f7fb">{short(stop)}{stop.walkOvers.length ? " · walk" : ""}</text>
              </g>
            );
          })}
          {frame.walk.map((item) => {
            const point = project(item.lat, item.lng);
            return (
              <g key={item.name}>
                <circle cx={point.x} cy={point.y} r={4} fill="#8B5CF6" />
                <text x={point.x + 7} y={point.y + 3} fontSize={7} fill="#d7c7ff">{item.name.split(" ")[0]}</text>
              </g>
            );
          })}
          {buses.map((bus) => {
            const point = project(bus.lat, bus.lng);
            return (
              <g key={bus.id} transform={`translate(${point.x} ${point.y}) rotate(${bus.heading ?? 0})`} data-testid={`bus-${bus.id}`}>
                <polygon points="0,-9 7,8 -7,8" fill="#1E90FF" stroke="white" strokeWidth={0.8} />
                <g transform={`rotate(${-(bus.heading ?? 0)})`}>
                  <text x={9} y={-6} fontSize={8} fill="white" fontWeight={700}>{bus.label}</text>
                </g>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

function short(stop: ShuttleStop) {
  if (stop.id === "occw") return "OCCC West";
  if (stop.id === "r3-s1") return "Residence Inn";
  if (stop.id === "r3-s2") return "Hilton GV";
  if (stop.id === "r3-s3") return "Element";
  if (stop.id === "r3-s4") return "SpringHill";
  if (stop.id === "uioa") return "Islands of Adventure";
  if (stop.kind === "depot") return "Depot";
  return stop.name.split(" ").slice(0, 2).join(" ");
}

const zoomBtn = "grid size-8 place-items-center rounded-lg bg-white/10 text-sm font-semibold";
