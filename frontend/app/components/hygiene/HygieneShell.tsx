"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/app/components/services/Icon";
import { useServicesAuth } from "@/app/components/services/ServicesAuthProvider";
import HygieneLogo from "./HygieneLogo";
import { HYGIENE, HYGIENE_CONTACT, hasContactDetails } from "./brand";

/** Sibling Dyzah businesses, for the thin switcher strip. */
const SWITCHER = [
  { href: "/home", label: "Dyzah Home" },
  { href: "/store", label: "Store" },
  { href: "/services", label: "Errands" },
];

const NAV: [string, string][] = [
  [`${HYGIENE.basePath}/services`, "Cleaning services"],
  [`${HYGIENE.basePath}/supply`, "Hygiene products"],
  [`${HYGIENE.basePath}/about`, "About us"],
  [`${HYGIENE.basePath}/track`, "Track a booking"],
];

export default function HygieneShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useServicesAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const base = HYGIENE.basePath;
  const dash =
    user?.role === "admin" ? "/admin" : user?.role === "runner" ? `${base}/runner` : `${base}/dashboard`;

  const doLogout = () => {
    logout();
    setMenuOpen(false);
    router.push(base);
  };

  return (
    // `theme-hygiene` swaps the brand CSS variables to the client's navy +
    // green, which re-themes every shared services component rendered inside.
    <div className="theme-hygiene flex min-h-screen flex-col bg-canvas text-ink">
      <header className="sticky top-0 z-30 shadow-sm">
        {/* Cross-business switcher */}
        <div className="bg-hygiene-navy text-white/70">
          <div className="mx-auto flex max-w-6xl items-center gap-1 px-3 py-1 text-xs">
            {SWITCHER.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="rounded px-2 py-1 hover:bg-white/10 hover:text-white hover:no-underline"
              >
                {s.label}
              </Link>
            ))}
            <span className="ml-auto hidden sm:inline">{HYGIENE.tagline}</span>
          </div>
        </div>

        {/* Primary bar */}
        <div className="border-b border-line bg-white">
          <div className="mx-auto flex max-w-6xl items-center gap-4 px-3 py-3">
            <button
              className="grid h-10 w-10 shrink-0 place-items-center rounded text-ink hover:bg-brand-50 md:hidden"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Menu"
            >
              <Icon name={menuOpen ? "x" : "menu"} className="h-6 w-6" />
            </button>

            <Link href={base} className="shrink-0 hover:no-underline" aria-label={HYGIENE.name}>
              <HygieneLogo className="text-[15px]" />
            </Link>

            <nav className="ml-6 hidden items-center gap-1 text-sm md:flex">
              {NAV.map(([to, label]) => (
                <Link
                  key={to}
                  href={to}
                  className={`rounded px-3 py-2 font-medium hover:bg-brand-50 hover:no-underline ${
                    pathname === to ? "text-brand-600" : "text-ink"
                  }`}
                >
                  {label}
                </Link>
              ))}
            </nav>

            <div className="ml-auto flex items-center gap-2">
              {user ? (
                <>
                  <Link href={dash} className="rounded px-2 py-1.5 text-sm text-ink hover:bg-brand-50 hover:no-underline">
                    <span className="block text-[11px] leading-none text-muted">
                      Hi, {user.full_name.split(" ")[0]}
                    </span>
                    <span className="font-semibold">My bookings</span>
                  </Link>
                  <button
                    onClick={doLogout}
                    className="hidden rounded px-3 py-2 text-sm text-ink hover:bg-brand-50 sm:inline-flex"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <Link
                  href={`${base}/login`}
                  className="rounded px-3 py-1.5 text-sm text-ink hover:bg-brand-50 hover:no-underline"
                >
                  <span className="block text-[11px] leading-none text-muted">Hello, sign in</span>
                  <span className="font-semibold">Account</span>
                </Link>
              )}
              <Link
                href={`${base}/services`}
                className="hidden rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 hover:no-underline sm:inline-flex"
              >
                Book a clean
              </Link>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="border-b border-line bg-white shadow-sm md:hidden">
            <nav className="mx-auto flex max-w-6xl flex-col px-2 py-2">
              {NAV.map(([to, label]) => (
                <Link
                  key={to}
                  href={to}
                  onClick={() => setMenuOpen(false)}
                  className="rounded px-3 py-2.5 text-sm font-medium text-ink hover:bg-brand-50 hover:no-underline"
                >
                  {label}
                </Link>
              ))}
              {user && (
                <Link
                  href={dash}
                  onClick={() => setMenuOpen(false)}
                  className="rounded px-3 py-2.5 text-sm font-medium text-ink hover:bg-brand-50 hover:no-underline"
                >
                  My bookings
                </Link>
              )}
              <div className="my-1 border-t border-line" />
              {user ? (
                <button
                  onClick={doLogout}
                  className="flex items-center gap-2 rounded px-3 py-2.5 text-left text-sm font-medium text-ink hover:bg-brand-50"
                >
                  <Icon name="log-out" className="h-4 w-4 text-muted" /> Log out
                </button>
              ) : (
                <>
                  <Link
                    href={`${base}/login`}
                    onClick={() => setMenuOpen(false)}
                    className="rounded px-3 py-2.5 text-sm font-medium text-ink hover:bg-brand-50 hover:no-underline"
                  >
                    Sign in
                  </Link>
                  <Link
                    href={`${base}/register`}
                    onClick={() => setMenuOpen(false)}
                    className="rounded px-3 py-2.5 text-sm font-medium text-ink hover:bg-brand-50 hover:no-underline"
                  >
                    Create account
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">{children}</main>

      <footer className="mt-8 bg-hygiene-navy text-white">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <HygieneLogo onDark showTagline className="items-start text-[15px]" />
              <p className="mt-4 max-w-xs text-sm text-white/70">{HYGIENE.serving}.</p>
            </div>

            <div>
              <p className="text-sm font-semibold">What we do</p>
              <ul className="mt-3 space-y-2 text-sm text-white/70">
                {NAV.slice(0, 3).map(([to, label]) => (
                  <li key={to}>
                    <Link href={to} className="hover:text-white hover:no-underline">
                      {label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href={`${HYGIENE.basePath}/supply/enquiry`} className="hover:text-white hover:no-underline">
                    Request a supply quote
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-sm font-semibold">Get in touch</p>
              {hasContactDetails() ? (
                <ul className="mt-3 space-y-2 text-sm text-white/70">
                  {HYGIENE_CONTACT.phone && (
                    <li className="flex items-center gap-2">
                      <Icon name="phone" className="h-4 w-4 text-hygiene-green" />
                      <a href={`tel:${HYGIENE_CONTACT.phone}`} className="hover:text-white">
                        {HYGIENE_CONTACT.phone}
                      </a>
                    </li>
                  )}
                  {HYGIENE_CONTACT.email && (
                    <li className="flex items-center gap-2">
                      <Icon name="message-circle" className="h-4 w-4 text-hygiene-green" />
                      <a href={`mailto:${HYGIENE_CONTACT.email}`} className="hover:text-white">
                        {HYGIENE_CONTACT.email}
                      </a>
                    </li>
                  )}
                  {HYGIENE_CONTACT.address && (
                    <li className="flex items-start gap-2">
                      <Icon name="map-pin" className="mt-0.5 h-4 w-4 shrink-0 text-hygiene-green" />
                      {HYGIENE_CONTACT.address}
                    </li>
                  )}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-white/70">
                  Send us your requirement through the{" "}
                  <Link href={`${HYGIENE.basePath}/supply/enquiry`} className="font-medium text-hygiene-green hover:text-white">
                    enquiry form
                  </Link>{" "}
                  and our team will get back to you.
                </p>
              )}
            </div>
          </div>

          <p className="mt-8 border-t border-white/10 pt-6 text-xs text-white/50">
            © {new Date().getFullYear()} {HYGIENE.name}. {HYGIENE.strapline}
          </p>
        </div>
      </footer>
    </div>
  );
}
