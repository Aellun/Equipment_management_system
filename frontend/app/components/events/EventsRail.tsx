"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useEventsCart } from "./EventsCart";
import { eventsApi, KES, type CatalogItem } from "./client";

/** A compact shelf of hireable kit, priced and availability-aware. */
export default function EventsRail({
  title,
  subtitle,
  category,
  limit = 4,
}: {
  title: string;
  subtitle?: string;
  category: string;
  limit?: number;
}) {
  const { start, end } = useEventsCart();
  const [items, setItems] = useState<CatalogItem[]>([]);

  useEffect(() => {
    if (!start || !end) return;
    let cancelled = false;
    eventsApi
      .catalog({ category, start, end })
      .then((list) => !cancelled && setItems(list.slice(0, limit)))
      .catch(() => !cancelled && setItems([]));
    return () => {
      cancelled = true;
    };
  }, [category, start, end, limit]);

  if (items.length === 0) return null;

  return (
    <section className="rounded border border-line bg-white">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-5 py-3.5">
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        </div>
        <Link
          href={`/events/hire?category=${encodeURIComponent(category)}`}
          className="text-sm font-semibold text-brand-600 hover:underline"
        >
          See all →
        </Link>
      </div>
      <div className="grid divide-y divide-line sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4">
        {items.map((i) => (
          <Link
            key={i.name}
            href={`/events/hire?category=${encodeURIComponent(i.category)}`}
            className="border-line p-4 hover:bg-canvas hover:no-underline sm:border-r sm:last:border-r-0"
          >
            <p className="truncate text-sm font-semibold text-ink">{i.name}</p>
            <p className="mt-1">
              <span className="text-lg font-extrabold text-ink">{KES(i.daily_rate)}</span>
              <span className="ml-1 text-xs text-muted">per day</span>
            </p>
            <p className="mt-0.5 text-xs">
              {i.available > 0 ? (
                <span className="font-semibold text-hygiene-green">{i.available} free</span>
              ) : (
                <span className="font-semibold text-red-600">Fully booked</span>
              )}
              <span className="text-muted"> · {i.total_units} in stock</span>
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
