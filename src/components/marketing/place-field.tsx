"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { PlaceSuggestion } from "@/lib/places";

const fieldClass =
  "h-12 w-full min-w-0 rounded-xl border border-white/15 bg-black px-3 text-base text-white outline-none placeholder:text-white/45 focus:border-[#1E90FF] focus:ring-2 focus:ring-[#1E90FF]/40";

export function PlaceField({
  id,
  name,
  value,
  onChange,
  placeholder,
  invalid,
}: {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  invalid?: boolean;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const suppressQuery = useRef("");
  const dismissed = useRef(false);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PlaceSuggestion[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (suppressQuery.current === value) return;
    const query = value.trim();
    if (query.length < 2) return;
    let cancelled = false;
    const handle = setTimeout(() => {
      void fetch(`/api/places?q=${encodeURIComponent(query)}`)
        .then((response) => response.json())
        .then((json: { places?: PlaceSuggestion[] }) => {
          if (cancelled) return;
          const next = json.places ?? [];
          setItems(next);
          setActive(0);
          setOpen(!dismissed.current && next.length > 0);
        })
        .catch(() => {
          if (!cancelled) setOpen(false);
        });
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [value]);

  useEffect(() => {
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, []);

  function choose(place: PlaceSuggestion) {
    suppressQuery.current = place.label;
    onChange(place.label);
    setOpen(false);
    setItems([]);
  }

  return (
    <div ref={rootRef} className="relative">
      <input
        id={id}
        name={name}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-invalid={invalid}
        role="combobox"
        className={invalid ? `${fieldClass} border-rose-400` : fieldClass}
        onChange={(event) => {
          const next = event.target.value;
          dismissed.current = false;
          onChange(next);
          if (next.trim().length < 2) {
            setItems([]);
            setOpen(false);
          }
        }}
        onFocus={() => {
          if (items.length > 0) setOpen(true);
        }}
        onKeyDown={(event) => {
          if (!open || items.length === 0) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((current) => (current + 1) % items.length);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((current) => (current - 1 + items.length) % items.length);
          } else if (event.key === "Enter" && items[active]) {
            event.preventDefault();
            choose(items[active]);
          } else if (event.key === "Escape") {
            dismissed.current = true;
            setOpen(false);
          }
        }}
      />
      {open && items.length > 0 ? (
        <ul id={listId} role="listbox" className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-[#1E90FF]/50 bg-black py-1 shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
          {items.map((place, index) => (
            <li key={place.id} role="option" aria-selected={index === active}>
              <button
                type="button"
                className={`block w-full px-3 py-2.5 text-left text-sm ${index === active ? "bg-[#1E90FF]/20" : ""}`}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(place)}
              >
                <span className="block font-medium text-white">{place.name}</span>
                {place.address ? <span className="mt-0.5 block text-xs text-white/60">{place.address}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
