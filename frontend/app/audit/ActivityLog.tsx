"use client";

import { useState, useMemo } from "react";
import Pagination from "@/app/components/Pagination";

interface LogEntry {
  id: number;
  timestamp: string;
  action: string;
  entity_type: string;
  entity_id: number | null;
  entity_name: string | null;
  performed_by: string | null;
  details: string | null;
}

const PAGE_SIZE = 25;

const actionConfig: Record<string, { label: string; color: string }> = {
  create: { label: "Created", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" },
  delete: { label: "Deleted", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" },
  bulk_delete: { label: "Bulk Delete", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" },
  bulk_update: { label: "Renamed", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" },
  checkout: { label: "Checked Out", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" },
  bulk_checkout: { label: "Bulk Checkout", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" },
  checkin: { label: "Returned", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400" },
  update: { label: "Updated", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" },
};

const entityConfig: Record<string, { label: string; icon: string }> = {
  equipment: { label: "Equipment", icon: "📦" },
  transaction: { label: "Transaction", icon: "🔄" },
  user: { label: "User", icon: "👤" },
  client: { label: "Client", icon: "🧑" },
};

function ActionBadge({ action }: { action: string }) {
  const cfg = actionConfig[action] ?? { label: action, color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>;
}

function EntityBadge({ type }: { type: string }) {
  const cfg = entityConfig[type] ?? { label: type, icon: "⚙️" };
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
      <span>{cfg.icon}</span> {cfg.label}
    </span>
  );
}

function DetailsCell({ raw }: { raw: string | null }) {
  if (!raw) return <span className="text-slate-400 dark:text-slate-600">—</span>;
  try {
    const obj = JSON.parse(raw);
    return (
      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
        {Object.entries(obj).filter(([, v]) => v !== null && v !== undefined).map(([k, v]) => `${k}: ${v}`).join(" · ")}
      </span>
    );
  } catch {
    return <span className="text-xs text-slate-500 dark:text-slate-400">{raw}</span>;
  }
}

export default function ActivityLog({ logs }: { logs: LogEntry[] }) {
  const [query, setQuery] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return logs.filter((l) => {
      const matchEntity = !entityFilter || l.entity_type === entityFilter;
      const matchAction = !actionFilter || l.action === actionFilter;
      const matchQuery = !q || (l.entity_name ?? "").toLowerCase().includes(q) || (l.performed_by ?? "").toLowerCase().includes(q) || l.entity_type.includes(q);
      return matchEntity && matchAction && matchQuery;
    });
  }, [logs, query, entityFilter, actionFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const uniqueEntities = Array.from(new Set(logs.map(l => l.entity_type)));
  const uniqueActions = Array.from(new Set(logs.map(l => l.action)));

  if (logs.length === 0) {
    return (
      <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">No activity recorded yet</p>
        <p className="text-sm text-slate-400 mt-1">Actions will appear here as the system is used.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name or user…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
        </div>
        <select value={entityFilter} onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }} className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 sm:w-40 transition-all">
          <option value="">All types</option>
          {uniqueEntities.map(e => <option key={e} value={e}>{entityConfig[e]?.label ?? e}</option>)}
        </select>
        <select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }} className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 sm:w-40 transition-all">
          <option value="">All actions</option>
          {uniqueActions.map(a => <option key={a} value={a}>{actionConfig[a]?.label ?? a}</option>)}
        </select>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">When</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Action</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">Details</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden lg:table-cell">By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400 dark:text-slate-600">No log entries match your filters.</td>
                </tr>
              ) : pageItems.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    <div>{new Date(log.timestamp).toLocaleDateString()}</div>
                    <div className="text-slate-400 dark:text-slate-600">{new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                  </td>
                  <td className="px-4 py-3"><ActionBadge action={log.action} /></td>
                  <td className="px-4 py-3"><EntityBadge type={log.entity_type} /></td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-900 dark:text-white text-sm">{log.entity_name ?? `#${log.entity_id ?? "—"}`}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell max-w-[200px] truncate">
                    <DetailsCell raw={log.details} />
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 hidden lg:table-cell">
                    {log.performed_by ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={safePage} totalPages={totalPages} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </div>
    </div>
  );
}
