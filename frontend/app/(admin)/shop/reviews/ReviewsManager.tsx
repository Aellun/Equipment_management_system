"use client";

import { useState } from "react";
import { Review } from "@/types";
import { useToast } from "@/app/components/Toast";

const API = process.env.NEXT_PUBLIC_API_URL ?? "/api";

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex text-amber-400">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={13} height={13} viewBox="0 0 20 20" fill={i <= value ? "currentColor" : "none"} stroke="currentColor" className={i <= value ? "" : "text-slate-300 dark:text-slate-600"}>
          <path strokeWidth="1.5" d="M9.05 2.93c.3-.92 1.6-.92 1.9 0l1.36 4.18a1 1 0 00.95.69h4.4c.96 0 1.36 1.23.58 1.8l-3.56 2.58a1 1 0 00-.36 1.12l1.36 4.18c.3.92-.75 1.69-1.54 1.12l-3.56-2.58a1 1 0 00-1.18 0l-3.56 2.58c-.78.57-1.83-.2-1.53-1.12l1.36-4.18a1 1 0 00-.36-1.12L1.4 9.6c-.78-.57-.38-1.8.58-1.8h4.4a1 1 0 00.95-.69L9.05 2.93z" />
        </svg>
      ))}
    </span>
  );
}

export default function ReviewsManager({ reviews, onRefresh }: { reviews: Review[]; onRefresh: () => void }) {
  const { toast } = useToast();
  const [filter, setFilter] = useState<"All" | "Product" | "Store">("All");
  const [busy, setBusy] = useState(false);

  const filtered = filter === "All" ? reviews : reviews.filter((r) => r.review_type === filter);

  async function remove(r: Review) {
    if (!confirm("Delete this review?")) return;
    setBusy(true);
    try {
      const res = await fetch(`${API}/reviews/${r.id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) { toast.error("Failed to delete", "Error"); return; }
      toast.success("Review removed.", "Deleted");
      onRefresh();
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["All", "Product", "Store"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${filter === f ? "bg-brand-600 text-white" : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"}`}>{f}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">No reviews</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div key={r.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Stars value={r.rating} />
                  <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">{r.review_type}</span>
                  {r.verified_purchase && <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">✓ Verified</span>}
                  {r.title && <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{r.title}</span>}
                </div>
                {r.body && <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{r.body}</p>}
                <p className="text-xs text-slate-400 mt-1">{r.reviewer_name} · {new Date(r.created_at).toLocaleDateString()}</p>
              </div>
              <button onClick={() => remove(r)} disabled={busy} className="shrink-0 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" title="Delete">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
