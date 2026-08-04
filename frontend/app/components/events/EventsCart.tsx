"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { hireDays, type CatalogItem } from "./client";

/**
 * The hire list.
 *
 * Dates are part of the cart, not the checkout: in event hire the dates decide
 * what is even available, so they are chosen first and every quantity is
 * validated against them. Kept in localStorage because customers price a job,
 * leave, and come back.
 */
export interface CartLine {
  name: string;
  category: string;
  quantity: number;
  daily_rate: number;
}

interface CartState {
  start: string;
  end: string;
  lines: CartLine[];
  days: number;
  itemCount: number;
  subtotal: number;
  setDates: (start: string, end: string) => void;
  add: (item: CatalogItem, quantity: number) => void;
  setQuantity: (name: string, quantity: number) => void;
  remove: (name: string) => void;
  clear: () => void;
  quantityOf: (name: string) => number;
}

const STORAGE_KEY = "dyzah_events_cart";

const Ctx = createContext<CartState | null>(null);

export function useEventsCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useEventsCart must be used inside EventsCartProvider");
  return ctx;
}

/** Default window: this coming weekend, the overwhelmingly common case. */
function defaultDates() {
  const start = new Date();
  start.setDate(start.getDate() + ((6 - start.getDay() + 7) % 7 || 7));
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { start: iso(start), end: iso(end) };
}

export default function EventsCartProvider({ children }: { children: React.ReactNode }) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const fallback = defaultDates();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        // A stored start date in the past is stale — fall back rather than
        // letting someone request kit for last month.
        const usable = saved.start && saved.start >= new Date().toISOString().slice(0, 10);
        setStart(usable ? saved.start : fallback.start);
        setEnd(usable ? saved.end : fallback.end);
        setLines(Array.isArray(saved.lines) ? saved.lines : []);
      } else {
        setStart(fallback.start);
        setEnd(fallback.end);
      }
    } catch {
      setStart(fallback.start);
      setEnd(fallback.end);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ start, end, lines }));
  }, [start, end, lines, hydrated]);

  const setDates = useCallback((s: string, e: string) => {
    setStart(s);
    // Keep the range valid rather than rejecting the change.
    setEnd((prev) => (e || (prev && prev >= s ? prev : s)));
  }, []);

  const add = useCallback((item: CatalogItem, quantity: number) => {
    setLines((prev) => {
      const found = prev.find((l) => l.name === item.name);
      if (found) {
        return prev.map((l) => (l.name === item.name ? { ...l, quantity: l.quantity + quantity } : l));
      }
      return [
        ...prev,
        { name: item.name, category: item.category, quantity, daily_rate: item.daily_rate },
      ];
    });
  }, []);

  const setQuantity = useCallback((name: string, quantity: number) => {
    setLines((prev) =>
      quantity <= 0
        ? prev.filter((l) => l.name !== name)
        : prev.map((l) => (l.name === name ? { ...l, quantity } : l))
    );
  }, []);

  const remove = useCallback((name: string) => {
    setLines((prev) => prev.filter((l) => l.name !== name));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartState>(() => {
    const days = hireDays(start, end);
    return {
      start,
      end,
      lines,
      days,
      itemCount: lines.reduce((n, l) => n + l.quantity, 0),
      subtotal: lines.reduce((n, l) => n + l.daily_rate * l.quantity * days, 0),
      setDates,
      add,
      setQuantity,
      remove,
      clear,
      quantityOf: (name: string) => lines.find((l) => l.name === name)?.quantity ?? 0,
    };
  }, [start, end, lines, setDates, add, setQuantity, remove, clear]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
