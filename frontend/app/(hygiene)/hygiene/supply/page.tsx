import Link from "next/link";
import { Icon } from "@/app/components/services/Icon";

export const metadata = {
  title: "Sanitary pads & hygiene products",
  description:
    "Bulk supply of sanitary pads and hygiene products to schools, county governments, healthcare facilities, NGOs and corporates across Kenya.",
};

const B = "/hygiene";

const BUYERS = [
  "Schools & colleges",
  "County governments",
  "Healthcare facilities",
  "NGOs & humanitarian agencies",
  "Corporates",
  "Faith-based organisations",
];

const PRODUCTS: [string, string][] = [
  ["heart-pulse", "Sanitary pads"],
  ["package", "Menstrual hygiene kits"],
  ["droplet", "Washroom consumables"],
  ["shield-check", "Sanitiser & dispensers"],
];

export default function SupplyPage() {
  return (
    <div className="space-y-6">
      {/* Hero — one line, one action */}
      <section className="rounded bg-hygiene-navy px-6 py-8 text-white md:px-10 md:py-10">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-xl">
            <h1 className="text-2xl font-extrabold md:text-3xl">Sanitary pads & hygiene products, in bulk</h1>
            <p className="mt-2 text-white/75">
              Reliable supply to schools, county governments, NGOs and corporates. Priced per tender, so
              tell us what you need and we&apos;ll quote.
            </p>
          </div>
          <Link
            href={`${B}/supply/enquiry`}
            className="rounded bg-brand-500 px-6 py-3 font-semibold text-white hover:bg-brand-600 hover:no-underline"
          >
            Request a quote
          </Link>
        </div>
      </section>

      {/* What we supply */}
      <section className="rounded border border-line bg-white">
        <h2 className="border-b border-line px-5 py-3 font-bold">What we supply</h2>
        <div className="grid grid-cols-2 divide-x divide-y divide-line lg:grid-cols-4 lg:divide-y-0">
          {PRODUCTS.map(([icon, label]) => (
            <div key={label} className="flex flex-col items-center gap-2 px-4 py-6 text-center">
              <Icon name={icon} className="h-6 w-6 text-hygiene-navy" />
              <span className="text-sm font-medium">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Who buys + how it works */}
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded border border-line bg-white">
          <h2 className="border-b border-line px-5 py-3 font-bold">Who we supply</h2>
          <ul className="grid gap-2 p-5 text-sm sm:grid-cols-2">
            {BUYERS.map((b) => (
              <li key={b} className="flex items-center gap-2">
                <Icon name="check" className="h-4 w-4 shrink-0 text-brand-500" />
                {b}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded border border-line bg-white">
          <h2 className="border-b border-line px-5 py-3 font-bold">How it works</h2>
          <ol className="divide-y divide-line text-sm">
            {[
              ["Send your requirement", "Products, volumes, frequency, delivery county."],
              ["We quote", "Competitive pricing against your specification."],
              ["We deliver", "On the agreed cycle, with support throughout."],
            ].map(([title, body], i) => (
              <li key={title} className="flex gap-3 px-5 py-3.5">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-hygiene-navy text-[11px] font-bold text-white">
                  {i + 1}
                </span>
                <span>
                  <span className="font-semibold">{title}</span>
                  <span className="block text-muted">{body}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {/* Impact — the reason this pillar exists, kept to three lines */}
      <section className="rounded border border-line bg-brand-50 p-6">
        <h2 className="font-bold text-ink">Every pad distributed helps keep a girl in school.</h2>
        <p className="mt-1.5 max-w-3xl text-sm text-slate-600">
          Thousands of girls in Kenya miss school for lack of sanitary products. We supply the
          programmes that change that — and we work with partners on hygiene education alongside it.
        </p>
        <Link href={`${B}/about#impact`} className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:underline">
          More on our community work →
        </Link>
      </section>

      <p className="flex items-start gap-2 text-xs text-muted">
        <Icon name="shield-check" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
        Enquiry details are used only to prepare and follow up on your quote. They are never published
        or shared with other clients.
      </p>
    </div>
  );
}
