import Link from "next/link";
import { Icon } from "@/app/components/services/Icon";
import { HYGIENE, SECTORS, WHY_US } from "@/app/components/hygiene/brand";

const B = HYGIENE.basePath;

/** The two pillars of the business, straight from the company profile. */
const PILLARS: { icon: string; title: string; body: string; href: string; cta: string }[] = [
  {
    icon: "sparkles",
    title: "Professional cleaning services",
    body:
      "Commercial, office, residential, institutional, healthcare, industrial and hospitality cleaning — delivered by trained crews using modern equipment and environmentally responsible products.",
    href: `${B}/services`,
    cta: "See cleaning services",
  },
  {
    icon: "heart-pulse",
    title: "Hygiene products & sanitary pad supply",
    body:
      "Reliable supply and distribution of quality sanitary pads and hygiene products to schools, county governments, healthcare facilities, NGOs and corporate organisations.",
    href: `${B}/supply`,
    cta: "Explore supply & distribution",
  },
];

const SERVICE_LINES: [string, string, string][] = [
  ["building", "Commercial", "Offices, retail, malls, banks, showrooms and business parks."],
  ["home", "Residential", "Housekeeping, deep cleans, move-in/out and post-renovation."],
  ["graduation-cap", "Institutional", "Schools, universities, places of worship and public offices."],
  ["heart-pulse", "Healthcare", "Hospitals, clinics, laboratories and pharmacies."],
  ["package", "Industrial", "Plants, warehouses, production and distribution facilities."],
  ["star", "Hospitality", "Guest rooms, restaurants, kitchens and recreational areas."],
];

const STEPS: [string, string][] = [
  ["Tell us the site", "Pick a service and share the location, size and schedule you need."],
  ["Get a clear price", "An itemised quote before you commit — larger sites are re-quoted after a visit."],
  ["Pay by M-Pesa", "One STK push to your phone. No cards, no hidden charges."],
  ["Crew cleans, you approve", "Trained crew completes the work and submits photo proof for your review."],
];

export default function HygieneLanding() {
  return (
    <div className="space-y-20">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="grid items-center gap-10 md:grid-cols-2">
        <div>
          <span className="badge bg-brand-50 text-brand-700 ring-1 ring-brand-200">
            <Icon name="sparkles" className="mr-1 h-3.5 w-3.5" />
            Proudly Kenyan-owned
          </span>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
            Creating cleaner spaces.{" "}
            <span className="text-brand-600">Promoting health. Empowering communities.</span>
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Dyzah Hygiene delivers professional cleaning, sanitation management and hygiene product supply to homes,
            businesses, institutions and communities across Kenya — combining operational excellence with real social
            impact.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={`${B}/services`} className="btn-primary">
              Book a cleaning service <Icon name="arrow-right" className="h-4 w-4" />
            </Link>
            <Link href={`${B}/supply/enquiry`} className="btn-ghost">
              Request a supply quote
            </Link>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-hygiene-navy to-hygiene-navy-600 p-6 text-white">
          <p className="text-sm font-semibold text-hygiene-green">Why organisations choose us</p>
          <h2 className="mt-1 text-xl font-bold">Cleanliness extends far beyond appearance.</h2>
          <p className="mt-2 text-sm text-white/70">
            A clean environment improves health, raises productivity, reduces disease transmission and builds customer
            confidence. That understanding shapes every service we deliver.
          </p>
          <ul className="mt-6 space-y-3">
            {WHY_US.slice(0, 5).map((item) => (
              <li key={item} className="flex gap-3 text-sm">
                <Icon name="check-circle" className="mt-0.5 h-5 w-5 shrink-0 text-hygiene-green" />
                <span className="text-white/85">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Two pillars ──────────────────────────────────────── */}
      <section>
        <h2 className="text-2xl font-bold">What we do</h2>
        <p className="mt-1 text-muted">
          Two pillars, one purpose — healthier environments and healthier communities.
        </p>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {PILLARS.map((p) => (
            <Link
              key={p.title}
              href={p.href}
              className="card flex flex-col p-6 transition hover:-translate-y-1 hover:shadow-md hover:no-underline"
            >
              <span className="icon-chip h-14 w-14">
                <Icon name={p.icon} className="h-7 w-7" />
              </span>
              <p className="mt-4 text-lg font-bold text-ink">{p.title}</p>
              <p className="mt-2 flex-1 text-sm text-slate-500">{p.body}</p>
              <span className="mt-4 inline-flex items-center gap-1 font-semibold text-brand-600">
                {p.cta} <Icon name="arrow-right" className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Service lines ────────────────────────────────────── */}
      <section>
        <h2 className="text-2xl font-bold">Cleaning across every sector</h2>
        <p className="mt-1 text-muted">
          No two facilities are alike. Every assignment starts by understanding your requirements, then we build the
          schedule around them.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICE_LINES.map(([icon, title, body]) => (
            <Link
              href={`${B}/services`}
              key={title}
              className="card p-6 transition hover:-translate-y-1 hover:shadow-md hover:no-underline"
            >
              <span className="icon-chip h-12 w-12">
                <Icon name={icon} className="h-6 w-6" />
              </span>
              <p className="mt-3 font-semibold text-ink">{title} cleaning</p>
              <p className="mt-1 text-sm text-slate-500">{body}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Community impact ─────────────────────────────────── */}
      <section className="card overflow-hidden">
        <div className="grid md:grid-cols-2">
          <div className="bg-gradient-to-br from-hygiene-navy to-hygiene-navy-600 p-8 text-white">
            <p className="text-sm font-semibold text-hygiene-green">Empowering communities through hygiene</p>
            <h2 className="mt-2 text-2xl font-bold">
              Hygiene is more than cleanliness — it is dignity, confidence and opportunity.
            </h2>
            <p className="mt-4 text-sm text-white/75">
              Across Kenya, thousands of girls miss school because they cannot access sanitary products. That reality
              made us more than a distributor — it made us an advocate for menstrual dignity.
            </p>
            <Link
              href={`${B}/supply`}
              className="mt-6 inline-flex items-center gap-1 font-semibold text-hygiene-green hover:text-white hover:no-underline"
            >
              How our supply programme works <Icon name="arrow-right" className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-6 p-8">
            {[
              ["Every sanitary pad distributed helps keep a girl in school.", "graduation-cap"],
              ["Every hygiene kit supports healthier families.", "heart-pulse"],
              ["Every awareness programme strengthens communities.", "message-circle"],
            ].map(([text, icon]) => (
              <div key={text} className="flex gap-3">
                <span className="icon-chip h-11 w-11 shrink-0">
                  <Icon name={icon} className="h-5 w-5" />
                </span>
                <p className="self-center text-sm font-medium text-ink">{text}</p>
              </div>
            ))}
            <p className="text-sm text-slate-500">
              We work alongside schools, county governments, NGOs, development partners and corporate organisations to
              increase access to menstrual hygiene products while promoting awareness and education.
            </p>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section className="card p-6">
        <h2 className="text-2xl font-bold">How booking works</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-4">
          {STEPS.map(([title, body], i) => (
            <div key={title}>
              <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-50 font-bold text-brand-600">
                {i + 1}
              </div>
              <p className="mt-3 font-semibold">{title}</p>
              <p className="mt-1 text-sm text-slate-500">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Sectors served ───────────────────────────────────── */}
      <section>
        <h2 className="text-2xl font-bold">Sectors we serve</h2>
        <p className="mt-1 text-muted">
          Regardless of the size or complexity of a project, our commitment to quality stays consistent.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {SECTORS.map((s) => (
            <span key={s} className="badge bg-white text-ink ring-1 ring-line">
              {s}
            </span>
          ))}
        </div>
      </section>

      {/* ── Closing CTA ──────────────────────────────────────── */}
      <section className="card flex flex-col items-start gap-4 bg-brand-50 p-8 ring-1 ring-brand-200 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold text-ink">{HYGIENE.strapline}</h2>
          <p className="mt-1 text-sm text-slate-600">
            Long-term partnerships, not one-time transactions. Tell us what your facility needs.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          <Link href={`${B}/services`} className="btn-primary">
            Browse services
          </Link>
          <Link href={`${B}/about`} className="btn-ghost">
            About Dyzah Hygiene
          </Link>
        </div>
      </section>
    </div>
  );
}
