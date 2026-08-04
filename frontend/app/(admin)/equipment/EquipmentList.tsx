"use client";

import { useState, useMemo, Fragment } from "react";
import Link from "next/link";
import { Equipment, Category } from "@/types";
import Pagination from "@/app/components/Pagination";
import EquipmentEditModal, { EquipmentGroup } from "./EquipmentEditModal";

const ALL = "All" as const;
type Filter = "Available" | "Out" | "Maintenance" | "Retired" | typeof ALL;
const PAGE_SIZE = 15;

const unitBadge: Record<string, string> = {
  Available: "bg-emerald-100 text-emerald-700",
  Out: "bg-amber-100 text-amber-700",
  Maintenance: "bg-red-100 text-red-700",
  Retired: "bg-slate-200 text-slate-600",
};

function AvailabilityBar({ g }: { g: EquipmentGroup }) {
  return (
    <div className="min-w-[120px] max-w-[180px]">
      <div className="flex h-1.5 rounded-full overflow-hidden bg-slate-100">
        {g.available > 0 && <div className="bg-emerald-500" style={{ width: `${(g.available / g.total) * 100}%` }} />}
        {g.out > 0 && <div className="bg-amber-500" style={{ width: `${(g.out / g.total) * 100}%` }} />}
        {g.maintenance > 0 && <div className="bg-red-500" style={{ width: `${(g.maintenance / g.total) * 100}%` }} />}
        {g.retired > 0 && <div className="bg-slate-400" style={{ width: `${(g.retired / g.total) * 100}%` }} />}
      </div>
      <p className="text-[11px] text-slate-400 mt-1">
        <span className="text-emerald-600 font-semibold">{g.available}</span> available
        {g.out > 0 && <> · <span className="text-amber-600 font-semibold">{g.out}</span> out</>}
        {g.maintenance > 0 && <> · <span className="text-red-600 font-semibold">{g.maintenance}</span> maint</>}
        {g.retired > 0 && <> · <span className="text-slate-500 font-semibold">{g.retired}</span> retired</>}
      </p>
    </div>
  );
}

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
  const [expanded, setExpanded] = useState<string | null>(null);

  const groups = useMemo<EquipmentGroup[]>(() => {
    const map = new Map<string, EquipmentGroup>();
    for (const e of equipment) {
      const key = e.name;
      if (!map.has(key)) {
        map.set(key, { name: e.name, category: e.category, total: 0, available: 0, out: 0, maintenance: 0, retired: 0, items: [] });
      }
      const g = map.get(key)!;
      g.total++;
      g.items.push(e);
      if (e.status === "Available") g.available++;
      else if (e.status === "Out") g.out++;
      else if (e.status === "Retired") g.retired++;
      else g.maintenance++;
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [equipment]);

  const filtered = useMemo(() => {
    return groups.filter((g) => {
      const matchCat = !catFilter || g.category === catFilter;
      const q = query.toLowerCase();
      const matchQuery =
        !q ||
        g.name.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q) ||
        g.items.some((i) => i.serial_number.toLowerCase().includes(q) || (i.location ?? "").toLowerCase().includes(q));
      const matchStatus =
        filter === ALL ||
        (filter === "Available" && g.available > 0) ||
        (filter === "Out" && g.out > 0) ||
        (filter === "Maintenance" && g.maintenance > 0) ||
        (filter === "Retired" && g.retired > 0);
      return matchCat && matchQuery && matchStatus;
    });
  }, [groups, query, filter, catFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const statusCount: Record<Exclude<Filter, typeof ALL>, number> = {
    Available: groups.filter((g) => g.available > 0).length,
    Out: groups.filter((g) => g.out > 0).length,
    Maintenance: groups.filter((g) => g.maintenance > 0).length,
    Retired: groups.filter((g) => g.retired > 0).length,
  };

  return (
    <>
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="relative flex-1 min-w-0">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search name, category, serial number or location…"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
            />
          </div>

          {/* Status segmented control */}
          <div className="flex p-1 bg-slate-100 rounded-xl gap-0.5 shrink-0 overflow-x-auto">
            {([ALL, "Available", "Out", "Maintenance", "Retired"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => { setFilter(f); setPage(1); }}
                className={`px-3 py-1.5 text-xs rounded-lg transition-all font-semibold whitespace-nowrap ${
                  filter === f
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {f}
                {f !== ALL && (
                  <span className="ml-1.5 text-[10px] text-slate-400">{statusCount[f]}</span>
                )}
              </button>
            ))}
          </div>

          <select
            value={catFilter}
            onChange={(e) => { setCatFilter(e.target.value); setPage(1); }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-brand-500 lg:w-44 transition-all shrink-0"
          >
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>

        {/* Asset register table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Asset</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Category</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Availability</th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-slate-400">
                      {equipment.length === 0 ? "No equipment yet. Add your first item above." : "No items match your filters."}
                    </td>
                  </tr>
                ) : (
                  pageItems.map((g) => (
                    <Fragment key={g.name}>
                      <tr
                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => setExpanded((cur) => (cur === g.name ? null : g.name))}
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
                              <svg className="w-5 h-5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 truncate">{g.name}</p>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {g.total} unit{g.total !== 1 ? "s" : ""}
                                <span className="md:hidden"> · {g.category}</span>
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 hidden md:table-cell">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                            {g.category}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <AvailabilityBar g={g} />
                        </td>
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <button
                            onClick={(e) => { e.stopPropagation(); setExpanded((cur) => (cur === g.name ? null : g.name)); }}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors mr-1.5 ${
                              expanded === g.name
                                ? "bg-brand-600 text-white"
                                : "text-brand-600 bg-brand-50 hover:bg-brand-100"
                            }`}
                          >
                            Units
                            <svg className={`w-3 h-3 transition-transform ${expanded === g.name ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditGroup(g); }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </button>
                        </td>
                      </tr>
                      {expanded === g.name && (
                        <tr className="bg-slate-50/70">
                          <td colSpan={4} className="px-4 py-3">
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                              Individual units — click one to open its asset profile
                            </p>
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                              {g.items.map((item) => (
                                <Link
                                  key={item.id}
                                  href={`/equipment/${item.id}`}
                                  className="flex items-center justify-between gap-2 px-3 py-2.5 bg-white border border-slate-200 rounded-xl hover:border-brand-400 hover:shadow-sm transition-all group/unit"
                                >
                                  <div className="min-w-0">
                                    <p className="text-xs font-mono text-slate-600 truncate group-hover/unit:text-brand-600 transition-colors">
                                      {item.serial_number}
                                    </p>
                                    <p className="text-[10px] text-slate-400 truncate">
                                      {item.location ?? "View asset profile"}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${unitBadge[item.status]}`}>
                                      {item.status}
                                    </span>
                                    <svg className="w-3 h-3 text-slate-300 group-hover/unit:text-brand-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                                  </div>
                                </Link>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
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
