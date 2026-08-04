import Link from "next/link";
import { Icon } from "@/app/components/services/Icon";
import EventsHeroDates from "@/app/components/events/EventsHeroDates";
import EventsRail from "@/app/components/events/EventsRail";

/** Bundles priced from real stock — the shortcut most customers want. */
const PACKAGES: { title: string; body: string; category: string }[] = [
  {
    title: "Wedding",
    body: "Chiavari chairs, round tables, marquee, festoon lighting and sound.",
    category: "Seating",
  },
  {
    title: "Corporate & conference",
    body: "Banquet seating, staging, PA, projector-ready lighting and power.",
    category: "Audio",
  },
  {
    title: "Outdoor & garden",
    body: "Stretch tents, gazebos, patio heaters, generators and festoon.",
    category: "Tents & Structures",
  },
];

export default function EventsLanding() {
  return (
    <div className="space-y-8">
      {/* Hero — dates first, because dates decide availability */}
      <section className="-mx-4 bg-hygiene-navy px-4 py-8 sm:rounded md:mx-0 md:px-10 md:py-12">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr),420px]">
          <div>
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-white md:text-[2.75rem]">
              Everything the venue doesn&apos;t provide.
            </h1>
            <p className="mt-3 max-w-xl text-lg text-white/75">
              Chairs, tables, tents, sound, lighting and power — checked, counted and delivered on
              time. Pick your dates and see what&apos;s free.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/events/hire"
                className="rounded bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 hover:no-underline"
              >
                Browse equipment
              </Link>
              <Link
                href="/events/track"
                className="rounded bg-white/10 px-5 py-2.5 text-sm font-semibold text-white ring-1 ring-white/25 hover:bg-white/20 hover:no-underline"
              >
                Track a request
              </Link>
            </div>
            <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/70">
              {["Live availability", "Delivery & setup", "Counted in and out", "No payment to enquire"].map(
                (t) => (
                  <li key={t} className="flex items-center gap-1.5">
                    <Icon name="check" className="h-4 w-4 text-hygiene-green" />
                    {t}
                  </li>
                )
              )}
            </ul>
          </div>
          <EventsHeroDates />
        </div>
      </section>

      {/* Popular kit, priced */}
      <EventsRail title="Seating" subtitle="Chairs and lounge furniture" category="Seating" />
      <EventsRail title="Tents, staging & structures" subtitle="Cover the space" category="Tents & Structures" />

      {/* Packages */}
      <section className="rounded border border-line bg-white">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-5 py-3.5">
          <div>
            <h2 className="text-lg font-bold">Hiring for a…</h2>
            <p className="text-sm text-muted">Start from a typical setup and adjust</p>
          </div>
        </div>
        <div className="grid divide-y divide-line md:grid-cols-3 md:divide-x md:divide-y-0">
          {PACKAGES.map((p) => (
            <Link
              key={p.title}
              href={`/events/hire?category=${encodeURIComponent(p.category)}`}
              className="p-6 hover:bg-canvas hover:no-underline"
            >
              <p className="font-bold text-ink">{p.title}</p>
              <p className="mt-1 text-sm text-muted">{p.body}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-600">
                See kit <Icon name="arrow-right" className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <EventsRail title="Sound & lighting" subtitle="PA, mics, mixers and fixtures" category="Audio" />

      {/* How hire works — four lines, no fluff */}
      <section className="rounded border border-line bg-white">
        <h2 className="border-b border-line px-5 py-3 font-bold">How hire works</h2>
        <ol className="grid divide-y divide-line sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          {[
            ["Pick your dates", "Availability updates to match."],
            ["Build a list", "Add quantities, see the running cost."],
            ["We confirm", "Stock, transport and access checked."],
            ["Delivered & collected", "Counted out and counted back in."],
          ].map(([title, body], i) => (
            <li key={title} className="p-5">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-hygiene-navy text-xs font-bold text-white">
                {i + 1}
              </span>
              <p className="mt-2 font-semibold">{title}</p>
              <p className="mt-0.5 text-sm text-muted">{body}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
