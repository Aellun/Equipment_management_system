import Link from "next/link";
import { Icon } from "@/app/components/services/Icon";
import HygieneLogo from "@/app/components/hygiene/HygieneLogo";
import { CORE_VALUES, HYGIENE, SECTORS } from "@/app/components/hygiene/brand";

export const metadata = {
  title: "About us",
  description:
    "Dyzah Hygiene is a Kenyan-owned hygiene, sanitation and cleaning company — our story, vision, mission and values.",
};

const B = HYGIENE.basePath;

/**
 * The detail page.
 *
 * The sales pages stay short on purpose; this is where the full company
 * profile lives for anyone who wants it. The footer links straight to the
 * anchors below.
 */
const WHO_WE_ARE = [
  "Dyzah Hygiene is a Kenyan-owned hygiene, sanitation and cleaning company. We handle professional cleaning, sanitation management and hygiene consultancy, and we supply sanitary pads and hygiene products to organisations and communities across the country.",
  "Cleanliness goes beyond appearance. A clean environment improves health, raises productivity, cuts disease transmission and lifts both staff morale and customer confidence. That shapes every service we deliver.",
  "Our crews are trained professionals using modern equipment, industry-approved techniques, environmentally responsible products and strict quality control. Every assignment starts by understanding what the site actually needs.",
];

const STORY = [
  "The idea came from two things we kept seeing at once: rising demand for professional hygiene services across homes, businesses and institutions — and girls and women facing real barriers to affordable menstrual hygiene products.",
  "Rather than treat those as separate problems, we built one company to address both: world-class cleaning alongside meaningful social responsibility.",
  "Clean workplaces improve productivity. Clean healthcare facilities reduce infection risk. Clean classrooms improve results. And access to menstrual products keeps girls in school.",
  "We have grown, but the principles have not moved: integrity, professionalism, compassion, accountability and service excellence.",
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded bg-hygiene-navy px-6 py-10 text-white md:px-10">
        <HygieneLogo onDark showTagline className="items-start text-[18px]" />
        <h1 className="mt-6 max-w-2xl text-2xl font-extrabold leading-tight md:text-3xl">{HYGIENE.promise}</h1>
        <p className="mt-3 text-white/70">{HYGIENE.serving}.</p>
      </section>

      <Block title="Who we are" paragraphs={WHO_WE_ARE} />

      <section className="rounded border border-line bg-white">
        <h2 className="border-b border-line px-5 py-3 font-bold">Sectors we serve</h2>
        <div className="flex flex-wrap gap-2 p-5">
          {SECTORS.map((s) => (
            <span key={s} className="rounded border border-line px-2.5 py-1 text-sm text-slate-700">
              {s}
            </span>
          ))}
        </div>
      </section>

      <Block id="story" title="Our story" paragraphs={STORY} />

      <section id="values" className="grid gap-4 md:grid-cols-2">
        <div className="rounded border border-line bg-white p-6">
          <h2 className="font-bold">Our vision</h2>
          <p className="mt-2 text-sm text-slate-600">
            To be Kenya&apos;s most trusted provider of integrated hygiene, sanitation, cleaning and community
            health solutions — setting new standards of excellence, innovation, sustainability and customer
            satisfaction.
          </p>
        </div>
        <div className="rounded border border-line bg-white p-6">
          <h2 className="font-bold">Our mission</h2>
          <p className="mt-2 text-sm text-slate-600">
            To provide exceptional cleaning, sanitation and hygiene solutions that improve health, protect the
            environment and enhance quality of life for our clients and communities.
          </p>
        </div>
      </section>

      <section className="rounded border border-line bg-white">
        <h2 className="border-b border-line px-5 py-3 font-bold">Our values</h2>
        <div className="grid gap-x-8 gap-y-5 p-5 sm:grid-cols-2">
          {CORE_VALUES.map(([icon, title, body]) => (
            <div key={title} className="flex gap-3">
              <Icon name={icon} className="mt-0.5 h-5 w-5 shrink-0 text-hygiene-green" />
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-sm text-muted">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="impact" className="rounded border border-line bg-white p-6">
        <h2 className="font-bold">Community impact</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Hygiene is dignity as much as cleanliness. Across Kenya, thousands of girls miss school because
          they cannot access sanitary products. We supply the schools, county governments, NGOs and
          development partners running programmes to change that, and support hygiene education alongside
          the supply.
        </p>
        <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
          {[
            "Every pad distributed keeps a girl in school.",
            "Every hygiene kit supports a healthier family.",
            "Every programme strengthens a community.",
          ].map((t) => (
            <li key={t} className="flex gap-2">
              <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
              {t}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col items-start justify-between gap-4 rounded border border-line bg-brand-50 p-6 md:flex-row md:items-center">
        <p className="font-bold text-ink">{HYGIENE.strapline}</p>
        <div className="flex flex-wrap gap-2">
          <Link href={`${B}/services`} className="btn-primary rounded">
            Get a price
          </Link>
          <Link href={`${B}/survey`} className="btn-ghost rounded">
            Book a site survey
          </Link>
        </div>
      </section>
    </div>
  );
}

function Block({ id, title, paragraphs }: { id?: string; title: string; paragraphs: string[] }) {
  return (
    <section id={id} className="rounded border border-line bg-white">
      <h2 className="border-b border-line px-5 py-3 font-bold">{title}</h2>
      <div className="space-y-3 p-5 text-sm text-slate-600">
        {paragraphs.map((p) => (
          <p key={p.slice(0, 30)}>{p}</p>
        ))}
      </div>
    </section>
  );
}
