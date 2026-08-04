"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/app/components/services/Icon";
import { useEventsCart } from "./EventsCart";

/**
 * Hero date picker. Dates drive availability, so the first interaction on the
 * page sets them — the customer arrives at the catalog already filtered to
 * what they can actually have.
 */
export default function EventsHeroDates() {
  const { start, end, days, setDates } = useEventsCart();
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="rounded border border-slate-200 bg-white p-5 shadow-lg">
      <p className="text-base font-bold text-ink">When is your event?</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
            Delivery
          </span>
          <input
            type="date"
            min={today}
            value={start}
            onChange={(e) => setDates(e.target.value, end < e.target.value ? e.target.value : end)}
            className="h-10 w-full rounded border border-slate-300 px-3 text-sm outline-none focus:border-brand-500"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
            Collection
          </span>
          <input
            type="date"
            min={start || today}
            value={end}
            onChange={(e) => setDates(start, e.target.value)}
            className="h-10 w-full rounded border border-slate-300 px-3 text-sm outline-none focus:border-brand-500"
          />
        </label>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
        <p className="text-sm text-muted">
          <span className="text-lg font-extrabold text-ink">{days}</span> day
          {days === 1 ? "" : "s"} of hire
        </p>
        <button onClick={() => router.push("/events/hire")} className="btn-primary rounded px-5">
          See what&apos;s free <Icon name="arrow-right" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
