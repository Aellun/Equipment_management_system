"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { MaintenanceLog, MaintenanceStatus, Equipment } from "@/types";
import { useToast } from "@/app/components/Toast";

const API = process.env.NEXT_PUBLIC_API_URL ?? "/api";

const statusBadge: Record<string, string> = {
  Open: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  "In Progress": "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  Completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  Cancelled: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

const FILTERS = ["All", "Open", "In Progress", "Completed", "Cancelled"] as const;

export default function MaintenanceManager({
  logs, equipment, onRefresh,
}: {
  logs: MaintenanceLog[];
  equipment: Equipment[];
  onRefresh: () => void;
}) {
  const { toast } = useToast();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [showNew, setShowNew] = useState(false);
  const [completeTarget, setCompleteTarget] = useState<MaintenanceLog | null>(null);
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(
    () => (filter === "All" ? logs : logs.filter((l) => l.status === filter)),
    [logs, filter],
  );

  async function patchLog(log: MaintenanceLog, body: Record<string, unknown>, okMsg: string) {
    setLoading(true);
    try {
      const res = await fetch(`${API}/maintenance/${log.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.detail ?? "Update failed", "Error");
        return false;
      }
      toast.success(okMsg, "Maintenance updated");
      onRefresh();
      return true;
    } catch {
      toast.error("Could not reach the server.", "Network error");
      return false;
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl gap-0.5 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-all font-semibold whitespace-nowrap ${
                filter === f
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          New Work Log
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
              {logs.length === 0 ? "No maintenance recorded yet" : "Nothing matches this filter"}
            </p>
            <p className="text-sm text-slate-400 mt-1">
              {logs.length === 0 ? "Open a work log when a unit needs repair or servicing." : "Try another status."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[680px]">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Work Log</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Asset</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Reported</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cost</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-slate-900 dark:text-white">{l.title}</p>
                      {l.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1 max-w-xs">{l.description}</p>}
                    </td>
                    <td className="px-4 py-3.5">
                      <Link href={`/equipment/${l.equipment_id}`} className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                        {l.equipment_name ?? `#${l.equipment_id}`}
                      </Link>
                      <p className="text-[11px] font-mono text-slate-400">{l.equipment_serial}</p>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400">
                      {new Date(l.reported_at).toLocaleDateString()}
                      {l.completed_at && (
                        <p className="text-[11px] text-slate-400">done {new Date(l.completed_at).toLocaleDateString()}</p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300">
                      {l.cost ? `KSh ${Number(l.cost).toLocaleString()}` : "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusBadge[l.status]}`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      {l.status === "Open" && (
                        <button
                          disabled={loading}
                          onClick={() => patchLog(l, { status: "In Progress" }, `"${l.title}" marked in progress.`)}
                          className="px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg transition-colors mr-1.5"
                        >
                          Start
                        </button>
                      )}
                      {(l.status === "Open" || l.status === "In Progress") && (
                        <>
                          <button
                            disabled={loading}
                            onClick={() => setCompleteTarget(l)}
                            className="px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-lg transition-colors mr-1.5"
                          >
                            Complete
                          </button>
                          <button
                            disabled={loading}
                            onClick={() => patchLog(l, { status: "Cancelled" }, `"${l.title}" cancelled.`)}
                            className="px-3 py-1.5 text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showNew && (
        <NewLogModal
          equipment={equipment}
          onClose={() => setShowNew(false)}
          onSaved={() => { setShowNew(false); onRefresh(); }}
        />
      )}

      {completeTarget && (
        <CompleteModal
          log={completeTarget}
          loading={loading}
          onClose={() => setCompleteTarget(null)}
          onComplete={async (cost, notes) => {
            const ok = await patchLog(
              completeTarget,
              { status: "Completed", ...(cost ? { cost: Number(cost) } : {}), ...(notes ? { resolution_notes: notes } : {}) },
              `"${completeTarget.title}" completed — unit returned to service.`,
            );
            if (ok) setCompleteTarget(null);
          }}
        />
      )}
    </div>
  );
}

function NewLogModal({
  equipment, onClose, onSaved,
}: {
  equipment: Equipment[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [equipmentId, setEquipmentId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("");
  const [loading, setLoading] = useState(false);

  const eligible = equipment.filter((e) => e.status !== "Retired");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API}/maintenance/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equipment_id: Number(equipmentId),
          title,
          description: description || null,
          cost: cost ? Number(cost) : null,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.detail ?? "Could not open work log", "Error");
        return;
      }
      toast.success("Work log opened — the unit is now out of service.", "Maintenance opened");
      onSaved();
    } catch {
      toast.error("Could not reach the server.", "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl w-full max-w-md animate-fadeIn">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-semibold text-slate-900 dark:text-white">New Maintenance Work Log</h3>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Unit <span className="text-red-500">*</span></label>
            <select
              required
              value={equipmentId}
              onChange={(e) => setEquipmentId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">Select a unit…</option>
              {eligible.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} — {e.serial_number} ({e.status})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">What needs doing? <span className="text-red-500">*</span></label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Replace XLR connector"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Details</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Fault description, parts needed, technician…"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white resize-none focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Estimated cost (KSh)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="optional"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={loading} className="flex-1 py-2.5 text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl transition-colors font-semibold">
              {loading ? "Opening…" : "Open Work Log"}
            </button>
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors font-medium">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CompleteModal({
  log, loading, onClose, onComplete,
}: {
  log: MaintenanceLog;
  loading: boolean;
  onClose: () => void;
  onComplete: (cost: string, notes: string) => void;
}) {
  const [cost, setCost] = useState(log.cost ? String(Number(log.cost)) : "");
  const [notes, setNotes] = useState("");

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl w-full max-w-md animate-fadeIn">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-semibold text-slate-900 dark:text-white">Complete “{log.title}”</h3>
          <p className="text-xs text-slate-400 mt-1">
            The unit returns to the available pool and its inspection date is updated.
          </p>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); onComplete(cost, notes); }}
          className="px-6 py-5 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Final cost (KSh)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="optional"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Resolution notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What was done?"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white resize-none focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={loading} className="flex-1 py-2.5 text-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl transition-colors font-semibold">
              {loading ? "Completing…" : "Mark Completed"}
            </button>
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors font-medium">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
