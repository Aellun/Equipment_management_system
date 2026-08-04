"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "./Icon";
import { useServicesAuth } from "./ServicesAuthProvider";

export interface ShellConfig {
  /** e.g. "Services" */
  label: string;
  /** e.g. "/services" */
  basePath: string;
  tagline: string;
}

const SWITCHER = [
  { href: "/home", label: "Dyzah Home" },
  { href: "/store", label: "Store" },
  { href: "/hygiene", label: "Hygiene" },
  { href: "/events", label: "Events" },
];

export default function ServicesShell({ config, children }: { config: ShellConfig; children: React.ReactNode }) {
  const { user, logout } = useServicesAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [q, setQ] = useState("");

  const dash = user?.role === "admin" ? "/admin" : user?.role === "runner" ? `${config.basePath}/runner` : `${config.basePath}/account`;

  const nav = [
    [`${config.basePath}/browse`, "All services"],
    [`${config.basePath}/track`, "Track"],
  ] as const;

  const doLogout = () => {
    logout();
    setMenuOpen(false);
    router.push(config.basePath);
  };

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`${config.basePath}/browse${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <header className="sticky top-0 z-30 bg-white shadow-sm">
        {/* Cross-business switcher */}
        <div className="border-b border-line bg-white">
          <div className="mx-auto flex max-w-6xl items-center gap-1 px-3 py-1 text-xs text-muted">
            {SWITCHER.map((s) => (
              <Link key={s.href} href={s.href} className="rounded px-2 py-1 hover:bg-brand-50 hover:text-brand-600 hover:no-underline">
                {s.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Primary light bar (Alibaba style) */}
        <div className="border-b border-line">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-3 sm:gap-5">
            <button className="grid h-10 w-10 shrink-0 place-items-center rounded text-ink hover:bg-brand-50 md:hidden" onClick={() => setMenuOpen((v) => !v)} aria-label="Menu">
              <Icon name={menuOpen ? "x" : "menu"} className="h-6 w-6" />
            </button>

            <Link href={config.basePath} className="flex shrink-0 items-center gap-2 hover:no-underline">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-500 font-extrabold text-white">D</span>
              <span className="hidden text-lg font-extrabold tracking-tight text-ink sm:inline">
                Dyzah <span className="text-brand-500">{config.label}</span>
              </span>
            </Link>

            {/* Alibaba-style search with rounded orange button */}
            <form onSubmit={search} className="hidden flex-1 items-center overflow-hidden rounded-full border-2 border-brand-500 bg-white md:flex">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search services…"
                className="min-w-0 flex-1 px-4 py-2 text-sm text-ink outline-none"
              />
              <button type="submit" className="flex items-center gap-1 bg-brand-500 px-6 py-2 text-sm font-semibold text-white hover:bg-brand-600">
                <Icon name="search" className="h-4 w-4" /> Search
              </button>
            </form>

            <div className="ml-auto flex items-center gap-2">
              {user ? (
                <>
                  <Link href={dash} className="rounded px-2 py-1.5 text-sm text-ink hover:bg-brand-50 hover:no-underline">
                    <span className="block text-[11px] leading-none text-muted">Hi, {user.full_name.split(" ")[0]}</span>
                    <span className="font-semibold">My dashboard</span>
                  </Link>
                  <button onClick={doLogout} className="hidden rounded px-3 py-2 text-sm text-ink hover:bg-brand-50 sm:inline-flex">
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link href={`${config.basePath}/login`} className="rounded px-3 py-1.5 text-sm text-ink hover:bg-brand-50 hover:no-underline">
                    <span className="block text-[11px] leading-none text-muted">Hello, sign in</span>
                    <span className="font-semibold">Account</span>
                  </Link>
                  <Link href={`${config.basePath}/browse`} className="hidden rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 hover:no-underline sm:inline-flex">
                    Book now
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Secondary nav */}
        <div className="border-b border-line bg-white">
          <nav className="mx-auto hidden max-w-6xl items-center gap-1 px-3 py-1.5 text-sm md:flex">
            {nav.map(([to, label]) => (
              <Link key={to} href={to} className={`rounded px-3 py-1.5 font-medium hover:bg-brand-50 hover:no-underline ${pathname === to ? "text-brand-600" : "text-ink"}`}>
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="border-b border-line bg-white shadow-sm md:hidden">
            <form onSubmit={search} className="m-3 flex items-center overflow-hidden rounded-full border-2 border-brand-500">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search services…" className="min-w-0 flex-1 px-4 py-2 text-sm outline-none" />
              <button type="submit" className="bg-brand-500 px-5 py-2 text-sm font-semibold text-white">Go</button>
            </form>
            <nav className="mx-auto flex max-w-6xl flex-col px-2 pb-2">
              {nav.map(([to, label]) => (
                <Link key={to} href={to} onClick={() => setMenuOpen(false)} className="rounded px-3 py-2.5 text-sm font-medium text-ink hover:bg-brand-50 hover:no-underline">
                  {label}
                </Link>
              ))}
              {user && (
                <Link href={dash} onClick={() => setMenuOpen(false)} className="rounded px-3 py-2.5 text-sm font-medium text-ink hover:bg-brand-50 hover:no-underline">
                  My dashboard
                </Link>
              )}
              <div className="my-1 border-t border-line" />
              {user ? (
                <button onClick={doLogout} className="flex items-center gap-2 rounded px-3 py-2.5 text-left text-sm font-medium text-ink hover:bg-brand-50">
                  <Icon name="log-out" className="h-4 w-4 text-muted" /> Log out
                </button>
              ) : (
                <>
                  <Link href={`${config.basePath}/login`} onClick={() => setMenuOpen(false)} className="rounded px-3 py-2.5 text-sm font-medium text-ink hover:bg-brand-50 hover:no-underline">Sign in</Link>
                  <Link href={`${config.basePath}/register`} onClick={() => setMenuOpen(false)} className="rounded px-3 py-2.5 text-sm font-medium text-ink hover:bg-brand-50 hover:no-underline">Create account</Link>
                </>
              )}
            </nav>
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">{children}</main>

      <footer className="mt-8 border-t border-line bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row">
            <div>
              <p className="font-semibold text-ink">Dyzah {config.label}</p>
              <p>{config.tagline}</p>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {([
                ["badge-check", "Verified crew"],
                ["shield-check", "M-Pesa payments"],
                ["camera", "Photo proof"],
                ["message-circle", "Updates"],
              ] as const).map(([icon, label]) => (
                <span key={label} className="flex items-center gap-1.5">
                  <Icon name={icon} className="h-4 w-4 text-brand-500" />
                  {label}
                </span>
              ))}
            </div>
          </div>
          <p className="mt-6 text-xs text-muted">© {new Date().getFullYear()} Dyzah. One umbrella, four businesses.</p>
        </div>
      </footer>
    </div>
  );
}
