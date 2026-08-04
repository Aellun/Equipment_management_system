import Link from "next/link";
import { Icon } from "@/app/components/services/Icon";

export const metadata = {
  title: "Dyzah — One umbrella for city services",
  description: "Dyzah Store and Dyzah Services (errands, deliveries, hygiene) — one trusted platform.",
};

const BUSINESSES: { href: string; icon: string; name: string; tagline: string; cta: string }[] = [
  {
    href: "/store",
    icon: "shopping-bag",
    name: "Dyzah Store",
    tagline: "Quality goods with pay-on-delivery and countrywide delivery.",
    cta: "Shop now",
  },
  {
    href: "/services",
    icon: "bike",
    name: "Dyzah Services",
    tagline: "Errands, deliveries, sanitary collection, laundry & cleaning — verified crew, photo proof.",
    cta: "Book a service",
  },
];

export default function DyzahHome() {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="bg-squid text-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <span className="grid h-9 w-9 place-items-center rounded bg-brand-500 text-lg font-bold text-squid">D</span>
          <span className="text-xl font-extrabold tracking-tight">
            Dyzah
          </span>
          <span className="ml-2 hidden text-sm text-white/60 sm:inline">One umbrella for city services</span>
          <nav className="ml-auto flex items-center gap-1 text-sm">
            {[
              { href: "/store", label: "Store" },
              { href: "/services", label: "Services" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded px-3 py-1.5 text-white/80 hover:bg-white/10 hover:text-white hover:no-underline"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <section className="bg-gradient-to-br from-squid to-navy text-white">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
            Everything your city life needs — <span className="text-brand-400">under one trusted roof.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/80">
            Dyzah brings together shopping, errands, hygiene services and equipment management. Transparent pricing,
            direct M-Pesa payments and proof on every job.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-2xl font-bold">Our businesses</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {BUSINESSES.map((b) => (
            <Link
              key={b.name}
              href={b.href}
              className="card flex flex-col p-6 transition hover:-translate-y-1 hover:shadow-md hover:no-underline"
            >
              <span className="icon-chip h-14 w-14">
                <Icon name={b.icon} className="h-7 w-7" />
              </span>
              <p className="mt-4 text-lg font-bold text-ink">{b.name}</p>
              <p className="mt-1 flex-1 text-sm text-slate-500">{b.tagline}</p>
              <span className="mt-4 inline-flex items-center gap-1 font-semibold text-brand-600">
                {b.cta} <Icon name="arrow-right" className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-12 grid gap-4 rounded-2xl bg-white p-6 ring-1 ring-line sm:grid-cols-3">
          {([
            ["shield-check", "M-Pesa payments", "Pay directly and securely with one STK push."],
            ["tag", "Transparent pricing", "Itemised quotes before you commit."],
            ["camera", "Proof on every job", "Photo proof and verified providers."],
          ] as const).map(([icon, title, body]) => (
            <div key={title} className="flex gap-3">
              <span className="icon-chip h-11 w-11 shrink-0">
                <Icon name={icon} className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold">{title}</p>
                <p className="text-sm text-slate-500">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="mt-8 border-t border-line bg-navy text-white">
        <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-white/70">
          © {new Date().getFullYear()} Dyzah. Store · Services (Errands & Hygiene).
        </div>
      </footer>
    </div>
  );
}
