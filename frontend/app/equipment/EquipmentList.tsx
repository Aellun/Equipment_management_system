"use client";

import { useState, useMemo } from "react";
import { Equipment, Category } from "@/types";
import Pagination from "@/app/components/Pagination";
import EquipmentEditModal, { EquipmentGroup } from "./EquipmentEditModal";

const ALL = "All" as const;
type Filter = "Available" | "Out" | "Maintenance" | typeof ALL;
const PAGE_SIZE = 15;

export default function EquipmentList({
  equipment,
  categories,
  onRefresh,
}: {
  equipment: Equipment[];
  categories: Category[];
  onRefresh: () => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>(ALL);
  const [catFilter, setCatFilter] = useState("");
  const [page, setPage] = useState(1);
  const [editGroup, setEditGroup] = useState<EquipmentGroup | null>(null);

  const groups = useMemo<EquipmentGroup[]>(() => {
    const map = new Map<string, EquipmentGroup>();
    for (const e of equipment) {
      const key = e.name;
      if (!map.has(key)) {
        map.set(key, { name: e.name, category: e.category, total: 0, available: 0, out: 0, maintenance: 0, items: [] });
      }
      const g = map.get(key)!;
      g.total++;
      g.items.push(e);
      if (e.status === "Available") g.available++;
      else if (e.status === "Out") g.out++;
      else g.maintenance++;
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [equipment]);

  const filtered = useMemo(() => {
    return groups.filter((g) => {
      const matchCat = !catFilter || g.category === catFilter;
      const q = query.toLowerCase();
      const matchQuery = !q || g.name.toLowerCase().includes(q) || g.category.toLowerCase().includes(q);
      const matchStatus =
        filter === ALL ||
        (filter === "Available" && g.available > 0) ||
        (filter === "Out" && g.out > 0) ||
        (filter === "Maintenance" && g.maintenance > 0);
      return matchCat && matchQuery && matchStatus;
    });
  }, [groups, query, filter, catFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <>
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1 min-w-0">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name or category…"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>
          <select
            value={catFilter}
            onChange={(e) => { setCatFilter(e.target.value); setPage(1); }}
            className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 sm:w-48 transition-all"
          >
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>

        {/* Status pills */}
        <div className="flex gap-1.5 flex-wrap">
          {([ALL, "Available", "Out", "Maintenance"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1); }}
              className={`px-3.5 py-1.5 text-xs rounded-lg transition-colors font-semibold ${filter === f ? "bg-indigo-600 text-white shadow-sm" : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300"}`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">Category</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Count</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:table-cell">Availability</th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-400 dark:text-slate-600">
                      {equipment.length === 0 ? "No equipment yet. Add your first item above." : "No items match your filters."}
                    </td>
                  </tr>
                ) : (
                  pageItems.map((g) => (
                    <tr key={g.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-slate-900 dark:text-white">{g.name}</div>
                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 md:hidden">{g.category}</div>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {g.category}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 text-sm font-bold">
                          {g.total}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {g.available > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                              {g.available} avail
                            </span>
                          )}
                          {g.out > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                              {g.out} out
                            </span>
                          )}
                          {g.maintenance > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
                              {g.maintenance} maint
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => setEditGroup(g)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            page={safePage}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </div>
      </div>

      {editGroup && (
        <EquipmentEditModal
          group={editGroup}
          categories={categories}
          onDone={() => { setEditGroup(null); onRefresh(); }}
        />
      )}
    </>
  );
}
