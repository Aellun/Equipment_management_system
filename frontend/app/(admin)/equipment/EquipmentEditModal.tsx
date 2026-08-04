"use client";

import { useState } from "react";
import { Equipment, Category } from "@/types";
import { useToast } from "@/app/components/Toast";

const API = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export interface EquipmentGroup {
  name: string;
  category: string;
  total: number;
  available: number;
  out: number;
  maintenance: number;
  retired: number;
  items: Equipment[];
}

export default function EquipmentEditModal({
  group,
  categories,
  onDone,
}: {
  group: EquipmentGroup;
  categories: Category[];
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [tab, setTab] = useState<"details" | "units">("details");
  const [form, setForm] = useState({ name: group.name, category: group.category });
  const [addQty, setAddQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault();
    if (form.name === group.name && form.category === group.category) { onDone(); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/equipment/group`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_name: group.name, new_name: form.name, new_category: form.category }),
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.detail ?? "Update failed", "Error");
        return;
      }
      toast.success(`"${group.name}" updated successfully.`, "Equipment updated");
      onDone();
    } catch {
      toast.error("Could not reach server.", "Network error");
    } finally {
      setLoading(false);
    }
  }

  async function addUnits(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API}/equipment/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: group.name, category: group.category, quantity: addQty }),
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.detail ?? "Failed to add units", "Error");
        return;
      }
      toast.success(`Added ${addQty} unit${addQty > 1 ? "s" : ""} of "${group.name}".`, "Units added");
      setAddQty(1);
      onDone();
    } catch {
      toast.error("Could not reach server.", "Network error");
    } finally {
      setLoading(false);
    }
  }

  async function deleteGroup() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/equipment/group/${encodeURIComponent(group.name)}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.detail ?? "Delete failed", "Error");
        return;
      }
      const data = await res.json();
      toast.success(`Deleted ${data.deleted} available unit${data.deleted !== 1 ? "s" : ""} of "${group.name}".`, "Deleted");
      if (group.out > 0 || group.maintenance > 0) {
        toast.warning(`${group.out + group.maintenance} unit(s) currently out or in maintenance were kept.`, "Some units kept");
      }
      onDone();
    } catch {
      toast.error("Could not reach server.", "Network error");
    } finally {
      setLoading(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white border border-slate-200 rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg animate-slideInUp sm:animate-fadeIn max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="font-semibold text-slate-900">{group.name}</h3>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">{group.category}</span>
              <span className="text-xs text-emerald-600 font-medium">{group.available} available</span>
              {group.out > 0 && <span className="text-xs text-amber-600 font-medium">{group.out} out</span>}
              {group.maintenance > 0 && <span className="text-xs text-red-600 font-medium">{group.maintenance} maintenance</span>}
            </div>
          </div>
          <button onClick={onDone} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-slate-100 shrink-0 px-6">
          {(["details", "units"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors capitalize ${tab === t ? "border-brand-600 text-brand-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
            >
              {t === "details" ? "Edit Details" : `Units (${group.total})`}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {tab === "details" && (
            <form onSubmit={saveDetails} className="flex flex-col h-full">
              <div className="px-6 py-5 space-y-4 flex-1">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Item Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Category <span className="text-red-500">*</span>
                  </label>
                  {categories.length > 0 ? (
                    <select
                      required
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                    >
                      {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  ) : (
                    <input
                      required
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                    />
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wider">Danger Zone</p>
                  {!confirmDelete ? (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      disabled={group.available === 0}
                      className="inline-flex items-center gap-2 px-3.5 py-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete {group.available} available unit{group.available !== 1 ? "s" : ""}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={deleteGroup} disabled={loading} className="px-3.5 py-2 text-sm bg-red-600 hover:bg-red-500 text-white rounded-xl transition-colors font-semibold disabled:opacity-50">
                        {loading ? "Deleting…" : "Confirm delete"}
                      </button>
                      <button type="button" onClick={() => setConfirmDelete(false)} className="px-3.5 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                        Cancel
                      </button>
                    </div>
                  )}
                  {group.available === 0 && (group.out > 0 || group.maintenance > 0) && (
                    <p className="text-xs text-slate-400 mt-2">All units are currently out or in maintenance.</p>
                  )}
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl shrink-0">
                <div className="flex gap-3">
                  <button type="submit" disabled={loading} className="flex-1 py-2.5 text-sm bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl transition-colors font-semibold">
                    {loading ? "Saving…" : "Save Changes"}
                  </button>
                  <button type="button" onClick={onDone} className="flex-1 py-2.5 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors font-medium">
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          )}

          {tab === "units" && (
            <div className="flex flex-col">
              {/* Add more units */}
              <form onSubmit={addUnits} className="px-6 py-4 border-b border-slate-100">
                <p className="text-sm font-medium text-slate-700 mb-3">Add more units</p>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setAddQty(q => Math.max(1, q - 1))} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-lg font-bold flex items-center justify-center transition-colors">−</button>
                  <input type="number" min={1} max={200} value={addQty} onChange={e => setAddQty(Math.max(1, parseInt(e.target.value) || 1))} className="w-16 text-center bg-slate-50 border border-slate-300 rounded-xl px-2 py-2 text-sm text-slate-900 focus:outline-none focus:border-brand-500" />
                  <button type="button" onClick={() => setAddQty(q => Math.min(200, q + 1))} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-lg font-bold flex items-center justify-center transition-colors">+</button>
                  <button type="submit" disabled={loading} className="flex-1 py-2 text-sm bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl transition-colors font-semibold">
                    {loading ? "Adding…" : `Add ${addQty} unit${addQty > 1 ? "s" : ""}`}
                  </button>
                </div>
              </form>

              {/* Individual units list */}
              <div className="divide-y divide-slate-100">
                {group.items.map((item) => (
                  <a
                    key={item.id}
                    href={`/equipment/${item.id}`}
                    className="px-6 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors group/unit"
                  >
                    <div>
                      <span className="text-xs font-mono text-slate-500 group-hover/unit:text-brand-600 transition-colors">{item.serial_number}</span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">View asset profile →</span>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                      item.status === "Available" ? "bg-emerald-100 text-emerald-700" :
                      item.status === "Out" ? "bg-amber-100 text-amber-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {item.status}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
