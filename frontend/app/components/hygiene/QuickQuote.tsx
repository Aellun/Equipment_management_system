"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { servicesApi, type Service } from "@/app/components/services/client";
import { Icon } from "@/app/components/services/Icon";
import { hygieneApi, KES, type Frequency } from "./client";

/**
 * The hero's price widget.
 *
 * Homeowners want a number before they will talk to anyone, so the first
 * thing on the page is a working quote rather than a pitch. Picking a size
 * and a plan updates the price live; "Book" carries the same choices into
 * the booking flow so nothing is re-entered.
 */
const SIZES: { beds: number; baths: number; label: string }[] = [
  { beds: 1, baths: 1, label: "1 bed" },
  { beds: 2, baths: 1, label: "2 bed" },
  { beds: 3, baths: 2, label: "3 bed" },
  { beds: 4, baths: 3, label: "4 bed" },
  { beds: 5, baths: 3, label: "5 bed+" },
];

const PLANS: { value: Frequency; label: string; save?: string }[] = [
  { value: "weekly", label: "Weekly", save: "-15%" },
  { value: "fortnightly", label: "2 weeks", save: "-10%" },
  { value: "monthly", label: "Monthly", save: "-5%" },
  { value: "one_off", label: "One-off" },
];

export default function QuickQuote() {
  const router = useRouter();
  const [service, setService] = useState<Service | null>(null);
  const [sizeIdx, setSizeIdx] = useState(2);
  const [plan, setPlan] = useState<Frequency>("fortnightly");
  const [price, setPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    servicesApi
      .list("hygiene")
      .then((list) => setService(list.find((s) => s.slug === "residential-housekeeping") ?? null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!service) return;
    const size = SIZES[sizeIdx];
    let cancelled = false;
    hygieneApi
      .quote({
        service_type_id: service.id,
        bedrooms: size.beds,
        bathrooms: size.baths,
        frequency: plan,
      })
      .then((q) => !cancelled && setPrice(q.total_price))
      .catch(() => !cancelled && setPrice(null));
    return () => {
      cancelled = true;
    };
  }, [service, sizeIdx, plan]);

  const book = () => {
    if (!service) return;
    const size = SIZES[sizeIdx];
    router.push(
      `/hygiene/book/${service.id}?bedrooms=${size.beds}&bathrooms=${size.baths}&frequency=${plan}`
    );
  };

  return (
    <div className="rounded border border-slate-200 bg-white p-5 shadow-lg">
      <p className="text-base font-bold text-ink">Price your home clean</p>

      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">Home size</p>
      <div className="mt-1.5 grid grid-cols-5 gap-1">
        {SIZES.map((s, i) => (
          <button
            key={s.label}
            onClick={() => setSizeIdx(i)}
            className={`rounded border py-2 text-xs font-semibold transition ${
              i === sizeIdx
                ? "border-brand-500 bg-brand-50 text-brand-700"
                : "border-slate-200 text-slate-600 hover:border-slate-400"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">How often</p>
      <div className="mt-1.5 grid grid-cols-4 gap-1">
        {PLANS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPlan(p.value)}
            className={`rounded border py-2 text-xs font-semibold transition ${
              p.value === plan
                ? "border-brand-500 bg-brand-50 text-brand-700"
                : "border-slate-200 text-slate-600 hover:border-slate-400"
            }`}
          >
            {p.label}
            {p.save && <span className="block text-[10px] font-bold text-brand-600">{p.save}</span>}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-end justify-between border-t border-line pt-4">
        <div>
          <p className="text-xs text-muted">From, per visit</p>
          <p className="text-3xl font-extrabold leading-none text-ink">
            {loading ? "…" : price !== null ? KES(price) : "—"}
          </p>
        </div>
        <button onClick={book} disabled={!service} className="btn-primary rounded px-5">
          Book <Icon name="arrow-right" className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-2 text-[11px] text-muted">
        Final price confirmed at booking. Cancel or reschedule free up to 24 hours before.
      </p>
    </div>
  );
}
