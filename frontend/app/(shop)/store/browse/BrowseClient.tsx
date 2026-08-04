"use client";

import { useState, useMemo } from "react";
import { Product, ShopCategory, Department } from "@/types";
import ProductCard from "../ProductCard";
import { minPrice, totalStock } from "../lib";

type SortKey = "featured" | "new" | "rating" | "price-asc" | "price-desc";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "featured", label: "Featured" },
  { key: "new", label: "Newest" },
  { key: "rating", label: "Top rated" },
  { key: "price-asc", label: "Price: low to high" },
  { key: "price-desc", label: "Price: high to low" },
];

export default function BrowseClient({
  products, categories, departments,
  initialQuery, initialDept, initialCat, initialSort,
}: {
  products: Product[];
  categories: ShopCategory[];
  departments: Department[];
  initialQuery: string;
  initialDept: string;
  initialCat: string;
  initialSort: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [dept, setDept] = useState(initialDept);
  const [cat, setCat] = useState(initialCat);
  const [sort, setSort] = useState<SortKey>(
    (SORTS.find((s) => s.key === initialSort)?.key as SortKey) ?? "featured",
  );
  const [maxPrice, setMaxPrice] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const deptId = useMemo(() => departments.find((d) => d.slug === dept)?.id ?? null, [departments, dept]);
  const catId = useMemo(() => categories.find((c) => c.slug === cat)?.id ?? null, [categories, cat]);

  // Categories that actually have products in the selected department
  const visibleCategories = useMemo(() => {
    const pool = deptId ? products.filter((p) => p.department_id === deptId) : products;
    const used = new Set(pool.map((p) => p.shop_category_id));
    return categories.filter((c) => used.has(c.id));
  }, [products, categories, deptId]);

  const filtered = useMemo(() => {
    let list = products.filter((p) => {
      if (deptId && p.department_id !== deptId) return false;
      if (catId && p.shop_category_id !== catId) return false;
      if (query) {
        const q = query.toLowerCase();
        const hit =
          p.name.toLowerCase().includes(q) ||
          (p.brand ?? "").toLowerCase().includes(q) ||
          (p.description ?? "").toLowerCase().includes(q);
        if (!hit) return false;
      }
      if (maxPrice && minPrice(p) > Number(maxPrice)) return false;
      if (inStockOnly && totalStock(p) === 0) return false;
      return true;
    });
    switch (sort) {
      case "new":
        list = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "rating":
        list = [...list].sort((a, b) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0) || b.review_count - a.review_count);
        break;
      case "price-asc":
        list = [...list].sort((a, b) => minPrice(a) - minPrice(b));
        break;
      case "price-desc":
        list = [...list].sort((a, b) => minPrice(b) - minPrice(a));
        break;
    }
    return list;
  }, [products, deptId, catId, query, maxPrice, inStockOnly, sort]);

  const activeDeptName = departments.find((d) => d.slug === dept)?.name;
  const activeCatName = categories.find((c) => c.slug === cat)?.name;

  const filterPanel = (
    <div className="space-y-5">
      {/* Departments */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Department</p>
        <div className="space-y-0.5">
          <button
            onClick={() => { setDept(""); setCat(""); }}
            className={`block w-full text-left px-2.5 py-1.5 rounded-lg text-[13px] transition-colors ${!dept ? "bg-orange-50 text-orange-700 font-semibold" : "text-slate-600 hover:bg-slate-50"}`}
          >
            All departments
          </button>
          {departments.map((d) => (
            <button
              key={d.id}
              onClick={() => { setDept(d.slug); setCat(""); }}
              className={`block w-full text-left px-2.5 py-1.5 rounded-lg text-[13px] transition-colors ${dept === d.slug ? "bg-orange-50 text-orange-700 font-semibold" : "text-slate-600 hover:bg-slate-50"}`}
            >
              {d.icon ? `${d.icon} ` : ""}{d.name}
            </button>
          ))}
        </div>
      </div>

      {/* Categories */}
      {visibleCategories.length > 0 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Category</p>
          <div className="space-y-0.5 max-h-64 overflow-y-auto pr-1">
            <button
              onClick={() => setCat("")}
              className={`block w-full text-left px-2.5 py-1.5 rounded-lg text-[13px] transition-colors ${!cat ? "bg-orange-50 text-orange-700 font-semibold" : "text-slate-600 hover:bg-slate-50"}`}
            >
              All categories
            </button>
            {visibleCategories.map((c) => (
              <button
                key={c.id}
                onClick={() => setCat(c.slug)}
                className={`block w-full text-left px-2.5 py-1.5 rounded-lg text-[13px] transition-colors ${cat === c.slug ? "bg-orange-50 text-orange-700 font-semibold" : "text-slate-600 hover:bg-slate-50"}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Price */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Max price (KSh)</p>
        <input
          type="number"
          min="0"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          placeholder="e.g. 5000"
          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
        />
      </div>

      {/* Stock */}
      <label className="flex items-center gap-2 text-[13px] font-medium text-slate-600 cursor-pointer">
        <input
          type="checkbox"
          checked={inStockOnly}
          onChange={(e) => setInStockOnly(e.target.checked)}
          className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
        />
        In stock only
      </label>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-5">
      {/* Breadcrumb / title */}
      <div className="mb-4">
        <p className="text-xs text-slate-400">
          Store {activeDeptName ? `› ${activeDeptName}` : ""} {activeCatName ? `› ${activeCatName}` : ""}
        </p>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight mt-1">
          {query ? `Results for “${query}”` : activeCatName ?? activeDeptName ?? "All Products"}
        </h1>
      </div>

      <div className="flex gap-5">
        {/* Sidebar (desktop) */}
        <aside className="hidden lg:block w-56 shrink-0">
          <div className="bg-white border border-slate-200 rounded-xl p-4 sticky top-36">
            {filterPanel}
          </div>
        </aside>

        {/* Results */}
        <div className="flex-1 min-w-0">
          {/* Toolbar */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[180px] max-w-sm">
              <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter these results…"
                className="w-full bg-white border border-slate-200 rounded-full pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
            <button
              onClick={() => setFiltersOpen(true)}
              className="lg:hidden inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 rounded-full text-sm font-medium text-slate-600"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
              Filters
            </button>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="ml-auto bg-white border border-slate-200 rounded-full px-3.5 py-2 text-sm font-medium text-slate-600 focus:outline-none focus:border-orange-500 cursor-pointer"
            >
              {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>

          <p className="text-xs text-slate-400 mb-3">{filtered.length} product{filtered.length !== 1 ? "s" : ""} found</p>

          {filtered.length === 0 ? (
            <div className="text-center py-24 bg-white border border-slate-200 rounded-xl">
              <p className="font-semibold text-slate-700">No products match your filters</p>
              <p className="text-sm text-slate-400 mt-1">Try clearing the search or choosing another category</p>
              <button
                onClick={() => { setQuery(""); setDept(""); setCat(""); setMaxPrice(""); setInStockOnly(false); }}
                className="mt-4 px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-full transition-colors"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      {filtersOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setFiltersOpen(false)} />
          <div className="relative ml-auto w-80 max-w-[85vw] h-full bg-white shadow-xl overflow-y-auto animate-slideIn">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white">
              <p className="font-bold text-slate-900">Filters</p>
              <button onClick={() => setFiltersOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5">{filterPanel}</div>
            <div className="px-5 pb-6">
              <button
                onClick={() => setFiltersOpen(false)}
                className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-full transition-colors"
              >
                Show {filtered.length} result{filtered.length !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
