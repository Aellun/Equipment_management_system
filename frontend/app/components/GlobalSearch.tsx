"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Equipment, Client, Product } from "@/types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "/api";

type ResultItem = {
  group: string;
  title: string;
  subtitle?: string;
  badge?: string;
  href: string;
};

const PAGES: ResultItem[] = [
  { group: "Pages", title: "Dashboard", href: "/" },
  { group: "Pages", title: "Equipment", href: "/equipment" },
  { group: "Pages", title: "Maintenance", subtitle: "Work logs & repairs", href: "/maintenance" },
  { group: "Pages", title: "Reservations", subtitle: "Forward bookings", href: "/reservations" },
  { group: "Pages", title: "Categories", href: "/categories" },
  { group: "Pages", title: "Clients", href: "/clients" },
  { group: "Pages", title: "Transactions", subtitle: "Check-out / check-in", href: "/transactions" },
  { group: "Pages", title: "Users", href: "/users" },
  { group: "Pages", title: "Audit Log", href: "/audit" },
  { group: "Pages", title: "Shop · Products", href: "/shop/products" },
  { group: "Pages", title: "Shop · Orders", href: "/shop/orders" },
  { group: "Pages", title: "Shop · Returns", href: "/shop/returns" },
  { group: "Pages", title: "Shop · Reviews", href: "/shop/reviews" },
  { group: "Pages", title: "Shop · Delivery Zones", href: "/shop/delivery" },
];

const statusBadge: Record<string, string> = {
  Available: "bg-emerald-100 text-emerald-700",
  Out: "bg-amber-100 text-amber-700",
  Maintenance: "bg-red-100 text-red-700",
};

export default function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    if (loaded) return;
    try {
      const [eqRes, clRes, prRes] = await Promise.all([
        fetch(`${API}/equipment/`),
        fetch(`${API}/clients/`),
        fetch(`${API}/products/`),
      ]);
      if (eqRes.ok) setEquipment(await eqRes.json());
      if (clRes.ok) setClients(await clRes.json());
      if (prRes.ok) setProducts(await prRes.json());
      setLoaded(true);
    } catch {
      /* search still works over pages */
    }
  }, [loaded]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    function onOpenEvent() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-global-search", onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-global-search", onOpenEvent);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      loadData();
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open, loadData]);

  const results = useMemo<ResultItem[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PAGES.slice(0, 8);

    const match = (s: string | null | undefined) => (s ?? "").toLowerCase().includes(q);
    const out: ResultItem[] = [];

    for (const e of equipment) {
      if (match(e.name) || match(e.serial_number) || match(e.category)) {
        out.push({
          group: "Equipment",
          title: e.name,
          subtitle: `${e.serial_number} · ${e.category}`,
          badge: e.status,
          href: `/equipment/${e.id}`,
        });
      }
      if (out.length > 25) break;
    }
    for (const c of clients) {
      if (match(c.name) || match(c.email) || match(c.phone)) {
        out.push({ group: "Clients", title: c.name, subtitle: c.email, href: "/clients" });
      }
      if (out.length > 35) break;
    }
    for (const p of products) {
      if (match(p.name) || match(p.brand)) {
        out.push({
          group: "Store Products",
          title: p.name,
          subtitle: p.brand ?? undefined,
          badge: p.is_active ? undefined : "Inactive",
          href: "/shop/products",
        });
      }
      if (out.length > 45) break;
    }
    out.push(...PAGES.filter((p) => match(p.title)));
    return out.slice(0, 12);
  }, [query, equipment, clients, products]);

  useEffect(() => setSelected(0), [results.length, query]);

  function go(item: ResultItem) {
    setOpen(false);
    router.push(item.href);
  }

  if (!open) return null;

  let lastGroup = "";

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh] px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-fadeIn">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 border-b border-slate-100">
          <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setSelected((s) => Math.min(s + 1, results.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
              if (e.key === "Enter" && results[selected]) go(results[selected]);
            }}
            placeholder="Search equipment, clients, products, pages…"
            className="flex-1 py-3.5 text-sm bg-transparent text-slate-900 focus:outline-none"
          />
          <kbd className="hidden sm:block text-[10px] font-semibold text-slate-400 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto py-2">
          {results.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-10">No matches for “{query}”</p>
          ) : (
            results.map((r, i) => {
              const header = r.group !== lastGroup ? r.group : null;
              lastGroup = r.group;
              return (
                <div key={`${r.group}-${r.title}-${i}`}>
                  {header && (
                    <p className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{header}</p>
                  )}
                  <button
                    onClick={() => go(r)}
                    onMouseEnter={() => setSelected(i)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${i === selected ? "bg-brand-50" : ""}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${i === selected ? "text-brand-700" : "text-slate-700"}`}>
                        {r.title}
                      </p>
                      {r.subtitle && <p className="text-xs text-slate-400 truncate">{r.subtitle}</p>}
                    </div>
                    {r.badge && (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${statusBadge[r.badge] ?? "bg-slate-100 text-slate-500"}`}>
                        {r.badge}
                      </span>
                    )}
                    <svg className={`w-3.5 h-3.5 shrink-0 ${i === selected ? "text-brand-400" : "text-slate-300"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="px-4 py-2 border-t border-slate-100 flex items-center gap-3 text-[10px] text-slate-400">
          <span><kbd className="font-semibold">↑↓</kbd> navigate</span>
          <span><kbd className="font-semibold">↵</kbd> open</span>
          <span className="ml-auto">Ctrl+K to toggle</span>
        </div>
      </div>
    </div>
  );
}
