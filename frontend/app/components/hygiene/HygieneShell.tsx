"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/app/components/services/Icon";
import { useServicesAuth } from "@/app/components/services/ServicesAuthProvider";
import HygieneLogo from "./HygieneLogo";
import { HYGIENE, HYGIENE_CONTACT, hasContactDetails } from "./brand";

const SWITCHER = [
  { href: "/home", label: "Dyzah" },
  { href: "/store", label: "Store" },
  { href: "/services", label: "Errands" },
];

/** Category rail — the way customers actually pick, by what they own. */
const CATEGORIES: [string, string][] = [
  ["/hygiene/services?for=home", "Homes"],
  ["/hygiene/services?for=office", "Offices"],
  ["/hygiene/services?for=schools", "Schools"],
  ["/hygiene/services?for=healthcare", "Healthcare"],
  ["/hygiene/services?for=industrial", "Industrial"],
  ["/hygiene/services?for=hospitality", "Hotels"],
  ["/hygiene/services?for=washrooms", "Washrooms & bins"],
  ["/hygiene/supply", "Hygiene products"],
];

export default function HygieneShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useServicesAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [q, setQ] = useState("");

  const base = HYGIENE.basePath;
  const dash =
    user?.role === "admin" ? "/admin" : user?.role === "runner" ? `${base}/runner` : `${base}/account`;

  const doLogout = () => {
    logout();
    setMenuOpen(false);
    router.push(base);
  };

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`${base}/services${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);
  };

  return (
    // `theme-hygiene` swaps the brand CSS variables to the client's navy +
    // green, re-theming every shared services component rendered inside.
    <div className="theme-hygiene flex min-h-screen flex-col bg-canvas text-ink">
      <header className="sticky top-0 z-30">
        {/* Utility strip */}
        <div className="bg-hygiene-navy text-[12px] text-white/65">
          <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-1.5">
            {SWITCHER.map((s) => (
              <Link key={s.href} href={s.href} className="hover:text-white hover:no-underline">
                {s.label}
              </Link>
            ))}
            <span className="ml-auto hidden items-center gap-4 sm:flex">
              {HYGIENE_CONTACT.phone && (
                <a href={`tel:${HYGIENE_CONTACT.phone}`} className="flex items-center gap-1.5 hover:text-white">
                  <Icon name="phone" className="h-3.5 w-3.5" />
                  {HYGIENE_CONTACT.phone}
                </a>
              )}
              <Link href={`${base}/track`} className="hover:text-white hover:no-underline">
                Track a booking
              </Link>
              <Link href={`${base}/about`} className="hover:text-white hover:no-underline">
                About us
              </Link>
            </span>
          </div>
        </div>

        {/* Main bar */}
        <div className="border-b border-line bg-white">
          <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2.5">
            <button
              className="-ml-1 grid h-9 w-9 shrink-0 place-items-center rounded text-ink hover:bg-canvas lg:hidden"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Menu"
            >
              <Icon name={menuOpen ? "x" : "menu"} className="h-5 w-5" />
            </button>

            <Link href={base} className="shrink-0 hover:no-underline" aria-label={HYGIENE.name}>
              <HygieneLogo className="text-[14px]" />
            </Link>

            <form onSubmit={search} className="hidden min-w-0 flex-1 items-center md:flex">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search cleaning services"
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

            <div className="ml-auto flex shrink-0 items-center gap-1">
              {user ? (
                <>
                  <Link
                    href={dash}
                    className="hidden rounded px-2.5 py-1 text-sm leading-tight text-ink hover:bg-canvas hover:no-underline sm:block"
                  >
                    <span className="block text-[11px] text-muted">Hi, {user.full_name.split(" ")[0]}</span>
                    <span className="font-semibold">My account</span>
                  </Link>
                  <button onClick={doLogout} className="hidden px-2 text-sm text-muted hover:text-ink lg:block">
                    Sign out
                  </button>
                </>
              ) : (
                <Link
                  href={`${base}/login`}
                  className="hidden rounded px-2.5 py-1 text-sm leading-tight text-ink hover:bg-canvas hover:no-underline sm:block"
                >
                  <span className="block text-[11px] text-muted">Hello, sign in</span>
                  <span className="font-semibold">Account</span>
                </Link>
              )}
              <Link
                href={`${base}/services`}
                className="rounded bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 hover:no-underline"
              >
                Get a price
              </Link>
            </div>
          </div>
        </div>

        {/* Category rail */}
        <div className="border-b border-line bg-white shadow-sm">
          <nav className="scrollbar-none mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 text-sm">
            {CATEGORIES.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className={`whitespace-nowrap border-b-2 px-3 py-2.5 hover:no-underline ${
                  pathname === href.split("?")[0] && href.includes("supply")
                    ? "border-brand-500 font-semibold text-brand-700"
                    : "border-transparent text-slate-600 hover:border-slate-300 hover:text-ink"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="border-b border-line bg-white shadow-md lg:hidden">
            <form onSubmit={search} className="flex items-center p-3">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search cleaning services"
                className="h-10 min-w-0 flex-1 rounded-l border border-r-0 border-slate-300 px-3 text-sm outline-none"
              />
              <button type="submit" className="grid h-10 w-12 place-items-center rounded-r bg-brand-500 text-white">
                <Icon name="search" className="h-4 w-4" />
              </button>
            </form>
            <nav className="flex flex-col pb-2">
              {[...CATEGORIES, [`${base}/about`, "About us"], [`${base}/track`, "Track a booking"]].map(
                ([href, label]) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMenuOpen(false)}
                    className="px-4 py-2.5 text-sm text-ink hover:bg-canvas hover:no-underline"
                  >
                    {label}
                  </Link>
                )
              )}
              <div className="my-1 border-t border-line" />
              {user ? (
                <button onClick={doLogout} className="px-4 py-2.5 text-left text-sm text-ink hover:bg-canvas">
                  Sign out
                </button>
              ) : (
                <>
                  <Link
                    href={`${base}/login`}
                    onClick={() => setMenuOpen(false)}
                    className="px-4 py-2.5 text-sm text-ink hover:bg-canvas hover:no-underline"
                  >
                    Sign in
                  </Link>
                  <Link
                    href={`${base}/register`}
                    onClick={() => setMenuOpen(false)}
                    className="px-4 py-2.5 text-sm text-ink hover:bg-canvas hover:no-underline"
                  >
                    Create an account
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>

      <Footer />
    </div>
  );
}

/** Detail the profile carries but the sales pages should not — parked here,
 *  where an interested customer can still find it. */
function Footer() {
  const base = HYGIENE.basePath;
  const COLUMNS: [string, [string, string][]][] = [
    [
      "Cleaning",
      [
        [`${base}/services?for=home`, "Home cleaning"],
        [`${base}/services?for=office`, "Office cleaning"],
        [`${base}/services?for=schools`, "Schools & institutions"],
        [`${base}/services?for=healthcare`, "Healthcare facilities"],
        [`${base}/services?for=industrial`, "Industrial & warehouse"],
        [`${base}/services?for=hospitality`, "Hotels & restaurants"],
      ],
    ],
    [
      "Hygiene services",
      [
        [`${base}/services?for=washrooms`, "Washrooms & sanitary bins"],
        [`${base}/services?for=washrooms`, "Waste & pest control"],
        [`${base}/services?for=washrooms`, "Laundry & linen"],
        [`${base}/supply`, "Sanitary pad supply"],
        [`${base}/supply/enquiry`, "Request a supply quote"],
      ],
    ],
    [
      "Company",
      [
        [`${base}/about`, "About Dyzah Hygiene"],
        [`${base}/about#story`, "Our story"],
        [`${base}/about#values`, "Vision, mission & values"],
        [`${base}/about#impact`, "Community impact"],
        [`${base}/survey`, "Book a free site survey"],
        [`${base}/track`, "Track a booking"],
      ],
    ],
  ];

  return (
    <footer className="mt-10 bg-hygiene-navy text-white">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <HygieneLogo onDark showTagline className="items-start text-[14px]" />
            <p className="mt-4 text-sm text-white/60">{HYGIENE.serving}.</p>
            {hasContactDetails() && (
              <ul className="mt-4 space-y-1.5 text-sm text-white/75">
                {HYGIENE_CONTACT.phone && (
                  <li>
                    <a href={`tel:${HYGIENE_CONTACT.phone}`} className="hover:text-white">
                      {HYGIENE_CONTACT.phone}
                    </a>
                  </li>
                )}
                {HYGIENE_CONTACT.email && (
                  <li>
                    <a href={`mailto:${HYGIENE_CONTACT.email}`} className="hover:text-white">
                      {HYGIENE_CONTACT.email}
                    </a>
                  </li>
                )}
                {HYGIENE_CONTACT.address && <li className="text-white/60">{HYGIENE_CONTACT.address}</li>}
              </ul>
            )}
          </div>

          {COLUMNS.map(([title, links]) => (
            <div key={title}>
              <p className="text-sm font-semibold">{title}</p>
              <ul className="mt-3 space-y-2 text-sm text-white/65">
                {links.map(([href, label]) => (
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

        <div className="mt-8 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-white/45 sm:flex-row sm:justify-between">
          <span>
            © {new Date().getFullYear()} {HYGIENE.name}. {HYGIENE.strapline}
          </span>
          <span>Trained, vetted crews · M-Pesa payments · Photo proof on every visit</span>
        </div>
      </div>
    </footer>
  );
}
