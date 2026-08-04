"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/app/components/services/Icon";
import EventsCartProvider, { useEventsCart } from "./EventsCart";

const SWITCHER = [
  { href: "/home", label: "Dyzah" },
  { href: "/store", label: "Store" },
  { href: "/hygiene", label: "Hygiene" },
  { href: "/services", label: "Errands" },
];

const CATEGORIES: [string, string][] = [
  ["Seating", "Chairs"],
  ["Tables", "Tables"],
  ["Tents & Structures", "Tents & staging"],
  ["Audio", "Sound"],
  ["Lighting", "Lighting"],
  ["Power & Climate", "Power & climate"],
  ["Catering", "Catering"],
  ["Decor", "Decor"],
];

export default function EventsShell({ children }: { children: React.ReactNode }) {
  return (
    <EventsCartProvider>
      <Chrome>{children}</Chrome>
    </EventsCartProvider>
  );
}

function Chrome({ children }: { children: React.ReactNode }) {
  const { itemCount } = useEventsCart();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [q, setQ] = useState("");

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/events/hire${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);
  };

  return (
    <div className="theme-events flex min-h-screen flex-col bg-canvas text-ink">
      <header className="sticky top-0 z-30">
        <div className="bg-hygiene-navy text-[12px] text-white/65">
          <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-1.5">
            {SWITCHER.map((s) => (
              <Link key={s.href} href={s.href} className="hover:text-white hover:no-underline">
                {s.label}
              </Link>
            ))}
            <span className="ml-auto hidden sm:inline">Delivery, setup and collection across Kenya</span>
          </div>
        </div>

        <div className="border-b border-line bg-white">
          <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2.5">
            <button
              className="-ml-1 grid h-9 w-9 shrink-0 place-items-center rounded lg:hidden"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Menu"
            >
              <Icon name={menuOpen ? "x" : "menu"} className="h-5 w-5" />
            </button>

            <Link href="/events" className="shrink-0 hover:no-underline" aria-label="Dyzah Events">
              <span className="flex flex-col leading-none">
                <span className="text-[19px] font-black tracking-[0.14em] text-hygiene-navy">DYZAH</span>
                <span className="mt-[3px] flex w-full items-center gap-1.5">
                  <span className="h-[2px] flex-1 bg-hygiene-green" />
                  <span className="text-[11px] font-extrabold tracking-[0.2em] text-hygiene-green">EVENTS</span>
                  <span className="h-[2px] flex-1 bg-hygiene-green" />
                </span>
              </span>
            </Link>

            <form onSubmit={search} className="hidden min-w-0 flex-1 items-center md:flex">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search chairs, tents, sound, lighting…"
                className="h-10 min-w-0 flex-1 rounded-l border border-r-0 border-slate-300 px-3 text-sm outline-none focus:border-brand-500"
              />
              <button
                type="submit"
                className="grid h-10 w-12 shrink-0 place-items-center rounded-r bg-brand-500 text-white hover:bg-brand-600"
                aria-label="Search"
              >
                <Icon name="search" className="h-4 w-4" />
              </button>
            </form>

            <div className="ml-auto flex shrink-0 items-center gap-2">
              <Link
                href="/events/track"
                className="hidden px-2 text-sm text-slate-600 hover:text-ink hover:no-underline sm:block"
              >
                Track request
              </Link>
              <Link
                href="/events/request"
                className="relative flex items-center gap-2 rounded bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 hover:no-underline"
              >
                <Icon name="shopping-cart" className="h-4 w-4" />
                <span className="hidden sm:inline">My hire list</span>
                {itemCount > 0 && (
                  <span className="grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-white px-1 text-xs font-bold text-brand-700">
                    {itemCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>

        <div className="border-b border-line bg-white shadow-sm">
          <nav className="scrollbar-none mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 text-sm">
            <Link
              href="/events/hire"
              className={`whitespace-nowrap border-b-2 px-3 py-2.5 font-medium hover:no-underline ${
                pathname === "/events/hire"
                  ? "border-brand-500 text-brand-700"
                  : "border-transparent text-slate-600 hover:border-slate-300 hover:text-ink"
              }`}
            >
              All equipment
            </Link>
            {CATEGORIES.map(([key, label]) => (
              <Link
                key={key}
                href={`/events/hire?category=${encodeURIComponent(key)}`}
                className="whitespace-nowrap border-b-2 border-transparent px-3 py-2.5 text-slate-600 hover:border-slate-300 hover:text-ink hover:no-underline"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {menuOpen && (
          <div className="border-b border-line bg-white shadow-md lg:hidden">
            <form onSubmit={search} className="flex items-center p-3">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search equipment"
                className="h-10 min-w-0 flex-1 rounded-l border border-r-0 border-slate-300 px-3 text-sm outline-none"
              />
              <button type="submit" className="grid h-10 w-12 place-items-center rounded-r bg-brand-500 text-white">
                <Icon name="search" className="h-4 w-4" />
              </button>
            </form>
            <nav className="flex flex-col pb-2">
              {CATEGORIES.map(([key, label]) => (
                <Link
                  key={key}
                  href={`/events/hire?category=${encodeURIComponent(key)}`}
                  onClick={() => setMenuOpen(false)}
                  className="px-4 py-2.5 text-sm hover:bg-canvas hover:no-underline"
                >
                  {label}
                </Link>
              ))}
              <Link href="/events/track" onClick={() => setMenuOpen(false)} className="px-4 py-2.5 text-sm hover:bg-canvas hover:no-underline">
                Track a request
              </Link>
            </nav>
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>

      <footer className="mt-10 bg-hygiene-navy text-white">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <span className="flex flex-col leading-none">
                <span className="text-[19px] font-black tracking-[0.14em] text-white">DYZAH</span>
                <span className="mt-[3px] flex w-full items-center gap-1.5">
                  <span className="h-[2px] flex-1 bg-hygiene-green" />
                  <span className="text-[11px] font-extrabold tracking-[0.2em] text-hygiene-green">EVENTS</span>
                  <span className="h-[2px] flex-1 bg-hygiene-green" />
                </span>
              </span>
              <p className="mt-4 text-sm text-white/60">
                Event equipment hire with delivery, setup and collection.
              </p>
            </div>
            {[
              ["Hire", CATEGORIES.slice(0, 4).map(([k, l]) => [`/events/hire?category=${encodeURIComponent(k)}`, l])],
              ["More kit", CATEGORIES.slice(4).map(([k, l]) => [`/events/hire?category=${encodeURIComponent(k)}`, l])],
              [
                "Help",
                [
                  ["/events/request", "Request a quote"],
                  ["/events/track", "Track a request"],
                  ["/home", "About Dyzah"],
                ],
              ],
            ].map(([title, links]) => (
              <div key={title as string}>
                <p className="text-sm font-semibold">{title as string}</p>
                <ul className="mt-3 space-y-2 text-sm text-white/65">
                  {(links as string[][]).map(([href, label]) => (
                    <li key={label}>
                      <Link href={href} className="hover:text-white hover:no-underline">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-8 border-t border-white/10 pt-6 text-xs text-white/45">
            © {new Date().getFullYear()} Dyzah Events. Checked, counted and delivered on time.
          </p>
        </div>
      </footer>
    </div>
  );
}
