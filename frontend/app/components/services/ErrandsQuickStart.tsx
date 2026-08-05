"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { servicesApi, KES, type Service, type Quote } from "./client";
import { Icon, serviceIconName } from "./Icon";

/**
 * The hero's working tool, not a picture of one.
 *
 * People want to know two things before they trust a stranger with an errand:
 * what it costs and how fast. So the first thing on the page prices a real
 * errand live — pick the job, pick the speed, see the number — and "Continue"
 * carries the choice straight into booking. No pitch, no callback.
 */
const URGENCIES: { value: string; label: string; note: string }[] = [
  { value: "standard", label: "Standard", note: "Today" },
  { value: "sameday", label: "Same-day", note: "+15%" },
  { value: "express", label: "Express", note: "~2 hrs" },
];

export default function ErrandsQuickStart() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [serviceId, setServiceId] = useState<number | null>(null);
  const [urgency, setUrgency] = useState("standard");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    servicesApi
      .list("errands")
      .then((list) => {
        const active = list.filter((s) => s.is_active && s.base_price > 0);
        setServices(active);
        // Default to grocery shopping if present — the most-booked errand.
        const pick = active.find((s) => s.slug === "grocery-shopping") ?? active[0];
        setServiceId(pick?.id ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  const service = useMemo(
    () => services.find((s) => s.id === serviceId) ?? null,
    [services, serviceId]
  );

  useEffect(() => {
    if (!service) return;
    let cancelled = false;
    servicesApi
      .quote({ service_type_id: service.id, distance_km: 0, urgency })
      .then((q) => !cancelled && setQuote(q))
      .catch(() => !cancelled && setQuote(null));
    return () => {
      cancelled = true;
    };
  }, [service, urgency]);

  const start = () => {
    if (service) router.push(`/services/book/${service.id}`);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xl shadow-black/20">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-600">
          <Icon name={service ? serviceIconName(service) : "shopping-bag"} className="h-4 w-4" />
        </span>
        <p className="text-base font-bold text-ink">What do you need done?</p>
      </div>

      <label className="mt-4 block text-[11px] font-semibold uppercase tracking-wide text-muted">
        Pick an errand
      </label>
      <div className="relative mt-1.5">
        <select
          value={serviceId ?? ""}
          onChange={(e) => setServiceId(Number(e.target.value))}
          disabled={loading}
          className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2.5 pl-3 pr-9 text-sm font-medium text-ink outline-none focus:border-brand-500"
        >
          {loading && <option>Loading errands…</option>}
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <Icon name="chevron-down" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      </div>

      <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-muted">How soon</p>
      <div className="mt-1.5 grid grid-cols-3 gap-1.5">
        {URGENCIES.map((u) => (
          <button
            key={u.value}
            onClick={() => setUrgency(u.value)}
            className={`rounded-lg border py-2 text-xs font-semibold transition ${
              u.value === urgency
                ? "border-brand-500 bg-brand-50 text-brand-700"
                : "border-slate-200 text-slate-600 hover:border-slate-400"
            }`}
          >
            {u.label}
            <span className="mt-0.5 block text-[10px] font-medium text-muted">{u.note}</span>
          </button>
        ))}
      </div>

      <div className="mt-5 flex items-end justify-between border-t border-line pt-4">
        <div>
          <p className="text-xs text-muted">From, before distance</p>
          <p className="text-3xl font-extrabold leading-none text-ink">
            {quote ? KES(quote.total_price) : "—"}
          </p>
        </div>
        <button onClick={start} disabled={!service} className="btn-primary rounded-lg px-5">
          Continue <Icon name="arrow-right" className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-muted">
        Add pickup &amp; drop-off next — the distance is worked out for you. Pay by M-Pesa only when it&rsquo;s done.
      </p>
    </div>
  );
}
