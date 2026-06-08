"use client";

import { useState } from "react";
import { DeliveryZone } from "@/types";
import { useToast } from "@/app/components/Toast";

const API = process.env.NEXT_PUBLIC_API_URL ?? "/api";

type Draft = {
  name: string; description: string;
  door_fee: string; pickup_fee: string;
  eta_days_min: string; eta_days_max: string; free_over: string;
  is_active: boolean;
};

const empty: Draft = { name: "", description: "", door_fee: "0", pickup_fee: "0", eta_days_min: "1", eta_days_max: "3", free_over: "", is_active: true };

function toDraft(z: DeliveryZone): Draft {
  return {
    name: z.name, description: z.description ?? "",
    door_fee: String(z.door_fee), pickup_fee: String(z.pickup_fee),
    eta_days_min: String(z.eta_days_min), eta_days_max: String(z.eta_days_max),
    free_over: z.free_over != null ? String(z.free_over) : "",
    is_active: z.is_active,
  };
}

export default function DeliveryManager({ zones, onRefresh }: { zones: DeliveryZone[]; onRefresh: () => void }) {
  const { toast } = useToast();
  const [modal, setModal] = useState<{ id?: number; draft: Draft } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeliveryZone | null>(null);
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!modal) return;
    setLoading(true);
    const d = modal.draft;
    const body = {
      name: d.name, description: d.description || null,
      door_fee: Number(d.door_fee || 0), pickup_fee: Number(d.pickup_fee || 0),
      eta_days_min: Number(d.eta_days_min || 0), eta_days_max: Number(d.eta_days_max || 0),
      free_over: d.free_over === "" ? null : Number(d.free_over),
      is_active: d.is_active,
    };
    try {
      const res = await fetch(modal.id ? `${API}/delivery-zones/${modal.id}` : `${API}/delivery-zones/`, {
        method: modal.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { toast.error("Failed to save zone", "Error"); return; }
      toast.success(`Zone ${modal.id ? "updated" : "created"}.`, "Saved");
      setModal(null);
      onRefresh();
    } finally { setLoading(false); }
  }

  async function handleDelete(z: DeliveryZone) {
    setLoading(true);
    try {
      const res = await fetch(`${API}/delivery-zones/${z.id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) { toast.error("Failed to delete", "Error"); return; }
      toast.success(`"${z.name}" deleted.`, "Deleted");
      setDeleteTarget(null);
      onRefresh();
    } finally { setLoading(false); }
  }

  const upd = (k: keyof Draft, v: string | boolean) => setModal((m) => m && { ...m, draft: { ...m.draft, [k]: v } });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{zones.length} zone(s)</p>
        <button onClick={() => setModal({ draft: { ...empty } })} className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          New Zone
        </button>
      </div>

      {zones.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">No delivery zones</p>
          <p className="text-sm text-slate-400 mt-1">Add zones so customers can choose delivery at checkout</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-left text-xs font-semibold text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Zone</th>
                <th className="px-4 py-3">Door</th>
                <th className="px-4 py-3">Pickup</th>
                <th className="px-4 py-3">ETA</th>
                <th className="px-4 py-3">Free over</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {zones.map((z) => (
                <tr key={z.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900 dark:text-white">{z.name}{!z.is_active && <span className="ml-2 text-[10px] uppercase text-slate-400">hidden</span>}</p>
                    {z.description && <p className="text-xs text-slate-400">{z.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">KSh {Number(z.door_fee).toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">KSh {Number(z.pickup_fee).toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{z.eta_days_min}-{z.eta_days_max}d</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{z.free_over != null ? `KSh ${Number(z.free_over).toLocaleString()}` : "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setModal({ id: z.id, draft: toDraft(z) })} className="p-1.5 text-slate-400 hover:text-indigo-600" title="Edit"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                    <button onClick={() => setDeleteTarget(z)} className="p-1.5 text-slate-400 hover:text-red-600" title="Delete"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6" /></svg></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl w-full max-w-md animate-fadeIn max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-semibold text-slate-900 dark:text-white">{modal.id ? "Edit Zone" : "New Zone"}</h3>
              <button onClick={() => setModal(null)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); save(); }} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Zone name <span className="text-red-500">*</span></label>
                <input required value={modal.draft.name} onChange={(e) => upd("name", e.target.value)} placeholder="e.g. Nairobi CBD & Metro" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Description</label>
                <input value={modal.draft.description} onChange={(e) => upd("description", e.target.value)} placeholder="Towns covered (optional)" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Door fee (KSh)</label>
                  <input type="number" min="0" value={modal.draft.door_fee} onChange={(e) => upd("door_fee", e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Pickup fee (KSh)</label>
                  <input type="number" min="0" value={modal.draft.pickup_fee} onChange={(e) => upd("pickup_fee", e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">ETA min (days)</label>
                  <input type="number" min="0" value={modal.draft.eta_days_min} onChange={(e) => upd("eta_days_min", e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">ETA max (days)</label>
                  <input type="number" min="0" value={modal.draft.eta_days_max} onChange={(e) => upd("eta_days_max", e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Free door delivery over (KSh)</label>
                <input type="number" min="0" value={modal.draft.free_over} onChange={(e) => upd("free_over", e.target.value)} placeholder="Leave blank for no free threshold" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm" />
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                <input type="checkbox" checked={modal.draft.is_active} onChange={(e) => upd("is_active", e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-indigo-600" />
                Active (selectable at checkout)
              </label>
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={loading} className="flex-1 py-2.5 text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-semibold">{loading ? "Saving…" : "Save"}</button>
                <button type="button" onClick={() => setModal(null)} className="flex-1 py-2.5 text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl w-full max-w-sm animate-fadeIn">
            <div className="px-6 py-6 text-center">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Delete Zone</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Delete <strong className="text-slate-700 dark:text-slate-300">{deleteTarget.name}</strong>?</p>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => handleDelete(deleteTarget)} disabled={loading} className="flex-1 py-2.5 text-sm bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl font-semibold">{loading ? "Deleting…" : "Delete"}</button>
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
