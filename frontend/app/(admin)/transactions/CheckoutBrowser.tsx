"use client";

import { useState, useMemo } from "react";
import { Equipment, Client, Category } from "@/types";
import { useToast } from "@/app/components/Toast";
import { useAuth } from "@/app/components/AuthProvider";
import Pagination from "@/app/components/Pagination";

const API = process.env.NEXT_PUBLIC_API_URL ?? "/api";
const PAGE_SIZE = 10;

type ItemGroup = {
  key: string;
  name: string;
  category: string;
  units: Equipment[];
};

function QtyStepper({
  value, max, onChange,
}: {
  value: number;
  max: number;
  onChange: (next: number) => void;
}) {
  return (
    <div
      className={`inline-flex items-center rounded-xl border transition-colors ${
        value > 0
          ? "border-brand-300 dark:border-brand-700 bg-brand-50 dark:bg-brand-900/20"
          : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        aria-label="Remove one"
        disabled={value === 0}
        onClick={() => onChange(Math.max(0, value - 1))}
        className="w-8 h-8 flex items-center justify-center text-slate-500 dark:text-slate-300 hover:text-brand-600 disabled:opacity-30 disabled:cursor-not-allowed text-base font-bold"
      >
        −
      </button>
      <span className={`w-8 text-center text-sm font-bold tabular-nums ${value > 0 ? "text-brand-700 dark:text-brand-300" : "text-slate-400"}`}>
        {value}
      </span>
      <button
        type="button"
        aria-label="Add one"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="w-8 h-8 flex items-center justify-center text-slate-500 dark:text-slate-300 hover:text-brand-600 disabled:opacity-30 disabled:cursor-not-allowed text-base font-bold"
      >
        +
      </button>
    </div>
  );
}

export default function CheckoutBrowser({
  equipment,
  clients,
  categories,
  onDone,
}: {
  equipment: Equipment[];
  clients: Client[];
  categories: Category[];
  onDone: () => void;
}) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [page, setPage] = useState(1);
  // groupKey -> quantity requested
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [showCheckout, setShowCheckout] = useState(false);

  // Group available units by item name (e.g. all "Amp" units become one row)
  const groups = useMemo<ItemGroup[]>(() => {
    const map = new Map<string, ItemGroup>();
    for (const e of equipment) {
      const key = `${e.name}__${e.category}`;
      if (!map.has(key)) map.set(key, { key, name: e.name, category: e.category, units: [] });
      map.get(key)!.units.push(e);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [equipment]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return groups.filter((g) => {
      const matchCat = !catFilter || g.category === catFilter;
      const matchQ =
        !q ||
        g.name.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q) ||
        g.units.some((u) => u.serial_number.toLowerCase().includes(q));
      return matchCat && matchQ;
    });
  }, [groups, query, catFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function setQty(key: string, qty: number) {
    setQuantities((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[key];
      else next[key] = qty;
      return next;
    });
  }

  const picked = groups
    .filter((g) => (quantities[g.key] ?? 0) > 0)
    .map((g) => ({ group: g, qty: Math.min(quantities[g.key], g.units.length) }));
  const totalUnits = picked.reduce((s, p) => s + p.qty, 0);

  function clearSelection() {
    setQuantities({});
  }

  if (equipment.length === 0) {
    return (
      <div className="text-center py-14 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">No available equipment</p>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">All items are checked out or in maintenance.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
      {/* Filters */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 min-w-0">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search items, categories or serials…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
          />
        </div>
        <select
          value={catFilter}
          onChange={(e) => { setCatFilter(e.target.value); setPage(1); }}
          className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 sm:w-44 transition-all"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Grouped item table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[480px]">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Item</th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">Category</th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">In Stock</th>
              <th className="px-4 py-3.5 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Quantity to Check Out</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-400 dark:text-slate-600">
                  No items match your search.
                </td>
              </tr>
            ) : (
              pageItems.map((g) => {
                const qty = quantities[g.key] ?? 0;
                return (
                  <tr
                    key={g.key}
                    onClick={() => setQty(g.key, qty > 0 ? 0 : 1)}
                    className={`cursor-pointer transition-colors ${
                      qty > 0
                        ? "bg-brand-50/60 dark:bg-brand-900/10 hover:bg-brand-50 dark:hover:bg-brand-900/20"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-900/40 flex items-center justify-center shrink-0">
                          <svg className="w-5 h-5 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 dark:text-white truncate">{g.name}</p>
                          <p className="text-xs text-slate-400 md:hidden">{g.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {g.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                        {g.units.length} available
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <QtyStepper value={qty} max={g.units.length} onChange={(n) => setQty(g.key, n)} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={currentPage}
        totalPages={totalPages}
        totalItems={filtered.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />

      {/* Selection summary bar */}
      {totalUnits > 0 && (
        <div className="border-t border-brand-200 dark:border-brand-800/60 bg-brand-50 dark:bg-brand-950/50 px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-3 min-w-0">
            <span className="inline-flex items-center justify-center min-w-[1.75rem] h-7 px-1.5 rounded-full bg-brand-600 text-white text-xs font-bold shrink-0">
              {totalUnits}
            </span>
            <p className="text-sm text-brand-700 dark:text-brand-300 font-semibold truncate">
              {picked.map((p) => `${p.group.name} × ${p.qty}`).join(" · ")}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={clearSelection}
              className="px-3 py-2 text-xs text-brand-600 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/40 rounded-lg transition-colors font-medium"
            >
              Clear
            </button>
            <button
              onClick={() => setShowCheckout(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs bg-brand-600 hover:bg-brand-500 text-white rounded-lg transition-colors font-semibold shadow-sm"
            >
              Check Out {totalUnits} Unit{totalUnits !== 1 ? "s" : ""}
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {showCheckout && (
        <CheckoutModal
          picked={picked}
          clients={clients}
          staffName={user?.name ?? user?.email ?? "Staff"}
          onClose={() => setShowCheckout(false)}
          onDone={() => {
            setShowCheckout(false);
            clearSelection();
            onDone();
          }}
        />
      )}
    </div>
  );
}

function CheckoutModal({
  picked,
  clients,
  staffName,
  onClose,
  onDone,
}: {
  picked: { group: ItemGroup; qty: number }[];
  clients: Client[];
  staffName: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [clientId, setClientId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);

  const minDate = new Date().toISOString().split("T")[0];
  const totalUnits = picked.reduce((s, p) => s + p.qty, 0);
  // Specific units are assigned automatically: the first N available of each item
  const equipmentIds = picked.flatMap((p) => p.group.units.slice(0, p.qty).map((u) => u.id));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) {
      toast.error("Please select a client before proceeding.", "Client required");
      return;
    }
    if (!dueDate) {
      toast.error("Please set a due date for the loan.", "Due date required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/transactions/checkout/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equipment_ids: equipmentIds,
          client_id: parseInt(clientId),
          due_date: new Date(dueDate).toISOString(),
          staff_out_id: staffName,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.detail ?? "Checkout failed. Please try again.", "Checkout failed");
        return;
      }
      const clientName = clients.find((c) => c.id === parseInt(clientId))?.name ?? "the client";
      toast.success(
        `${picked.map((p) => `${p.group.name} × ${p.qty}`).join(", ")} checked out to ${clientName}.`,
        "Checkout complete"
      );
      onDone();
    } catch {
      toast.error("Could not reach the server. Check your connection.", "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[90vh] flex flex-col animate-slideInUp sm:animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Confirm Checkout</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {totalUnits} unit{totalUnits !== 1 ? "s" : ""} · Staff: <span className="font-medium">{staffName}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1">
          {/* Grouped item summary */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Items</p>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl divide-y divide-slate-200/70 dark:divide-slate-700/70 max-h-44 overflow-y-auto">
              {picked.map(({ group, qty }) => (
                <div key={group.key} className="px-3 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-slate-800 dark:text-white truncate">{group.name}</span>
                    <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 text-xs font-bold">
                      × {qty}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono mt-1 truncate">
                    {group.units.slice(0, qty).map((u) => u.serial_number).join(", ")}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Serial numbers are assigned automatically from the available pool.
            </p>
          </div>

          <form onSubmit={submit} className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Client <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
              >
                <option value="">Select a client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} — {c.email}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Due Date <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="date"
                min={minDate}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 text-sm bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors font-semibold"
              >
                {loading ? "Processing…" : `Check Out ${totalUnits} Unit${totalUnits !== 1 ? "s" : ""}`}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
