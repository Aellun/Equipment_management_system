"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { servicesApi, KES, type Service } from "./client";
import { Icon, serviceIconName } from "./Icon";
import ErrandsQuickStart from "./ErrandsQuickStart";

const TRUST: [string, string][] = [
  ["badge-check", "ID-verified runners"],
  ["map-pin", "Live tracking"],
  ["camera", "Photo proof"],
  ["smartphone", "Pay by M-Pesa"],
];

const STEPS: [string, string, string][] = [
  ["1", "Tell us the errand", "Pick what you need and set pickup & drop-off — we work out the distance and price upfront."],
  ["2", "A runner is assigned", "A nearby, ID-verified runner picks it up and keeps you posted as it happens."],
  ["3", "Approve & pay", "Check the photo proof, then pay by M-Pesa. Only when it's actually done."],
];

const DIASPORA: [string, string][] = [
  ["property-check", "Property & family check-ins"],
  ["bill-payment", "Bill payments & top-ups"],
  ["document-courier", "Document pickup & courier"],
  ["heart-pulse", "Hospital visits & care drop-offs"],
];

export default function ErrandsLanding() {
  const [services, setServices] = useState<Service[]>([]);

  useEffect(() => {
    servicesApi.list("errands").then((list) => setServices(list.filter((s) => s.is_active && s.base_price > 0)));
  }, []);

  const popular = services.slice(0, 8);

  const categories = useMemo(() => {
    const seen = new Map<string, Service>();
    for (const s of services) if (!seen.has(s.category)) seen.set(s.category, s);
    return [...seen.entries()].map(([category, sample]) => ({ category, sample }));
  }, [services]);

  return (
    <div className="space-y-10">
      {/* ── Hero: a working tool, not a pitch ─────────────────── */}
      <section className="relative -mx-4 overflow-hidden bg-squid px-4 py-10 sm:rounded-2xl md:mx-0 md:px-10 md:py-14">
        {/* warm brand glow + subtle route motif */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-500/25 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-accent-500/10 blur-3xl" />
        <div className="relative grid items-center gap-10 lg:grid-cols-[minmax(0,1fr),400px]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand-300 ring-1 ring-white/15">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
              Verified runners across Nairobi
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight text-white md:text-[3.25rem]">
              Too busy?<br />
              <span className="text-brand-400">Send a runner.</span>
            </h1>
            <p className="mt-4 max-w-lg text-lg leading-relaxed text-white/70">
              Groceries, pharmacy pickups, government queues, deliveries and diaspora check-ins — a vetted
              runner handles it and sends photo proof. You pay by M-Pesa, only when it&rsquo;s done.
            </p>
            <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2.5 text-sm text-white/75">
              {TRUST.map(([icon, label]) => (
                <li key={label} className="flex items-center gap-2">
                  <Icon name={icon} className="h-4 w-4 text-brand-400" />
                  {label}
                </li>
              ))}
            </ul>
          </div>
          <ErrandsQuickStart />
        </div>
      </section>

      {/* ── Popular errands, real prices ──────────────────────── */}
      {popular.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-line bg-white">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-5 py-4">
            <div>
              <h2 className="text-lg font-bold">Popular errands</h2>
              <p className="text-sm text-muted">Priced upfront — distance added at booking</p>
            </div>
            <Link href="/services/browse" className="text-sm font-semibold text-brand-600 hover:underline">
              See all services →
            </Link>
          </div>
          <div className="grid grid-cols-1 divide-y divide-line sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4">
            {popular.map((s, i) => (
              <Link
                key={s.id}
                href={`/services/book/${s.id}`}
                className={`group flex gap-3 p-4 hover:bg-canvas hover:no-underline ${
                  i % 4 !== 3 ? "lg:border-r lg:border-line" : ""
                } ${i % 2 === 0 ? "sm:border-r sm:border-line" : ""}`}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
                  <Icon name={serviceIconName(s)} className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink group-hover:text-brand-700">{s.name}</p>
                  <p className="mt-1">
                    <span className="text-lg font-extrabold text-ink">{KES(s.base_price)}</span>
                    <span className="ml-1 text-xs text-muted">{s.price_unit}</span>
                  </p>
                  {s.est_minutes > 0 && (
                    <p className="mt-0.5 text-xs text-muted">≈ {s.est_minutes} min</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Browse by need ────────────────────────────────────── */}
      {categories.length > 0 && (
        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-lg font-bold">Browse by what you need</h2>
            <Link href="/services/browse" className="text-sm font-semibold text-brand-600 hover:underline">
              All services →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map(({ category, sample }) => (
              <Link
                key={category}
                href={`/services/browse?q=${encodeURIComponent(category)}`}
                className="group flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-4 hover:border-brand-300 hover:shadow-card hover:no-underline"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
                  <Icon name={serviceIconName(sample)} className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold text-ink group-hover:text-brand-700">{category}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── How it works ──────────────────────────────────────── */}
      <section className="rounded-2xl border border-line bg-white p-6 md:p-8">
        <h2 className="text-lg font-bold">How it works</h2>
        <div className="relative mt-6 grid gap-8 md:grid-cols-3">
          {/* connecting line on desktop */}
          <div className="pointer-events-none absolute left-0 right-0 top-5 hidden border-t border-dashed border-line md:block" />
          {STEPS.map(([n, title, body]) => (
            <div key={n} className="relative">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-500 text-sm font-bold text-white ring-4 ring-white">
                {n}
              </div>
              <p className="mt-3 font-semibold text-ink">{title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Diaspora: the human angle ─────────────────────────── */}
      <section className="grid items-center gap-8 rounded-2xl border border-brand-100 bg-brand-50/60 p-6 md:grid-cols-2 md:p-8">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-600">For the diaspora</span>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-ink">
            Away from home? We&rsquo;ll be your hands on the ground.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            From another timezone you can send a trusted runner to check on family, pay a bill, or drop off
            care — and get photos back the same day. No more relying on a favour.
          </p>
          <Link href="/services/browse?q=diaspora" className="btn-primary mt-5 rounded-lg">
            Send help home <Icon name="arrow-right" className="h-4 w-4" />
          </Link>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {DIASPORA.map(([icon, label]) => (
            <li key={label} className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
                <Icon name={icon} className="h-5 w-5" />
              </span>
              <span className="text-sm font-medium text-ink">{label}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
