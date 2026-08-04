"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/app/components/services/Icon";
import { Spinner } from "@/app/components/services/ui";
import DateBar from "./DateBar";
import { useEventsCart } from "./EventsCart";
import { eventsApi, KES, type CatalogItem } from "./client";

/**
 * Hire catalog.
 *
 * Every row answers the two questions that matter: how many are free on the
 * customer's dates, and what will they cost for that length of hire. Stock
 * that is fully committed is shown rather than hidden — "0 free on these
 * dates" tells the customer to move the date, which a missing row does not.
 */
const CATEGORY_ICONS: Record<string, string> = {
  Seating: "user",
  Tables: "package",
  "Tents & Structures": "home",
  Audio: "smartphone",
  Lighting: "sparkles",
  "Power & Climate": "droplet",
  Catering: "gift",
  Decor: "star",
};

export default function EventsCatalog() {
  const params = useSearchParams();
  const router = useRouter();
  const { start, end, days, add, quantityOf, setQuantity } = useEventsCart();

  const [items, setItems] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const category = params.get("category") ?? "";
  const query = params.get("q") ?? "";
  const [q, setQ] = useState(query);

  useEffect(() => setQ(query), [query]);

  useEffect(() => {
    eventsApi.categories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (!start || !end) return;
    let cancelled = false;
    setLoading(true);
    eventsApi
      .catalog({ category: category || undefined, q: query || undefined, start, end })
      .then((list) => !cancelled && setItems(list))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [category, query, start, end]);

  const grouped = useMemo(() => {
    return items.reduce<Record<string, CatalogItem[]>>((acc, i) => {
      (acc[i.category] ??= []).push(i);
      return acc;
    }, {});
  }, [items]);

  const go = (next: { category?: string; q?: string }) => {
    const qs = new URLSearchParams();
    const cat = next.category ?? category;
    const term = next.q ?? query;
    if (cat) qs.set("category", cat);
    if (term) qs.set("q", term);
    router.push(`/events/hire${qs.toString() ? `?${qs}` : ""}`);
  };

  return (
    <div className="space-y-4">
      <DateBar />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{category || "All equipment"}</h1>
          <p className="text-sm text-muted">
            {items.length} item{items.length === 1 ? "" : "s"}
            {query && <> matching “{query}”</>}
          </p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            go({ q: q.trim() });
          }}
          className="flex"
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search equipment"
            className="h-9 w-52 rounded-l border border-r-0 border-slate-300 px-3 text-sm outline-none focus:border-brand-500"
          />
          <button className="grid h-9 w-10 place-items-center rounded-r bg-brand-500 text-white hover:bg-brand-600">
            <Icon name="search" className="h-4 w-4" />
          </button>
        </form>
      </div>

      <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <Chip active={!category} onClick={() => go({ category: "", q: query })}>
          All
        </Chip>
        {categories.map((c) => (
          <Chip key={c} active={category === c} onClick={() => go({ category: c })}>
            {c}
          </Chip>
        ))}
      </div>

      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <div className="rounded border border-line bg-white p-10 text-center">
          <p className="font-semibold">Nothing matches that.</p>
          <button onClick={() => go({ category: "", q: "" })} className="link mt-2">
            Show all equipment
          </button>
        </div>
      ) : (
        Object.entries(grouped).map(([cat, list]) => (
          <section key={cat} className="overflow-hidden rounded border border-line bg-white">
            <h2 className="flex items-center gap-2 border-b border-line px-5 py-3 text-sm font-bold uppercase tracking-wide text-muted">
              <Icon name={CATEGORY_ICONS[cat] ?? "package"} className="h-4 w-4 text-hygiene-navy" />
              {cat}
            </h2>
            <ul className="divide-y divide-line">
              {list.map((item) => (
                <Row
                  key={item.name}
                  item={item}
                  days={days}
                  inCart={quantityOf(item.name)}
                  onAdd={(qty) => add(item, qty)}
                  onSet={(qty) => setQuantity(item.name, qty)}
                />
              ))}
            </ul>
          </section>
        ))
      )}

      <div className="rounded border border-line bg-white p-4 text-center text-sm text-muted">
        Built your list?{" "}
        <Link href="/events/request" className="link font-semibold">
          Review it and request a quote →
        </Link>
      </div>
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

function Row({
  item,
  days,
  inCart,
  onAdd,
  onSet,
}: {
  item: CatalogItem;
  days: number;
  inCart: number;
  onAdd: (qty: number) => void;
  onSet: (qty: number) => void;
}) {
  const soldOut = item.available === 0;
  const lineTotal = item.daily_rate * Math.max(1, inCart) * days;

  return (
    <li className="flex flex-col gap-3 p-4 hover:bg-canvas sm:flex-row sm:items-center sm:gap-5 sm:px-5">
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">{item.name}</p>
        <p className="mt-0.5 text-sm text-muted">{item.description}</p>
        <p className="mt-1 text-xs">
          {soldOut ? (
            <span className="font-semibold text-red-600">Fully booked on these dates</span>
          ) : (
            <span className="text-slate-500">
              <span className="font-semibold text-hygiene-green">{item.available} free</span> of{" "}
              {item.total_units} on your dates
            </span>
          )}
        </p>
      </div>

      <div className="text-right sm:w-32">
        <span className="block text-lg font-extrabold leading-none">{KES(item.daily_rate)}</span>
        <span className="text-xs text-muted">per day</span>
        {inCart > 0 && (
          <span className="mt-1 block text-xs font-semibold text-brand-700">
            {KES(lineTotal)} for {days}d
          </span>
        )}
      </div>

      <div className="sm:w-44">
        {inCart > 0 ? (
          <div className="flex items-center rounded border border-brand-500">
            <button
              onClick={() => onSet(inCart - 1)}
              className="grid h-9 w-9 shrink-0 place-items-center text-lg font-bold text-brand-700 hover:bg-brand-50"
              aria-label={`Fewer ${item.name}`}
            >
              −
            </button>
            <span className="flex-1 text-center text-sm font-bold">{inCart}</span>
            <button
              onClick={() => onSet(Math.min(item.available, inCart + 1))}
              disabled={inCart >= item.available}
              className="grid h-9 w-9 shrink-0 place-items-center text-lg font-bold text-brand-700 hover:bg-brand-50 disabled:opacity-30"
              aria-label={`More ${item.name}`}
            >
              +
            </button>
          </div>
        ) : (
          <button
            onClick={() => onAdd(1)}
            disabled={soldOut}
            className="btn-primary w-full rounded disabled:cursor-not-allowed disabled:opacity-40"
          >
            Add to list
          </button>
        )}
      </div>
    </li>
  );
}
