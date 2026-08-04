"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { servicesApi, type Service } from "@/app/components/services/client";
import { Icon, serviceIconName } from "@/app/components/services/Icon";
import { KES, type QuoteMode } from "./client";

/**
 * A compact row of bookable services — price first, one line of detail, a
 * direct action. Deliberately tighter than a feature grid: this is a
 * shelf of things to buy, not a brochure.
 */
export default function ServiceRail({
  title,
  subtitle,
  modes,
  limit = 4,
  href,
}: {
  title: string;
  subtitle?: string;
  /** Only show services priced this way. */
  modes: QuoteMode[];
  limit?: number;
  href: string;
}) {
  const [services, setServices] = useState<Service[]>([]);

  useEffect(() => {
    servicesApi.list("hygiene").then(setServices);
  }, []);

  const shown = services
    .filter((s) => s.is_active && modes.includes(s.quote_mode as QuoteMode))
    .slice(0, limit);

  if (shown.length === 0) return null;

  return (
    <section className="rounded border border-line bg-white">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-5 py-3.5">
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        </div>
        <Link href={href} className="text-sm font-semibold text-brand-600 hover:underline">
          See all →
        </Link>
      </div>

      <div className="grid divide-y divide-line sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4">
        {shown.map((s) => (
          <Link
            key={s.id}
            href={`/hygiene/book/${s.id}`}
            className="group flex gap-3 border-line p-4 hover:bg-canvas hover:no-underline sm:border-r sm:last:border-r-0"
          >
            <Icon name={serviceIconName(s)} className="mt-0.5 h-6 w-6 shrink-0 text-hygiene-navy" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink group-hover:text-brand-700">{s.name}</p>
              <p className="mt-1">
                <span className="text-lg font-extrabold text-ink">{KES(s.base_price)}</span>
                <span className="ml-1 text-xs text-muted">{s.price_unit.replace(" (from)", "")}</span>
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {s.quote_mode === "rooms" ? "Price adjusts to home size" : "Per unit / collection"}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
