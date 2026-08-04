import Link from "next/link";
import { Icon } from "@/app/components/services/Icon";
import { HYGIENE } from "@/app/components/hygiene/brand";

export const metadata = {
  title: "Hygiene products & sanitary pad distribution",
  description:
    "Reliable supply and distribution of quality sanitary pads and hygiene products to schools, county governments, healthcare facilities, NGOs, development partners and corporate organisations across Kenya.",
};

const B = HYGIENE.basePath;

/** Organisation types the supply programme is designed to support. */
const PARTNERS: [string, string][] = [
  ["landmark", "Government institutions"],
  ["landmark", "County governments"],
  ["graduation-cap", "Schools & colleges"],
  ["heart-pulse", "Healthcare facilities"],
  ["shield-check", "NGOs & humanitarian agencies"],
  ["building", "Corporate organisations"],
  ["user", "Development partners"],
  ["message-circle", "Faith-based organisations"],
  ["home", "Community-based initiatives"],
];

const IMPACT: [string, string][] = [
  ["Every sanitary pad distributed helps keep a girl in school.", "graduation-cap"],
  ["Every hygiene kit supports healthier families.", "heart-pulse"],
  ["Every awareness programme strengthens communities.", "message-circle"],
];

export default function SupplyPage() {
  return (
    <div className="space-y-16">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="card overflow-hidden bg-gradient-to-br from-hygiene-navy to-hygiene-navy-600 p-8 text-white sm:p-12">
        <span className="badge bg-white/10 text-hygiene-green ring-1 ring-hygiene-green/40">
          Second pillar of our business
        </span>
        <h1 className="mt-4 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
          Hygiene products & sanitary pad distribution
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-hygiene-green">
          Promoting dignity, health and well-being through accessible hygiene solutions.
        </p>
        <p className="mt-4 max-w-3xl text-white/75">
          Access to quality hygiene products is fundamental to public health, personal dignity, confidence and social
          development. While professional cleaning forms one pillar of our business, we are equally dedicated to
          ensuring individuals, families, institutions and communities can access the essentials that promote healthier
          living.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={`${B}/supply/enquiry`}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-hygiene-green px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-hygiene-green-600 hover:no-underline"
          >
            Request a supply quote <Icon name="arrow-right" className="h-4 w-4" />
          </Link>
          <Link
            href={`${B}/about`}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-5 py-2.5 text-sm font-semibold text-white ring-1 ring-white/25 transition-colors hover:bg-white/20 hover:no-underline"
          >
            About Dyzah Hygiene
          </Link>
        </div>
      </section>

      {/* ── Why it matters ───────────────────────────────────── */}
      <section className="grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="text-2xl font-bold">More than a distributor</h2>
          <div className="mt-4 space-y-4 text-slate-600">
            <p>
              One of our flagship initiatives is the supply and distribution of high-quality sanitary pads and menstrual
              hygiene products. We believe menstrual health is not only a personal issue but a matter of education,
              gender equality, economic empowerment and human dignity.
            </p>
            <p>
              Every girl and woman deserves access to safe, affordable and reliable menstrual hygiene products, without
              barriers that compromise her health, education, confidence or opportunities.
            </p>
            <p>
              Across Kenya and many parts of Africa, thousands of girls continue to miss school due to inadequate access
              to sanitary products and limited menstrual hygiene education. Women in vulnerable communities also face
              challenges accessing affordable hygiene essentials. These realities inspired us to become more than a
              distributor — we have become an advocate for menstrual dignity.
            </p>
          </div>
        </div>
        <div className="card flex flex-col justify-center gap-6 p-8">
          {IMPACT.map(([text, icon]) => (
            <div key={text} className="flex gap-3">
              <span className="icon-chip h-11 w-11 shrink-0">
                <Icon name={icon} className="h-5 w-5" />
              </span>
              <p className="self-center text-sm font-medium text-ink">{text}</p>
            </div>
          ))}
          <p className="border-t border-line pt-5 text-sm text-slate-500">
            Every partnership contributes to a future where access to hygiene is recognised not as a privilege, but as a
            basic necessity.
          </p>
        </div>
      </section>

      {/* ── Who we supply ────────────────────────────────────── */}
      <section>
        <h2 className="text-2xl font-bold">Who we supply</h2>
        <p className="mt-1 text-muted">
          Our distribution services are designed to give organisations dependable access to quality hygiene products.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PARTNERS.map(([icon, label]) => (
            <div key={label} className="card flex items-center gap-3 p-4">
              <span className="icon-chip h-10 w-10 shrink-0">
                <Icon name={icon} className="h-5 w-5" />
              </span>
              <span className="text-sm font-medium text-ink">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── How supply works ─────────────────────────────────── */}
      <section className="card p-8">
        <h2 className="text-2xl font-bold">How supply works</h2>
        <p className="mt-1 text-muted">
          Volumes, specifications and pricing vary by organisation and tender, so supply is quoted rather than sold at a
          fixed shelf price.
        </p>
        <div className="mt-6 grid gap-6 md:grid-cols-4">
          {(
            [
              ["Send your requirement", "Tell us the products, volumes, frequency and delivery county."],
              ["We prepare a quote", "Competitive pricing built around your specification and schedule."],
              ["Agree terms", "Delivery schedule, documentation and any programme support are confirmed."],
              ["Reliable delivery", "Consistent supply on the agreed cycle, with support throughout."],
            ] as [string, string][]
          ).map(([title, body], i) => (
            <div key={title}>
              <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-50 font-bold text-brand-600">
                {i + 1}
              </div>
              <p className="mt-3 font-semibold">{title}</p>
              <p className="mt-1 text-sm text-slate-500">{body}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 flex items-start gap-2 rounded-xl bg-brand-50 p-4 text-sm text-slate-600 ring-1 ring-brand-200">
          <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
          Enquiry details are used only to prepare and follow up on your quote. They are not published anywhere on this
          site and are visible only to the Dyzah Hygiene team.
        </p>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="card flex flex-col items-start gap-4 bg-brand-50 p-8 ring-1 ring-brand-200 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold text-ink">
            Building healthier communities — one product, one partnership, one life at a time.
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Combining reliable supply chains, competitive pricing and a strong commitment to social impact.
          </p>
        </div>
        <Link href={`${B}/supply/enquiry`} className="btn-primary shrink-0">
          Request a quote
        </Link>
      </section>
    </div>
  );
}
