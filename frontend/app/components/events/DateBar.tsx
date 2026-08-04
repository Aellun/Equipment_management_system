"use client";

import { Icon } from "@/app/components/services/Icon";
import { useEventsCart } from "./EventsCart";

/**
 * Hire dates.
 *
 * In event rental the dates come before the products — they decide what is
 * even available — so this sits above the catalog rather than at checkout,
 * and every availability number on the page is answered for this range.
 */
export default function DateBar({ compact = false }: { compact?: boolean }) {
  const { start, end, days, setDates } = useEventsCart();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div
      className={`flex flex-wrap items-end gap-3 rounded border border-line bg-white ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <Icon name="clock" className="mb-2 hidden h-5 w-5 text-hygiene-navy sm:block" />
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
          Delivery date
        </span>
        <input
          type="date"
          min={today}
          value={start}
          onChange={(e) => setDates(e.target.value, end < e.target.value ? e.target.value : end)}
          className="h-10 rounded border border-slate-300 px-3 text-sm outline-none focus:border-brand-500"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
          Collection date
        </span>
        <input
          type="date"
          min={start || today}
          value={end}
          onChange={(e) => setDates(start, e.target.value)}
          className="h-10 rounded border border-slate-300 px-3 text-sm outline-none focus:border-brand-500"
        />
      </label>
      <p className="mb-2.5 text-sm text-muted">
        <span className="font-bold text-ink">
          {days} day{days === 1 ? "" : "s"}
        </span>{" "}
        · availability shown for these dates
      </p>
    </div>
  );
}
