"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { servicesApi, KES, type Service } from "../client";
import { Icon, serviceIconName } from "../Icon";
import { Spinner } from "../ui";

const TRUST: [string, string][] = [
  ["badge-check", "ID-verified runners"],
  ["smartphone", "Pay by M-Pesa"],
  ["camera", "Photo proof"],
  ["map-pin", "Live tracking"],
];

export default function ServicesPage({
  vertical,
  basePath,
  heading,
  initialQuery = "",
}: {
  vertical?: string;
  basePath: string;
  heading: string;
  initialQuery?: string;
}) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(initialQuery);
  const [activeCat, setActiveCat] = useState("all");

  useEffect(() => {
    servicesApi
      .list(vertical)
      .then(setServices)
      .finally(() => setLoading(false));
  }, [vertical]);

  // Text search across name / category / description.
  const textFiltered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const base = term
      ? services.filter((s) => [s.name, s.category, s.description].join(" ").toLowerCase().includes(term))
      : services;
    // Active services first, then coming-soon.
    return [...base].sort((a, b) => Number(b.is_active) - Number(a.is_active));
  }, [services, q]);

  // Category chips with live counts, driven by the current text filter.
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of textFiltered) counts.set(s.category, (counts.get(s.category) ?? 0) + 1);
    return [...counts.entries()].map(([name, count]) => ({ name, count }));
  }, [textFiltered]);

  const catValid = activeCat === "all" || categories.some((c) => c.name === activeCat);
  const visible = catValid && activeCat !== "all"
    ? textFiltered.filter((s) => s.category === activeCat)
    : textFiltered;

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      {/* Heading + search */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{heading}</h1>
        <p className="mt-1 text-sm text-muted">
          {services.filter((s) => s.is_active).length} services · transparent prices · pay by M-Pesa when it&rsquo;s done
        </p>
      </div>

      <div className="relative max-w-xl">
        <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search for an errand — groceries, pharmacy, documents…"
          className="w-full rounded-xl border border-line bg-white py-3 pl-10 pr-10 text-sm text-ink shadow-sm outline-none focus:border-brand-500 focus:shadow-focus"
        />
        {q && (
          <button
            onClick={() => setQ("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
            aria-label="Clear search"
          >
            <Icon name="x" className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Category filter chips — instant, obvious active state */}
      <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <FilterChip label="All" count={textFiltered.length} active={activeCat === "all"} onClick={() => setActiveCat("all")} />
        {categories.map((c) => (
          <FilterChip
            key={c.name}
            label={c.name}
            count={c.count}
            active={activeCat === c.name}
            onClick={() => setActiveCat(c.name)}
          />
        ))}
      </div>

      {/* Results */}
      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white py-16 text-center">
          <p className="font-semibold text-ink">No services match “{q}”.</p>
          <button onClick={() => { setQ(""); setActiveCat("all"); }} className="mt-2 text-sm font-semibold text-brand-600 hover:underline">
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((s) => (
            <ServiceCard key={s.id} service={s} basePath={basePath} />
          ))}
        </div>
      )}

      {/* Trust strip */}
      <div className="mt-2 grid grid-cols-2 gap-3 rounded-2xl border border-line bg-white p-4 sm:grid-cols-4">
        {TRUST.map(([icon, label]) => (
          <div key={label} className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
              <Icon name={icon} className="h-4 w-4" />
            </span>
            <span className="text-xs font-medium text-slate-600">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FilterChip({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? "border-brand-500 bg-brand-500 text-white"
          : "border-line bg-white text-slate-600 hover:border-brand-300 hover:text-ink"
      }`}
    >
      {label}
      <span className={`text-xs font-semibold ${active ? "text-white/80" : "text-muted"}`}>{count}</span>
    </button>
  );
}

function ServiceCard({ service: s, basePath }: { service: Service; basePath: string }) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
          <Icon name={serviceIconName(s)} className="h-5 w-5" />
        </span>
        {s.is_active ? (
          <div className="text-right">
            <p className="text-[11px] leading-none text-muted">from</p>
            <p className="text-lg font-extrabold leading-tight text-ink">{KES(s.base_price)}</p>
            <p className="text-[11px] text-muted">{s.price_unit}</p>
          </div>
        ) : (
          <span className="badge bg-stone-100 text-muted">Coming soon</span>
        )}
      </div>

      <p className="mt-3 font-semibold text-ink group-hover:text-brand-700">{s.name}</p>
      <p className="mt-1 line-clamp-2 flex-1 text-sm text-muted">{s.description}</p>

      <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted">
          <span className="rounded bg-canvas px-2 py-0.5 font-medium text-slate-600">{s.category}</span>
          {s.est_minutes > 0 && <span>≈ {s.est_minutes} min</span>}
        </span>
        {s.is_active ? (
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600">
            Book <Icon name="arrow-right" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        ) : (
          <span className="text-xs font-medium text-muted">Notify me</span>
        )}
      </div>
    </>
  );

  if (!s.is_active) {
    return <div className="card flex cursor-default flex-col p-5 opacity-80">{body}</div>;
  }
  return (
    <Link
      href={`${basePath}/book/${s.id}`}
      className="group card flex flex-col p-5 transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-card-hover hover:no-underline"
    >
      {body}
    </Link>
  );
}
