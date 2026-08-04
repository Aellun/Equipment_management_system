"use client";

// Uber-style location picker: type a place, get live suggestions, pick one
// and the exact coordinates come with it. Powered by OpenStreetMap Nominatim
// (free, no API key), biased to Kenya. Distance between two picked points is
// computed by the companion helpers below (OSRM road distance, haversine
// fallback), so the booking form can auto-fill distance the way ride apps do.

import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";

export interface PlacePick {
  label: string;
  lat: number;
  lon: number;
}

interface Suggestion {
  display_name: string;
  lat: string;
  lon: string;
}

const NOMINATIM = "https://nominatim.openstreetmap.org/search";

export default function LocationInput({
  label,
  placeholder,
  value,
  onChange,
  icon = "map-pin",
}: {
  label: string;
  placeholder?: string;
  value: PlacePick | null;
  onChange: (place: PlacePick | null, typedText: string) => void;
  icon?: string;
}) {
  const [text, setText] = useState(value?.label ?? "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController | null>(null);

  // Close the dropdown on outside click.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const search = (q: string) => {
    abortRef.current?.abort();
    if (q.trim().length < 3) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    const ctl = new AbortController();
    abortRef.current = ctl;
    setLoading(true);
    const params = new URLSearchParams({
      format: "json",
      q,
      countrycodes: "ke",
      limit: "5",
    });
    fetch(`${NOMINATIM}?${params}`, { signal: ctl.signal, headers: { Accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : []))
      .then((list: Suggestion[]) => {
        setSuggestions(list);
        setOpen(true);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const handleType = (q: string) => {
    setText(q);
    // Typing invalidates the previous pick — coordinates must come from a selection.
    onChange(null, q);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q), 350);
  };

  const pick = (s: Suggestion) => {
    const shortLabel = s.display_name.split(",").slice(0, 3).join(",");
    setText(shortLabel);
    setSuggestions([]);
    setOpen(false);
    onChange({ label: shortLabel, lat: parseFloat(s.lat), lon: parseFloat(s.lon) }, shortLabel);
  };

  return (
    <div ref={boxRef} className="relative">
      <label className="label">{label}</label>
      <div className="relative">
        <Icon
          name={icon}
          className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${value ? "text-leaf-600" : "text-slate-400"}`}
        />
        <input
          className="input pl-9 pr-8"
          placeholder={placeholder}
          value={text}
          onChange={(e) => handleType(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          autoComplete="off"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            <span className="block h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-brand-500" />
          </span>
        )}
        {!loading && value && (
          <Icon name="check" className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-leaf-600" />
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card-hover">
          {suggestions.map((s, i) => (
            <li key={`${s.lat}-${s.lon}-${i}`}>
              <button
                type="button"
                onClick={() => pick(s)}
                className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm hover:bg-brand-50"
              >
                <Icon name="map-pin" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <span className="line-clamp-2 text-slate-700">{s.display_name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Distance helpers ─────────────────────────────────────────────

/** Great-circle distance in km, scaled by 1.3 to approximate road distance. */
export function haversineRoadKm(a: PlacePick, b: PlacePick): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s)) * 1.3;
}

/** Road distance in km via the public OSRM router; falls back to haversine. */
export async function routeDistanceKm(a: PlacePick, b: PlacePick): Promise<number> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const meters = data?.routes?.[0]?.distance;
      if (typeof meters === "number" && meters > 0) return meters / 1000;
    }
  } catch {
    /* offline or OSRM down — fall through */
  }
  return haversineRoadKm(a, b);
}
