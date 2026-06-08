"use client";

import { useState, useMemo } from "react";
import { Transaction } from "@/types";
import CheckinModal from "./CheckinModal";
import Pagination from "@/app/components/Pagination";

const conditionBadge: Record<string, string> = {
  Good: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  Damaged: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  "Needs Repair": "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
};

type Tab = "all" | "active" | "returned";
const PAGE_SIZE = 12;

export default function TransactionHistory({
  transactions,
  onRefresh,
}: {
  transactions: Transaction[];
  onRefresh: () => void;
}) {
  const [tab, setTab] = useState<Tab>("active");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const activeCount = transactions.filter((t) => !t.audit_log).length;
  const returnedCount = transactions.filter((t) => !!t.audit_log).length;

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return transactions.filter((t) => {
      const tabMatch =
        tab === "all" ||
        (tab === "active" && !t.audit_log) ||
        (tab === "returned" && !!t.audit_log);
      const qMatch =
        !q ||
        (t.equipment?.name ?? "").toLowerCase().includes(q) ||
        (t.client?.name ?? "").toLowerCase().includes(q) ||
        t.staff_out_id.toLowerCase().includes(q);
      return tabMatch && qMatch;
    });
  }, [transactions, tab, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function handleTabChange(t: Tab) {
    setTab(t);
    setPage(1);
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-14 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">No transactions yet</p>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Check out some equipment above to get started.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          {(["all", "active", "returned"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => handleTabChange(t)}
              className={`px-3.5 py-1.5 text-xs rounded-lg capitalize transition-colors font-semibold ${
                tab === t
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              {t}
              {t === "active" && activeCount > 0 && (
                <span className="ml-1.5 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full leading-none">
                  {activeCount}
                </span>
              )}
              {t === "returned" && returnedCount > 0 && (
                <span className="ml-1.5 bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-300 text-xs px-1.5 py-0.5 rounded-full leading-none">
                  {returnedCount}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-52">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[520px]">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800">
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Equipment</th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:table-cell">Client</th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">Out</th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Due</th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden lg:table-cell">Staff</th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400 dark:text-slate-600">
                  No transactions found.
                </td>
              </tr>
            ) : (
              pageItems.map((t) => {
                const due = new Date(t.due_date);
                const overdue = !t.audit_log && due < new Date();
                const isActive = !t.audit_log;
                return (
                  <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-slate-900 dark:text-white truncate max-w-[140px]">
                        {t.equipment?.name ?? `#${t.equipment_id}`}
                      </div>
                      <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 sm:hidden truncate">
                        {t.client?.name ?? `#${t.client_id}`}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 hidden sm:table-cell truncate max-w-[120px]">
                      {t.client?.name ?? `#${t.client_id}`}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 text-xs hidden md:table-cell">
                      {new Date(t.out_timestamp).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs whitespace-nowrap ${overdue ? "text-red-600 dark:text-red-400 font-semibold" : "text-slate-600 dark:text-slate-300"}`}>
                        {due.toLocaleDateString()}
                      </span>
                      {overdue && (
                        <span className="ml-1 text-xs bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full font-semibold">
                          OVR
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {isActive ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                          Out
                        </span>
                      ) : (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${conditionBadge[t.audit_log!.condition_on_return]}`}>
                          {t.audit_log!.condition_on_return}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 text-xs font-mono hidden lg:table-cell">
                      {t.staff_out_id}
                    </td>
                    <td className="px-4 py-3.5">
                      {isActive ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <CheckinModal
                            transactionId={t.id}
                            equipmentName={t.equipment?.name ?? `#${t.equipment_id}`}
                            onDone={onRefresh}
                          />
                          {overdue && (
                            <>
                              {t.client?.phone && (
                                <a
                                  href={`https://wa.me/${t.client.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${t.client.name}, this is a reminder that "${t.equipment?.name ?? "equipment"}" was due back on ${new Date(t.due_date).toLocaleDateString()}. Please return it at your earliest convenience. Thank you — Fab Entertainment`)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Send WhatsApp reminder"
                                  className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                                >
                                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                  </svg>
                                </a>
                              )}
                              {t.client?.email && (
                                <a
                                  href={`mailto:${t.client.email}?subject=${encodeURIComponent(`Overdue Equipment Return — ${t.equipment?.name ?? "Equipment"}`)}&body=${encodeURIComponent(`Hi ${t.client.name},\n\nThis is a reminder that the following equipment is overdue for return:\n\nItem: ${t.equipment?.name ?? "Equipment"}\nDue date: ${new Date(t.due_date).toLocaleDateString()}\n\nPlease return it as soon as possible.\n\nThank you,\nFab Entertainment`)}`}
                                  title="Send email reminder"
                                  className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                  </svg>
                                </a>
                              )}
                            </>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-slate-600 font-medium">Returned</span>
                      )}
                    </td>
                  </tr>
                );
              })
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
  );
}
