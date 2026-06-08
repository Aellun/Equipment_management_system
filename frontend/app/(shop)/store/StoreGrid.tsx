"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Product, ShopCategory, Department } from "@/types";
import { Stars } from "./Stars";

const API = process.env.NEXT_PUBLIC_API_URL ?? "/api";

function imgSrc(url: string) {
  return url.startsWith("/uploads") ? `${API}${url}` : url;
}

function priceLabel(p: Product) {
  const prices = p.variants.filter((v) => v.is_active).map((v) => Number(v.price));
  if (!prices.length) return `KSh ${Number(p.base_price).toLocaleString()}`;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? `KSh ${min.toLocaleString()}` : `KSh ${min.toLocaleString()} – ${max.toLocaleString()}`;
}

function totalStock(p: Product) {
  return p.variants.reduce((s, v) => s + v.stock_qty, 0);
}

export default function StoreGrid({
  products, categories, departments = [],
}: { products: Product[]; categories: ShopCategory[]; departments?: Department[] }) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<number | "all">("all");
  const [dept, setDept] = useState<number | "all">("all");

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchDept = dept === "all" || p.department_id === dept;
      const matchCat = cat === "all" || p.shop_category_id === cat;
      const matchQ = !query || p.name.toLowerCase().includes(query.toLowerCase());
      return matchDept && matchCat && matchQ;
    });
  }, [products, query, cat, dept]);

  return (
    <div className="space-y-6">
      {/* Department filter (only when more than one department exists) */}
      {departments.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setDept("all")} className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors ${dept === "all" ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900" : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"}`}>
            All Departments
          </button>
          {departments.map((d) => (
            <button key={d.id} onClick={() => setDept(d.id)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors ${dept === d.id ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900" : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"}`}>
              {d.icon && <span>{d.icon}</span>}{d.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setCat("all")} className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${cat === "all" ? "bg-indigo-600 text-white" : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-indigo-300"}`}>
            All
          </button>
          {categories.map((c) => (
            <button key={c.id} onClick={() => setCat(c.id)} className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${cat === c.id ? "bg-indigo-600 text-white" : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-indigo-300"}`}>
              {c.name}
            </button>
          ))}
        </div>
        <div className="relative sm:w-64">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products…" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="font-semibold text-slate-700 dark:text-slate-300">No products found</p>
          <p className="text-sm text-slate-400 mt-1">Try a different search or category</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((p) => {
            const stock = totalStock(p);
            return (
              <Link key={p.id} href={`/store/product/${p.slug}`} className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-700 transition-all">
                <div className="aspect-square bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center">
                  {p.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imgSrc(p.images[0].url)} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-medium text-slate-900 dark:text-white text-sm line-clamp-1">{p.name}</p>
                  {p.review_count > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <Stars value={p.avg_rating ?? 0} size={12} />
                      <span className="text-[11px] text-slate-400">({p.review_count})</span>
                    </div>
                  )}
                  <p className="text-indigo-600 dark:text-indigo-400 font-bold text-sm mt-1">{priceLabel(p)}</p>
                  <div className="flex items-center justify-between mt-1">
                    {stock === 0 ? (
                      <p className="text-[11px] text-red-500 font-medium">Out of stock</p>
                    ) : stock <= 5 ? (
                      <p className="text-[11px] text-amber-600 font-medium">Only {stock} left</p>
                    ) : (
                      <p className="text-[11px] text-emerald-600 font-medium">In stock</p>
                    )}
                    {p.is_genuine_guaranteed && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400" title="Genuine Guarantee">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                        Genuine
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
