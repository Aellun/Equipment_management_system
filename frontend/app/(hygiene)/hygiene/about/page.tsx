import Link from "next/link";
import { Icon } from "@/app/components/services/Icon";
import HygieneLogo from "@/app/components/hygiene/HygieneLogo";
import { CORE_VALUES, HYGIENE, SECTORS } from "@/app/components/hygiene/brand";

export const metadata = {
  title: "About us",
  description:
    "Dyzah Hygiene is a proudly Kenyan-owned hygiene, sanitation and cleaning solutions company — our story, vision, mission and core values.",
};

const B = HYGIENE.basePath;

const WHO_WE_ARE: string[] = [
  "Dyzah Hygiene is a proudly Kenyan-owned hygiene, sanitation and cleaning solutions company dedicated to delivering exceptional cleaning services while promoting healthier living through innovative hygiene products and community-focused initiatives. We specialise in professional cleaning, sanitation management, hygiene consultancy, and the supply and distribution of sanitary pads and other hygiene products to organisations and communities across Kenya.",
  "Established with a vision of transforming hygiene standards and improving quality of life, Dyzah Hygiene has grown into a dependable service provider recognised for professionalism, reliability, integrity and customer satisfaction. Our business model combines operational excellence with meaningful social impact, letting us address both commercial hygiene needs and broader public health challenges.",
  "At Dyzah Hygiene, we understand that cleanliness extends far beyond appearance. A clean environment contributes directly to improved health, increased productivity, reduced disease transmission, enhanced employee morale and greater customer confidence. This understanding shapes every service we deliver and every relationship we build.",
  "Our cleaning operations are supported by trained professionals who use modern equipment, industry-approved techniques, environmentally responsible products and strict quality control systems. Every assignment begins with understanding the client's unique requirements, allowing us to design customised cleaning solutions that meet operational needs while delivering measurable value.",
];

const OUR_STORY: string[] = [
  "Every successful company begins with a purpose. For Dyzah Hygiene, that purpose has always been simple yet powerful: to improve lives through cleanliness, health and dignity.",
  "The idea emerged from observing the increasing demand for professional hygiene services across homes, businesses, institutions and public facilities. At the same time, we recognised that many girls and women continued to face significant barriers in accessing affordable menstrual hygiene products — affecting their education, confidence, health and participation in everyday life.",
  "Rather than viewing these as separate challenges, we saw an opportunity to create a company capable of addressing both. That vision gave birth to a business that combines world-class cleaning services with meaningful social responsibility.",
  "As our company has evolved, so has our understanding of the role hygiene plays in economic development. Clean workplaces improve employee productivity. Clean healthcare facilities reduce infection risks. Clean learning environments enhance student performance. Access to menstrual hygiene products improves school attendance and empowers girls to pursue their education with confidence.",
  "Although we continue to grow, we remain grounded in the same principles that inspired our establishment: integrity, professionalism, compassion, accountability and service excellence.",
];

function Prose({ paragraphs }: { paragraphs: string[] }) {
  return (
    <div className="mt-4 space-y-4 text-slate-600">
      {paragraphs.map((p) => (
        <p key={p.slice(0, 40)}>{p}</p>
      ))}
    </div>
  );
}

export default function AboutPage() {
  return (
    <div className="space-y-16">
      {/* ── Header ───────────────────────────────────────────── */}
      <section className="card overflow-hidden bg-gradient-to-br from-hygiene-navy to-hygiene-navy-600 p-8 text-white sm:p-12">
        <HygieneLogo onDark showTagline className="items-start text-[22px]" />
        <h1 className="mt-8 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
          {HYGIENE.promise}
        </h1>
        <p className="mt-4 max-w-2xl text-white/75">{HYGIENE.serving}.</p>
      </section>

      {/* ── Who we are ───────────────────────────────────────── */}
      <section>
        <h2 className="text-2xl font-bold">Who we are</h2>
        <Prose paragraphs={WHO_WE_ARE} />
      </section>

      {/* ── Sectors ──────────────────────────────────────────── */}
      <section>
        <h2 className="text-2xl font-bold">Who we serve</h2>
        <p className="mt-1 text-muted">
          Our services span multiple sectors. Regardless of the size or complexity of a project, our commitment to
          quality remains consistent.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {SECTORS.map((s) => (
            <span key={s} className="badge bg-white text-ink ring-1 ring-line">
              {s}
            </span>
          ))}
        </div>
      </section>

      {/* ── Our story ────────────────────────────────────────── */}
      <section>
        <h2 className="text-2xl font-bold">Our story</h2>
        <p className="mt-1 font-semibold text-brand-600">
          Building a cleaner future through innovation, service and compassion
        </p>
        <Prose paragraphs={OUR_STORY} />
      </section>

      {/* ── Vision & mission ─────────────────────────────────── */}
      <section className="grid gap-5 md:grid-cols-2">
        <div className="card p-8">
          <span className="icon-chip h-12 w-12">
            <Icon name="star" className="h-6 w-6" />
          </span>
          <h2 className="mt-4 text-xl font-bold">Our vision</h2>
          <p className="mt-3 text-slate-600">
            To become Kenya&apos;s most trusted provider of integrated hygiene, sanitation, cleaning and community health
            solutions by setting new standards of excellence, innovation, sustainability and customer satisfaction.
          </p>
          <p className="mt-3 text-sm text-slate-500">
            Our vision inspires us to continuously improve our services, embrace innovation, empower our people,
            strengthen our partnerships and create meaningful social impact across every community we serve.
          </p>
        </div>
        <div className="card p-8">
          <span className="icon-chip h-12 w-12">
            <Icon name="shield-check" className="h-6 w-6" />
          </span>
          <h2 className="mt-4 text-xl font-bold">Our mission</h2>
          <p className="mt-3 text-slate-600">
            To provide exceptional cleaning, sanitation and hygiene solutions that improve health, protect the
            environment, and enhance the quality of life for our clients and communities.
          </p>
          <p className="mt-3 text-sm text-slate-500">
            Every project we undertake reflects our commitment to professionalism, integrity, customer satisfaction and
            sustainable development.
          </p>
        </div>
      </section>

      {/* ── Core values ──────────────────────────────────────── */}
      <section>
        <h2 className="text-2xl font-bold">Our core values</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CORE_VALUES.map(([icon, title, body]) => (
            <div key={title} className="card p-6">
              <span className="icon-chip h-11 w-11">
                <Icon name={icon} className="h-5 w-5" />
              </span>
              <p className="mt-3 font-semibold text-ink">{title}</p>
              <p className="mt-1 text-sm text-slate-500">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Looking ahead ────────────────────────────────────── */}
      <section className="card bg-brand-50 p-8 ring-1 ring-brand-200">
        <h2 className="text-xl font-bold text-ink">Looking ahead</h2>
        <p className="mt-3 max-w-3xl text-slate-600">
          We aspire to become a nationally recognised brand associated with trust, quality, community empowerment and
          sustainable hygiene solutions that positively transform lives throughout Kenya and beyond — by combining
          professional expertise, innovative technologies, sustainable practices and community impact.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={`${B}/services`} className="btn-primary">
            Browse our services <Icon name="arrow-right" className="h-4 w-4" />
          </Link>
          <Link href={`${B}/supply/enquiry`} className="btn-ghost">
            Partner with us
          </Link>
        </div>
      </section>
    </div>
  );
}
