"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { servicesApi, type Service } from "@/app/components/services/client";
import { Icon, serviceIconName } from "@/app/components/services/Icon";
import { Spinner } from "@/app/components/services/ui";
import { KES } from "./client";

/** Customers shop by what they own, not by our internal category names. */
const SEGMENTS: { key: string; label: string; categories: string[] }[] = [
  { key: "home", label: "Homes", categories: ["Residential Cleaning"] },
  { key: "office", label: "Offices & retail", categories: ["Commercial Cleaning"] },
  { key: "schools", label: "Schools", categories: ["Institutional Cleaning"] },
  { key: "healthcare", label: "Healthcare", categories: ["Healthcare Cleaning"] },
  { key: "industrial", label: "Industrial", categories: ["Industrial Cleaning"] },
  { key: "hospitality", label: "Hotels", categories: ["Hospitality Cleaning"] },
  {
    key: "washrooms",
    label: "Washrooms & bins",
    categories: ["Sanitation & Washroom Hygiene", "Waste & Pest Control", "Laundry & Linen"],
  },
];

export default function HygieneCatalog() {
  const params = useSearchParams();
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const segment = params.get("for") ?? "";
  const query = params.get("q") ?? "";
  const [q, setQ] = useState(query);

  useEffect(() => setQ(query), [query]);

  useEffect(() => {
    servicesApi
      .list("hygiene")
      .then(setServices)
      .finally(() => setLoading(false));
  }, []);

  const active = SEGMENTS.find((s) => s.key === segment);

  const filtered = useMemo(() => {
    let list = services.filter((s) => s.is_active);
    if (active) list = list.filter((s) => active.categories.includes(s.category));
    const term = query.trim().toLowerCase();
    if (term) {
      list = list.filter((s) => `${s.name} ${s.category} ${s.description}`.toLowerCase().includes(term));
    }
    return list;
  }, [services, active, query]);

  const setSegment = (key: string) => router.push(`/hygiene/services${key ? `?for=${key}` : ""}`);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/hygiene/services${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);
  };

  if (loading) return <Spinner />;

  const grouped = filtered.reduce<Record<string, Service[]>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{active ? active.label : "All cleaning services"}</h1>
          <p className="text-sm text-muted">
            {filtered.length} service{filtered.length === 1 ? "" : "s"}
            {query && <> matching “{query}”</>}
          </p>
        </div>
        <form onSubmit={submitSearch} className="flex">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search services"
            className="h-9 w-52 rounded-l border border-r-0 border-slate-300 px-3 text-sm outline-none focus:border-brand-500"
          />
          <button className="grid h-9 w-10 place-items-center rounded-r bg-brand-500 text-white hover:bg-brand-600">
            <Icon name="search" className="h-4 w-4" />
          </button>
        </form>
      </div>

      {/* Segment filter */}
      <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <Chip active={!segment} onClick={() => setSegment("")}>
          All
        </Chip>
        {SEGMENTS.map((s) => (
          <Chip key={s.key} active={segment === s.key} onClick={() => setSegment(s.key)}>
            {s.label}
          </Chip>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded border border-line bg-white p-8 text-center text-sm text-muted">
          Nothing matched. <button onClick={() => setSegment("")} className="link">Show all services</button>
        </div>
      )}

      {Object.entries(grouped).map(([category, list]) => (
        <section key={category} className="overflow-hidden rounded border border-line bg-white">
          <h2 className="border-b border-line px-5 py-3 text-sm font-bold uppercase tracking-wide text-muted">
            {category}
          </h2>
          <ul className="divide-y divide-line">
            {list.map((s) => (
              <ServiceRow key={s.id} service={s} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
        active
          ? "border-hygiene-navy bg-hygiene-navy text-white"
          : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * One catalog row. The right-hand side is the whole point: a bookable service
 * shows its price and a Book button; a survey-quoted service shows neither,
 * because publishing a price for a hospital contract we haven't walked would
 * be a guess.
 */
function ServiceRow({ service: s }: { service: Service }) {
  const isSurvey = s.quote_mode === "survey";
  return (
    <li className="flex flex-col gap-3 p-4 hover:bg-canvas sm:flex-row sm:items-center sm:gap-4 sm:px-5">
      <Icon name={serviceIconName(s)} className="h-6 w-6 shrink-0 text-hygiene-navy" />

      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">{s.name}</p>
        <p className="mt-0.5 line-clamp-2 text-sm text-muted">{s.description}</p>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-4 sm:w-64 sm:justify-end">
        {isSurvey ? (
          <>
            <span className="text-sm text-muted">Quoted after a free visit</span>
            <Link href={`/hygiene/survey?service=${s.slug}`} className="btn-primary rounded px-4 py-2">
              Book survey
            </Link>
          </>
        ) : (
          <>
            <span className="text-right">
              <span className="block text-lg font-extrabold leading-none text-ink">{KES(s.base_price)}</span>
              <span className="text-xs text-muted">{s.price_unit.replace(" (from)", "")}</span>
            </span>
            <Link href={`/hygiene/book/${s.id}`} className="btn-primary rounded px-4 py-2">
              Book
            </Link>
          </>
        )}
      </div>
    </li>
  );
}
