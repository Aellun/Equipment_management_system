"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Department, ShopCategory } from "@/types";
import { useStore } from "./StoreProvider";

export default function StoreHeader({
  storeName = "Ahadi Store",
  departments = [],
  categories = [],
}: {
  storeName?: string;
  departments?: Department[];
  categories?: ShopCategory[];
}) {
  const { cartCount } = useStore();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [searchDept, setSearchDept] = useState("");
  const [catsOpen, setCatsOpen] = useState(false);
  const catsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (catsRef.current && !catsRef.current.contains(e.target as Node)) setCatsOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (searchDept) params.set("dept", searchDept);
    router.push(`/store/browse${params.toString() ? `?${params}` : ""}`);
  }

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 shadow-sm">
      {/* Cross-business switcher */}
      <div className="bg-slate-950 text-slate-400 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 h-7 flex items-center gap-1 text-[11px] sm:text-xs">
          {[
            { href: "/home", label: "Dyzah Home" },
            { href: "/store", label: "Store" },
            { href: "/services", label: "Services" },
          ].map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="rounded px-2 py-0.5 hover:bg-slate-800 hover:text-white transition-colors"
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Utility bar */}
      <div className="bg-slate-900 dark:bg-slate-950 text-slate-300">
        <div className="max-w-7xl mx-auto px-4 h-8 flex items-center justify-between text-[11px] sm:text-xs">
          <p className="flex items-center gap-1.5">
            <svg className="w-3 h-3 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Delivering countrywide · Kenya
          </p>
          <nav className="flex items-center gap-4">
            <Link href="/store/track" className="hover:text-white transition-colors">Track Order</Link>
            <Link href="/store/reviews" className="hidden sm:inline hover:text-white transition-colors">Reviews</Link>
            <span className="hidden sm:inline-flex items-center gap-1 text-emerald-400 font-medium">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              Pay on Delivery
            </span>
          </nav>
        </div>
      </div>

      {/* Main row: logo + search + cart */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3 sm:gap-6">
          <Link href="/store" className="flex items-center gap-2.5 shrink-0">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-sm">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div className="leading-tight hidden sm:block">
              <p className="font-extrabold text-slate-900 dark:text-white text-lg tracking-tight">{storeName}</p>
              <p className="text-[10px] text-slate-400 -mt-0.5 hidden sm:block">Everything you need, delivered</p>
            </div>
          </Link>

          {/* Search (desktop) */}
          <form onSubmit={submitSearch} className="hidden md:flex flex-1 max-w-2xl mx-auto">
            <div className="flex w-full rounded-full border-2 border-orange-500 overflow-hidden bg-white dark:bg-slate-800 focus-within:shadow-md transition-shadow">
              <select
                value={searchDept}
                onChange={(e) => setSearchDept(e.target.value)}
                className="hidden lg:block pl-4 pr-2 text-xs font-medium text-slate-500 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="">All</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.slug}>{d.name}</option>
                ))}
              </select>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products, brands and categories…"
                className="flex-1 px-4 py-2.5 text-sm bg-transparent text-slate-900 dark:text-white focus:outline-none"
              />
              <button type="submit" className="px-6 bg-orange-500 hover:bg-orange-600 text-white transition-colors flex items-center gap-2 text-sm font-semibold">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                Search
              </button>
            </div>
          </form>

          <div className="flex items-center gap-1 sm:gap-2 ml-auto md:ml-0">
            <Link href="/store/track" className="hidden sm:flex flex-col items-center px-3 py-1 text-slate-600 dark:text-slate-300 hover:text-orange-600 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8h4l3 3v5a1 1 0 01-1 1h-1" /></svg>
              <span className="text-[10px] font-medium mt-0.5">Track</span>
            </Link>
            <Link href="/store/cart" className="relative flex flex-col items-center px-3 py-1 text-slate-600 dark:text-slate-300 hover:text-orange-600 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              <span className="text-[10px] font-medium mt-0.5">Cart</span>
              {cartCount > 0 && (
                <span className="absolute -top-1 right-1 bg-orange-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Search (mobile) */}
        <form onSubmit={submitSearch} className="md:hidden px-4 pb-3">
          <div className="flex w-full rounded-full border-2 border-orange-500 overflow-hidden bg-white dark:bg-slate-800">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products…"
              className="flex-1 px-4 py-2 text-sm bg-transparent text-slate-900 dark:text-white focus:outline-none"
            />
            <button type="submit" aria-label="Search" className="px-4 bg-orange-500 text-white">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </button>
          </div>
        </form>
      </div>

      {/* Category nav row */}
      <div className="hidden md:block bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 h-10 flex items-center gap-1 text-sm">
          <div ref={catsRef} className="relative">
            <button
              onClick={() => setCatsOpen((o) => !o)}
              className="flex items-center gap-2 px-3 h-10 font-semibold text-slate-800 dark:text-white hover:text-orange-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              All Categories
              <svg className={`w-3 h-3 transition-transform ${catsOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {catsOpen && (
              <div className="absolute left-0 top-full mt-px w-[560px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-b-xl shadow-xl p-5 grid grid-cols-2 gap-6 animate-fadeIn">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Departments</p>
                  <div className="space-y-0.5">
                    {departments.map((d) => (
                      <Link
                        key={d.id}
                        href={`/store/browse?dept=${d.slug}`}
                        onClick={() => setCatsOpen(false)}
                        className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-orange-50 dark:hover:bg-slate-800 hover:text-orange-600 transition-colors"
                      >
                        {d.icon && <span className="text-base">{d.icon}</span>}
                        <span className="font-medium">{d.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Categories</p>
                  <div className="grid grid-cols-1 gap-0.5 max-h-72 overflow-y-auto pr-1">
                    {categories.map((c) => (
                      <Link
                        key={c.id}
                        href={`/store/browse?cat=${c.slug}`}
                        onClick={() => setCatsOpen(false)}
                        className="px-2 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-orange-50 dark:hover:bg-slate-800 hover:text-orange-600 transition-colors text-[13px]"
                      >
                        {c.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <span className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
          <Link href="/store/browse" className="px-3 text-slate-600 dark:text-slate-300 hover:text-orange-600 font-medium transition-colors">All Products</Link>
          <Link href="/store/browse?sort=new" className="px-3 text-slate-600 dark:text-slate-300 hover:text-orange-600 font-medium transition-colors">New Arrivals</Link>
          <Link href="/store/browse?sort=rating" className="px-3 text-slate-600 dark:text-slate-300 hover:text-orange-600 font-medium transition-colors">Top Rated</Link>
          <Link href="/store/reviews" className="px-3 text-slate-600 dark:text-slate-300 hover:text-orange-600 font-medium transition-colors">Store Reviews</Link>
          <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            Genuine guarantee on every order
          </span>
        </div>
      </div>

      {/* Department chips (mobile) */}
      <div className="md:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex gap-2 px-4 py-2 overflow-x-auto scrollbar-none">
          <Link href="/store/browse" className="shrink-0 px-3 py-1 rounded-full bg-orange-50 dark:bg-slate-800 text-orange-700 dark:text-orange-400 text-xs font-semibold border border-orange-200 dark:border-slate-700">
            All
          </Link>
          {departments.map((d) => (
            <Link
              key={d.id}
              href={`/store/browse?dept=${d.slug}`}
              className="shrink-0 px-3 py-1 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700"
            >
              {d.icon ? `${d.icon} ` : ""}{d.name}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
