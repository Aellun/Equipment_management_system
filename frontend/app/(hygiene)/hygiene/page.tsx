import Link from "next/link";
import { Icon } from "@/app/components/services/Icon";
import QuickQuote from "@/app/components/hygiene/QuickQuote";
import ServiceRail from "@/app/components/hygiene/ServiceRail";

const B = "/hygiene";

/** Business segments. These are survey-quoted, so the CTA is a site visit,
 *  never a price. */
const SEGMENTS: [string, string, string][] = [
  ["building", "Offices & retail", "office"],
  ["graduation-cap", "Schools & institutions", "schools"],
  ["heart-pulse", "Hospitals & clinics", "healthcare"],
  ["package", "Warehouses & plants", "industrial"],
  ["star", "Hotels & restaurants", "hospitality"],
  ["droplet", "Washrooms & bins", "washrooms"],
];

export default function HygieneLanding() {
  return (
    <div className="space-y-8">
      {/* ── Hero: a price, not a pitch ───────────────────────── */}
      <section className="-mx-4 bg-hygiene-navy px-4 py-8 sm:rounded md:mx-0 md:px-10 md:py-12">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr),380px]">
          <div>
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-white md:text-[2.75rem]">
              Cleaning that shows up.
            </h1>
            <p className="mt-3 max-w-xl text-lg text-white/75">
              Book a home clean online in two minutes. Offices, schools and hospitals get a free site
              visit and a fixed quote.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={`${B}/services?for=home`}
                className="rounded bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 hover:no-underline"
              >
                Book a home clean
              </Link>
              <Link
                href={`${B}/survey`}
                className="rounded bg-white/10 px-5 py-2.5 text-sm font-semibold text-white ring-1 ring-white/25 hover:bg-white/20 hover:no-underline"
              >
                Free site survey for business
              </Link>
            </div>
            <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/70">
              {["Vetted, trained crews", "Photo proof every visit", "Pay by M-Pesa", "Free reschedule"].map(
                (t) => (
                  <li key={t} className="flex items-center gap-1.5">
                    <Icon name="check" className="h-4 w-4 text-hygiene-green" />
                    {t}
                  </li>
                )
              )}
            </ul>
          </div>
          <QuickQuote />
        </div>
      </section>

      {/* ── Book online ──────────────────────────────────────── */}
      <ServiceRail
        title="Book online, pay by M-Pesa"
        subtitle="Priced upfront — no callback needed"
        modes={["rooms"]}
        limit={4}
        href={`${B}/services?for=home`}
      />

      {/* ── For business ─────────────────────────────────────── */}
      <section className="rounded border border-line bg-white">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-5 py-3.5">
          <div>
            <h2 className="text-lg font-bold">For business & institutions</h2>
            <p className="text-sm text-muted">Free site visit, fixed quote, contract schedule</p>
          </div>
          <Link href={`${B}/survey`} className="text-sm font-semibold text-brand-600 hover:underline">
            Book a site survey →
          </Link>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-line sm:grid-cols-3 lg:grid-cols-6 lg:divide-y-0">
          {SEGMENTS.map(([icon, label, seg]) => (
            <Link
              key={seg}
              href={`${B}/services?for=${seg}`}
              className="flex flex-col items-center gap-2 px-3 py-6 text-center hover:bg-canvas hover:no-underline"
            >
              <Icon name={icon} className="h-7 w-7 text-hygiene-navy" />
              <span className="text-sm font-medium text-ink">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Per-unit services ────────────────────────────────── */}
      <ServiceRail
        title="Washrooms, bins & laundry"
        subtitle="Charged per unit or per collection"
        modes={["unit"]}
        limit={4}
        href={`${B}/services?for=washrooms`}
      />

      {/* ── Sanitary pad supply ──────────────────────────────── */}
      <section className="flex flex-col items-start justify-between gap-4 rounded border border-line bg-white p-5 md:flex-row md:items-center">
        <div className="flex items-start gap-4">
          <Icon name="heart-pulse" className="mt-0.5 h-8 w-8 shrink-0 text-hygiene-green" />
          <div>
            <h2 className="text-lg font-bold">Sanitary pads & hygiene products</h2>
            <p className="mt-0.5 text-sm text-slate-600">
              Bulk supply for schools, county governments, NGOs and corporates. Every pad distributed
              helps keep a girl in school.
            </p>
          </div>
        </div>
        <Link href={`${B}/supply`} className="btn-primary shrink-0 rounded">
          Request a quote
        </Link>
      </section>
    </div>
  );
}
