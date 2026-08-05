"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "./Icon";
import { useServicesAuth } from "./ServicesAuthProvider";
import ErrandsLogo from "./ErrandsLogo";

export interface ShellConfig {
  /** e.g. "Errands" */
  label: string;
  /** e.g. "/services" */
  basePath: string;
  tagline: string;
}

const SWITCHER = [
  { href: "/home", label: "Dyzah" },
  { href: "/store", label: "Store" },
  { href: "/hygiene", label: "Hygiene" },
];

/** Category rail — how customers actually pick an errand, by what they need.
 *  Each links to the browse page pre-filtered by a search term. */
const CATEGORIES: [string, string][] = [
  ["/services/browse?q=grocery", "Groceries & shopping"],
  ["/services/browse?q=delivery", "Parcels & delivery"],
  ["/services/browse?q=pharmacy", "Pharmacy runs"],
  ["/services/browse?q=government", "Government & banking"],
  ["/services/browse?q=document", "Documents & courier"],
  ["/services/browse?q=diaspora", "Diaspora support"],
  ["/services/browse", "All services"],
];

export default function ServicesShell({ config, children }: { config: ShellConfig; children: React.ReactNode }) {
  const { user, logout } = useServicesAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [q, setQ] = useState("");

  const base = config.basePath;
  const dash =
    user?.role === "admin" ? "/admin" : user?.role === "runner" ? `${base}/runner` : `${base}/account`;

  const doLogout = () => {
    logout();
    setMenuOpen(false);
    router.push(base);
  };

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`${base}/browse${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <header className="sticky top-0 z-30">
        {/* Utility strip */}
        <div className="bg-squid text-[12px] text-white/65">
          <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-1.5">
            {SWITCHER.map((s) => (
              <Link key={s.href} href={s.href} className="hover:text-white hover:no-underline">
                {s.label}
              </Link>
            ))}
            <span className="ml-auto hidden items-center gap-4 sm:flex">
              <Link href={`${base}/track`} className="hover:text-white hover:no-underline">
                Track an errand
              </Link>
              <Link href={`${base}/runner`} className="hover:text-white hover:no-underline">
                Become a runner
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

            <Link href={base} className="shrink-0 hover:no-underline" aria-label={`Dyzah ${config.label}`}>
              <ErrandsLogo className="text-[14px]" />
            </Link>

            <form onSubmit={search} className="hidden min-w-0 flex-1 items-center md:flex">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search errands & services"
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
                href={`${base}/browse`}
                className="rounded bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 hover:no-underline"
              >
                Book a runner
              </Link>
            </div>
          </div>
        </div>

        {/* Category rail */}
        <div className="border-b border-line bg-white shadow-sm">
          <nav className="scrollbar-none mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 text-sm">
            {CATEGORIES.map(([href, label]) => {
              const active = pathname === href.split("?")[0] && href.endsWith("browse");
              return (
                <Link
                  key={label}
                  href={href}
                  className={`relative whitespace-nowrap border-b-2 px-3 py-2.5 transition-colors hover:no-underline ${
                    active
                      ? "border-brand-500 font-semibold text-brand-700"
                      : "border-transparent text-slate-600 hover:border-brand-300 hover:text-brand-700"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="border-b border-line bg-white shadow-md lg:hidden">
            <form onSubmit={search} className="flex items-center p-3">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search errands & services"
                className="h-10 min-w-0 flex-1 rounded-l border border-r-0 border-slate-300 px-3 text-sm outline-none"
              />
              <button type="submit" className="grid h-10 w-12 place-items-center rounded-r bg-brand-500 text-white">
                <Icon name="search" className="h-4 w-4" />
              </button>
            </form>
            <nav className="flex flex-col pb-2">
              {[...CATEGORIES, [`${base}/track`, "Track an errand"], [`${base}/runner`, "Become a runner"]].map(
                ([href, label]) => (
                  <Link
                    key={label}
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

      <Footer base={base} label={config.label} tagline={config.tagline} />
    </div>
  );
}

function Footer({ base, label, tagline }: { base: string; label: string; tagline: string }) {
  const COLUMNS: [string, [string, string][]][] = [
    [
      "Popular errands",
      [
        [`${base}/browse?q=grocery`, "Groceries & shopping"],
        [`${base}/browse?q=delivery`, "Parcels & delivery"],
        [`${base}/browse?q=pharmacy`, "Pharmacy runs"],
        [`${base}/browse?q=government`, "Government & banking"],
      ],
    ],
    [
      "For diaspora",
      [
        [`${base}/browse?q=diaspora`, "Property & family checks"],
        [`${base}/browse?q=document`, "Document pickup & courier"],
        [`${base}/browse?q=bill`, "Bill payments"],
        [`${base}/track`, "Track an errand"],
      ],
    ],
    [
      "Company",
      [
        [`${base}/browse`, "All services"],
        [`${base}/runner`, "Become a runner"],
        [`${base}/login`, "Sign in"],
        ["/home", "Dyzah family"],
      ],
    ],
  ];

  return (
    <footer className="mt-10 bg-squid text-white">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <ErrandsLogo onDark showTagline className="items-start text-[14px]" />
            <p className="mt-4 text-sm text-white/60">{tagline}</p>
          </div>

          {COLUMNS.map(([title, links]) => (
            <div key={title}>
              <p className="text-sm font-semibold">{title}</p>
              <ul className="mt-3 space-y-2 text-sm text-white/65">
                {links.map(([href, text]) => (
                  <li key={text}>
                    <Link href={href} className="hover:text-white hover:no-underline">
                      {text}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-white/45 sm:flex-row sm:justify-between">
          <span>
            © {new Date().getFullYear()} Dyzah {label}. {tagline}
          </span>
          <span>Verified runners · Direct M-Pesa payment · Photo proof on every job</span>
        </div>
      </div>
    </footer>
  );
}
