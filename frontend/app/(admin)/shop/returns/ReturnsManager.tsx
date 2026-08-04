"use client";

import { useState } from "react";
import { ReturnRequest, ReturnStatus } from "@/types";
import { useToast } from "@/app/components/Toast";

const API = process.env.NEXT_PUBLIC_API_URL ?? "/api";

const STATUSES: ReturnStatus[] = ["Requested", "Approved", "Rejected", "Refunded"];

const color: Record<ReturnStatus, string> = {
  Requested: "bg-amber-100 text-amber-700",
  Approved: "bg-blue-100 text-blue-700",
  Rejected: "bg-red-100 text-red-700",
  Refunded: "bg-emerald-100 text-emerald-700",
};

export default function ReturnsManager({ returns, onRefresh }: { returns: ReturnRequest[]; onRefresh: () => void }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  async function patch(r: ReturnRequest, body: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch(`${API}/returns/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { toast.error("Failed to update", "Error"); return; }
      toast.success("Return updated.", "Saved");
      onRefresh();
    } finally { setBusy(false); }
  }

  if (returns.length === 0) {
    return (
      <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
        <p className="font-semibold text-slate-700 text-sm">No return requests</p>
        <p className="text-sm text-slate-400 mt-1">Requests customers submit from the order tracking page appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {returns.map((r) => (
        <div key={r.id} className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="font-mono font-semibold text-slate-900 text-sm">{r.order_number ?? `Order #${r.order_id}`}</p>
              <p className="text-xs text-slate-400 mt-0.5">{r.contact_email} · {new Date(r.created_at).toLocaleDateString()}</p>
            </div>
            <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${color[r.status]}`}>{r.status}</span>
          </div>
          <p className="text-sm text-slate-700 mt-2"><strong>Reason:</strong> {r.reason}</p>
          {r.details && <p className="text-sm text-slate-500 mt-1">{r.details}</p>}
          <div className="flex items-center gap-2 mt-3">
            <label className="text-xs font-semibold text-slate-400 uppercase">Status</label>
            <select value={r.status} disabled={busy} onChange={(e) => patch(r, { status: e.target.value })} className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-sm">
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      ))}
    </div>
  );
}
