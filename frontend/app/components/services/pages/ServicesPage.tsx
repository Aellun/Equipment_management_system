"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { servicesApi, KES, type Service } from "../client";
import { Icon, serviceIconName } from "../Icon";
import { Empty, Spinner } from "../ui";

export default function ServicesPage({
  vertical,
  basePath,
  heading,
}: {
  vertical?: string;
  basePath: string;
  heading: string;
}) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    servicesApi
      .list(vertical)
      .then(setServices)
      .finally(() => setLoading(false));
  }, [vertical]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return services;
    return services.filter((s) => [s.name, s.category, s.description].join(" ").toLowerCase().includes(term));
  }, [services, q]);

  if (loading) return <Spinner />;

  const categories = [...new Set(filtered.map((s) => s.category))];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{heading}</h1>
        <p className="mt-1 text-muted">Transparent prices, shown upfront. Every task is escrow-protected with photo proof.</p>
      </div>

      <div className="flex max-w-md overflow-hidden rounded-lg border border-line bg-white">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search services"
          className="min-w-0 flex-1 px-3 py-2 text-sm text-ink outline-none"
        />
        <span className="grid place-items-center bg-brand-500 px-4 text-squid">
          <Icon name="search" className="h-5 w-5" />
        </span>
      </div>

      {filtered.length === 0 && <Empty title="No services match your search">Try a different term.</Empty>}

      {categories.map((cat) => (
        <section key={cat}>
          <h2 className="mb-4 text-lg font-bold">{cat}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered
              .filter((s) => s.category === cat)
              .map((s) => (
                <div key={s.id} className="card flex flex-col p-6">
                  <div className="flex items-start justify-between">
                    <span className="icon-chip h-12 w-12">
                      <Icon name={serviceIconName(s)} className="h-6 w-6" />
                    </span>
                    {s.is_active ? (
                      <span className="text-right">
                        <span className="block text-lg font-bold">{KES(s.base_price)}</span>
                        <span className="text-xs text-muted">{s.price_unit}</span>
                      </span>
                    ) : (
                      <span className="badge bg-stone-100 text-muted">Coming soon</span>
                    )}
                  </div>
                  <p className="mt-3 font-semibold">{s.name}</p>
                  <p className="mt-1 flex-1 text-sm text-muted">{s.description}</p>
                  {s.is_active ? (
                    <Link href={`${basePath}/book/${s.id}`} className="btn-primary mt-4 w-full">
                      Book this
                    </Link>
                  ) : (
                    <button className="btn-ghost mt-4 w-full cursor-not-allowed opacity-60" disabled>
                      Notify me
                    </button>
                  )}
                </div>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
