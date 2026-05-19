"use client";

import { useState, useMemo } from "react";
import { Equipment, Client, Category } from "@/types";
import { useToast } from "@/app/components/Toast";
import { useAuth } from "@/app/components/AuthProvider";
import Pagination from "@/app/components/Pagination";

const API = process.env.NEXT_PUBLIC_API_URL ?? "/api";
const PAGE_SIZE = 10;

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
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [showCheckout, setShowCheckout] = useState(false);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return equipment.filter((e) => {
      const matchCat = !catFilter || e.category === catFilter;
      const matchQ =
        !q ||
        e.name.toLowerCase().includes(q) ||
        e.serial_number.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [equipment, query, catFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const pageIds = new Set(pageItems.map((e) => e.id));
  const allPageSelected = pageItems.length > 0 && pageItems.every((e) => selected.has(e.id));

  function toggleItem(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePage() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  }

  function clearSelection() { setSelected(new Set()); }

  const selectedItems = equipment.filter((e) => selected.has(e.id));

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
            placeholder="Search by name or serial…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
        </div>
        <select
          value={catFilter}
          onChange={(e) => { setCatFilter(e.target.value); setPage(1); }}
          className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 sm:w-44 transition-all"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[400px]">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800">
              <th className="px-4 py-3.5 w-10">
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  onChange={togglePage}
                  className="rounded accent-indigo-600 w-4 h-4 cursor-pointer"
                />
              </th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Name</th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:table-cell">Serial</th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">Category</th>
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
              pageItems.map((item) => {
                const isSelected = selected.has(item.id);
                return (
                  <tr
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <td className="px-4 py-3.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleItem(item.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded accent-indigo-600 w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-slate-900 dark:text-white">{item.name}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5 sm:hidden">{item.serial_number}</div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 font-mono text-xs tracking-wide hidden sm:table-cell">{item.serial_number}</td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {item.category}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer: pagination */}
      <Pagination
        page={currentPage}
        totalPages={totalPages}
        totalItems={filtered.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />

      {/* Selection action bar */}
      {selected.size > 0 && (
        <div className="border-t border-indigo-200 dark:border-indigo-800/60 bg-indigo-50 dark:bg-indigo-950/50 px-4 py-3.5 flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold shrink-0">
              {selected.size}
            </span>
            <span className="text-sm text-indigo-700 dark:text-indigo-300 font-semibold">
              {selected.size === 1 ? "item selected" : "items selected"}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={clearSelection}
              className="px-3 py-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-lg transition-colors font-medium"
            >
              Clear
            </button>
            <button
              onClick={() => setShowCheckout(true)}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors font-semibold"
            >
              Checkout
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {showCheckout && (
        <CheckoutModal
          items={selectedItems}
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
  items,
  clients,
  staffName,
  onClose,
  onDone,
}: {
  items: Equipment[];
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
          equipment_ids: items.map((i) => i.id),
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
        `${items.length} item${items.length !== 1 ? "s" : ""} checked out to ${clientName}.`,
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
              {items.length} item{items.length !== 1 ? "s" : ""} · Staff: <span className="font-medium">{staffName}</span>
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
          {/* Item list */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Items</p>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 space-y-2 max-h-32 overflow-y-auto">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-xs gap-3">
                  <span className="font-medium text-slate-800 dark:text-white truncate">{item.name}</span>
                  <span className="text-slate-400 dark:text-slate-500 font-mono tracking-wide shrink-0">{item.serial_number}</span>
                </div>
              ))}
            </div>
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
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
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
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors font-semibold"
              >
                {loading ? "Processing…" : `Check Out ${items.length} Item${items.length !== 1 ? "s" : ""}`}
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
