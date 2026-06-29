"use client";

import { useState, useMemo, Fragment } from "react";
import { Transaction, ConditionOnReturn } from "@/types";
import CheckinModal from "./CheckinModal";
import Pagination from "@/app/components/Pagination";
import { useToast } from "@/app/components/Toast";

const API = process.env.NEXT_PUBLIC_API_URL ?? "/api";

const conditionBadge: Record<string, string> = {
  Good: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  Damaged: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  "Needs Repair": "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
};

type Tab = "active" | "returned" | "all";
const PAGE_SIZE = 10;

// One loan batch = same item, same client, same due date, same checkout day
type LoanBatch = {
  key: string;
  itemName: string;
  clientName: string;
  clientPhone: string | null;
  clientEmail: string | null;
  outDate: Date;
  dueDate: Date;
  staff: string;
  active: Transaction[];
  returned: Transaction[];
  all: Transaction[];
};

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
  const [expanded, setExpanded] = useState<string | null>(null);
  const [batchCheckin, setBatchCheckin] = useState<LoanBatch | null>(null);

  const batches = useMemo<LoanBatch[]>(() => {
    const map = new Map<string, LoanBatch>();
    for (const t of transactions) {
      const outDay = new Date(t.out_timestamp).toISOString().slice(0, 10);
      const dueDay = new Date(t.due_date).toISOString().slice(0, 10);
      const itemName = t.equipment?.name ?? `#${t.equipment_id}`;
      const key = `${itemName}__${t.client_id}__${outDay}__${dueDay}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          itemName,
          clientName: t.client?.name ?? `#${t.client_id}`,
          clientPhone: t.client?.phone ?? null,
          clientEmail: t.client?.email ?? null,
          outDate: new Date(t.out_timestamp),
          dueDate: new Date(t.due_date),
          staff: t.staff_out_id,
          active: [],
          returned: [],
          all: [],
        });
      }
      const b = map.get(key)!;
      b.all.push(t);
      if (t.audit_log) b.returned.push(t);
      else b.active.push(t);
    }
    // Active batches first (overdue at the very top), then most recent
    return Array.from(map.values()).sort((a, b) => {
      const aActive = a.active.length > 0 ? 1 : 0;
      const bActive = b.active.length > 0 ? 1 : 0;
      if (aActive !== bActive) return bActive - aActive;
      return b.outDate.getTime() - a.outDate.getTime();
    });
  }, [transactions]);

  const activeBatchCount = batches.filter((b) => b.active.length > 0).length;
  const activeUnitCount = transactions.filter((t) => !t.audit_log).length;

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return batches.filter((b) => {
      const tabMatch =
        tab === "all" ||
        (tab === "active" && b.active.length > 0) ||
        (tab === "returned" && b.returned.length > 0 && b.active.length === 0);
      const qMatch =
        !q ||
        b.itemName.toLowerCase().includes(q) ||
        b.clientName.toLowerCase().includes(q) ||
        b.staff.toLowerCase().includes(q) ||
        b.all.some((t) => (t.equipment?.serial_number ?? "").toLowerCase().includes(q));
      return tabMatch && qMatch;
    });
  }, [batches, tab, query]);

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

  const now = new Date();

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          {(["active", "returned", "all"] as Tab[]).map((t) => (
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
              {t === "active" && activeBatchCount > 0 && (
                <span className="ml-1.5 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full leading-none">
                  {activeBatchCount}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-60">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search item, client or serial…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
          />
        </div>
      </div>

      {/* Grouped batch table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Item</th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Client</th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">Out</th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Due</th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3.5 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400 dark:text-slate-600">
                  No loans found.
                </td>
              </tr>
            ) : (
              pageItems.map((b) => {
                const overdue = b.active.length > 0 && b.dueDate < now;
                const isExpanded = expanded === b.key;
                const goodCount = b.returned.filter((t) => t.audit_log!.condition_on_return === "Good").length;
                const issueCount = b.returned.length - goodCount;
                return (
                  <Fragment key={b.key}>
                    <tr
                      onClick={() => setExpanded(isExpanded ? null : b.key)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <svg className={`w-3.5 h-3.5 text-slate-300 dark:text-slate-600 transition-transform shrink-0 ${isExpanded ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 dark:text-white truncate max-w-[160px]">
                              {b.itemName}
                              <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-md bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 text-[11px] font-bold align-middle">
                                × {b.all.length}
                              </span>
                            </p>
                            <p className="text-[11px] text-slate-400 sm:hidden truncate">{b.clientName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 truncate max-w-[140px]">
                        {b.clientName}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 text-xs hidden md:table-cell">
                        {b.outDate.toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs whitespace-nowrap ${overdue ? "text-red-600 dark:text-red-400 font-semibold" : "text-slate-600 dark:text-slate-300"}`}>
                          {b.dueDate.toLocaleDateString()}
                        </span>
                        {overdue && (
                          <span className="ml-1.5 text-[10px] bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full font-bold">
                            OVERDUE
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {b.active.length > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                              {b.active.length} out
                            </span>
                          )}
                          {goodCount > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                              {goodCount} returned
                            </span>
                          )}
                          {issueCount > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
                              {issueCount} damaged
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {b.active.length > 0 ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => setBatchCheckin(b)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-brand-600 hover:bg-brand-500 text-white rounded-lg transition-colors font-semibold"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                              </svg>
                              Check In{b.active.length > 1 ? ` (${b.active.length})` : ""}
                            </button>
                            {overdue && b.clientPhone && (
                              <a
                                href={`https://wa.me/${b.clientPhone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${b.clientName}, this is a reminder that ${b.itemName} × ${b.active.length} was due back on ${b.dueDate.toLocaleDateString()}. Please return it at your earliest convenience. Thank you — Fab Entertainment`)}`}
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
                            {overdue && b.clientEmail && (
                              <a
                                href={`mailto:${b.clientEmail}?subject=${encodeURIComponent(`Overdue Equipment Return — ${b.itemName}`)}&body=${encodeURIComponent(`Hi ${b.clientName},\n\nThis is a reminder that the following equipment is overdue for return:\n\nItem: ${b.itemName} × ${b.active.length}\nDue date: ${b.dueDate.toLocaleDateString()}\n\nPlease return it as soon as possible.\n\nThank you,\nFab Entertainment`)}`}
                                title="Send email reminder"
                                className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 hover:bg-brand-200 dark:hover:bg-brand-900/50 transition-colors"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-600 font-medium">All returned</span>
                        )}
                      </td>
                    </tr>

                    {/* Expanded: individual units */}
                    {isExpanded && (
                      <tr className="bg-slate-50/70 dark:bg-slate-800/30">
                        <td colSpan={6} className="px-4 py-3">
                          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                            Units in this loan — checked out by {b.staff}
                          </p>
                          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                            {b.all.map((t) => (
                              <div
                                key={t.id}
                                className="flex items-center justify-between gap-2 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                              >
                                <div className="min-w-0">
                                  <p className="text-xs font-mono text-slate-600 dark:text-slate-300 truncate">
                                    {t.equipment?.serial_number ?? `txn #${t.id}`}
                                  </p>
                                  {t.audit_log && (
                                    <p className="text-[10px] text-slate-400 truncate">
                                      returned {new Date(t.audit_log.return_timestamp).toLocaleDateString()}
                                      {t.audit_log.notes ? ` · ${t.audit_log.notes}` : ""}
                                    </p>
                                  )}
                                </div>
                                <div className="shrink-0">
                                  {t.audit_log ? (
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${conditionBadge[t.audit_log.condition_on_return]}`}>
                                      {t.audit_log.condition_on_return}
                                    </span>
                                  ) : (
                                    <CheckinModal
                                      transactionId={t.id}
                                      equipmentName={`${b.itemName} (${t.equipment?.serial_number ?? ""})`}
                                      onDone={onRefresh}
                                    />
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
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

      {batchCheckin && (
        <BatchCheckinModal
          batch={batchCheckin}
          onClose={() => setBatchCheckin(null)}
          onDone={() => {
            setBatchCheckin(null);
            onRefresh();
          }}
        />
      )}

      <p className="sr-only">{activeUnitCount} active units</p>
    </div>
  );
}

/* Check in all outstanding units of a batch with one inspection result */
function BatchCheckinModal({
  batch,
  onClose,
  onDone,
}: {
  batch: LoanBatch;
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const conditions: ConditionOnReturn[] = ["Good", "Damaged", "Needs Repair"];
  const [condition, setCondition] = useState<ConditionOnReturn>("Good");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const conditionStyle: Record<ConditionOnReturn, string> = {
    Good: "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
    Damaged: "border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
    "Needs Repair": "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    let okCount = 0;
    let failCount = 0;
    for (const t of batch.active) {
      try {
        const res = await fetch(`${API}/transactions/checkin/${t.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ condition_on_return: condition, notes: notes || null }),
        });
        if (res.ok) okCount++;
        else failCount++;
      } catch {
        failCount++;
      }
    }
    setLoading(false);
    if (okCount > 0) {
      toast.success(
        `${batch.itemName} × ${okCount} returned${condition !== "Good" ? " and moved to Maintenance" : " in good condition"}.`,
        "Check-in complete",
      );
      if (condition !== "Good") {
        toast.warning(`${okCount} unit${okCount !== 1 ? "s" : ""} flagged for maintenance review.`, "Maintenance required");
      }
    }
    if (failCount > 0) {
      toast.error(`${failCount} unit${failCount !== 1 ? "s" : ""} could not be checked in. Please retry.`, "Partial failure");
    }
    onDone();
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-sm animate-slideInUp sm:animate-fadeIn max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Return Equipment</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {batch.itemName} × {batch.active.length} · from {batch.clientName}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={submit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-4">
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-3.5 py-2.5 max-h-24 overflow-y-auto">
              <p className="text-[11px] text-slate-400 font-mono leading-relaxed">
                {batch.active.map((t) => t.equipment?.serial_number ?? `#${t.id}`).join(" · ")}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Condition on return — applies to all {batch.active.length} unit{batch.active.length !== 1 ? "s" : ""} <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {conditions.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCondition(c)}
                    className={`py-2.5 text-xs rounded-xl border-2 transition-all font-semibold ${
                      condition === c
                        ? conditionStyle[c]
                        : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Mixed conditions? Expand the row and check units in one by one instead.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Inspection notes
              </label>
              <textarea
                placeholder="Any observations, damage descriptions, or notes…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 resize-none transition-all"
              />
            </div>

            {condition !== "Good" && (
              <div className="flex items-start gap-2.5 text-xs bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 rounded-xl px-3.5 py-3">
                <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-amber-700 dark:text-amber-400">
                  All {batch.active.length} unit{batch.active.length !== 1 ? "s" : ""} will be set to <strong>Maintenance</strong> and removed from the available pool.
                </span>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl">
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 text-sm bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors font-semibold"
              >
                {loading ? "Processing…" : `Confirm Return of ${batch.active.length} Unit${batch.active.length !== 1 ? "s" : ""}`}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
