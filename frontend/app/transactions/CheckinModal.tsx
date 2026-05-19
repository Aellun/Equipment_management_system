"use client";

import { useState } from "react";
import { ConditionOnReturn } from "@/types";
import { useToast } from "@/app/components/Toast";

const API = process.env.NEXT_PUBLIC_API_URL ?? "/api";

const conditions: ConditionOnReturn[] = ["Good", "Damaged", "Needs Repair"];

const conditionConfig: Record<ConditionOnReturn, { active: string; label: string; icon: string }> = {
  Good: {
    active: "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
    label: "Good",
    icon: "✓",
  },
  Damaged: {
    active: "border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
    label: "Damaged",
    icon: "✗",
  },
  "Needs Repair": {
    active: "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
    label: "Needs Repair",
    icon: "⚠",
  },
};

export default function CheckinModal({
  transactionId,
  equipmentName,
  onDone,
}: {
  transactionId: number;
  equipmentName: string;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [condition, setCondition] = useState<ConditionOnReturn>("Good");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  function handleOpen() {
    setOpen(true);
    setCondition("Good");
    setNotes("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API}/transactions/checkin/${transactionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ condition_on_return: condition, notes: notes || null }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.detail ?? "Check-in failed. Please try again.", "Check-in failed");
        return;
      }
      setOpen(false);
      const toMaint = condition !== "Good";
      toast.success(
        toMaint
          ? `"${equipmentName}" returned and moved to Maintenance.`
          : `"${equipmentName}" returned in good condition.`,
        "Equipment returned"
      );
      if (toMaint) {
        toast.warning(`"${equipmentName}" has been flagged for maintenance review.`, "Maintenance required");
      }
      onDone();
    } catch {
      toast.error("Could not reach the server. Check your connection.", "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors font-semibold"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
        Check In
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-sm animate-slideInUp sm:animate-fadeIn max-h-[90vh] sm:max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Return Equipment</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-[220px]">
                  {equipmentName}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={submit} className="flex-1 overflow-y-auto">
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Condition on return <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {conditions.map((c) => {
                      const cfg = conditionConfig[c];
                      const isSelected = condition === c;
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setCondition(c)}
                          className={`py-2.5 text-xs rounded-xl border-2 transition-all font-semibold ${
                            isSelected
                              ? cfg.active
                              : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
                          }`}
                        >
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
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
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none transition-all"
                  />
                </div>

                {condition !== "Good" && (
                  <div className="flex items-start gap-2.5 text-xs bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 rounded-xl px-3.5 py-3">
                    <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="text-amber-700 dark:text-amber-400">
                      Equipment status will be set to <strong>Maintenance</strong> and removed from the available pool.
                    </span>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl">
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors font-semibold"
                  >
                    {loading ? "Processing…" : "Confirm Return"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex-1 py-2.5 text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
