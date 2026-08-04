"use client";

import { useState } from "react";
import { Category } from "@/types";
import { useToast } from "@/app/components/Toast";

const API = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export default function AddEquipmentForm({
  categories,
  onAdded,
}: {
  categories: Category[];
  onAdded: () => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", category: "", quantity: 1 });
  const [asset, setAsset] = useState({ location: "", purchase_date: "", purchase_cost: "", supplier: "", warranty_expiry: "", notes: "" });
  const [showAsset, setShowAsset] = useState(false);
  const [loading, setLoading] = useState(false);

  function resetAndClose() {
    setForm({ name: "", category: "", quantity: 1 });
    setAsset({ location: "", purchase_date: "", purchase_cost: "", supplier: "", warranty_expiry: "", notes: "" });
    setShowAsset(false);
    setOpen(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API}/equipment/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          location: asset.location || null,
          purchase_date: asset.purchase_date || null,
          purchase_cost: asset.purchase_cost ? Number(asset.purchase_cost) : null,
          supplier: asset.supplier || null,
          warranty_expiry: asset.warranty_expiry || null,
          notes: asset.notes || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.detail ?? "Failed to add equipment", "Add failed");
        return;
      }
      const created: { id: number }[] = await res.json();
      toast.success(
        `Added ${created.length} ${created.length === 1 ? "unit" : "units"} of "${form.name}" — serial numbers auto-generated.`,
        "Equipment added"
      );
      setForm({ name: "", category: form.category, quantity: 1 });
      onAdded();
    } catch {
      toast.error("Could not reach the server. Check your connection.", "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 active:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Equipment
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md animate-slideInUp sm:animate-fadeIn max-h-[90vh] sm:max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <h3 className="font-semibold text-slate-900">Add Equipment</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set quantity to add multiple units at once
                </p>
              </div>
              <button
                onClick={resetAndClose}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={submit} className="flex-1 overflow-y-auto">
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Item Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    placeholder="e.g. Shure SM58 Microphone"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
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
                      <option value="">Select a category…</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      required
                      placeholder="No categories yet — go to Categories first"
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, quantity: Math.max(1, f.quantity - 1) }))}
                      className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xl font-bold flex items-center justify-center transition-colors"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={200}
                      required
                      value={form.quantity}
                      onChange={(e) => setForm({ ...form, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="w-20 text-center bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, quantity: Math.min(200, f.quantity + 1) }))}
                      className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xl font-bold flex items-center justify-center transition-colors"
                    >
                      +
                    </button>
                    <span className="text-xs text-slate-400">
                      {form.quantity === 1 ? "item" : "items"} will be created
                    </span>
                  </div>
                </div>

                {/* Asset register (optional) */}
                <div className="border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAsset((s) => !s)}
                    className="flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-500"
                  >
                    <svg className={`w-3.5 h-3.5 transition-transform ${showAsset ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                    Asset details (location, purchase info) — optional
                  </button>
                  {showAsset && (
                    <div className="mt-3 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Storage location</label>
                          <input
                            value={asset.location}
                            onChange={(e) => setAsset({ ...asset, location: e.target.value })}
                            placeholder="e.g. Store Room B, Shelf 3"
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Purchase date</label>
                          <input
                            type="date"
                            value={asset.purchase_date}
                            onChange={(e) => setAsset({ ...asset, purchase_date: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Supplier</label>
                          <input
                            value={asset.supplier}
                            onChange={(e) => setAsset({ ...asset, supplier: e.target.value })}
                            placeholder="e.g. SoundHub Ltd"
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Warranty until</label>
                          <input
                            type="date"
                            value={asset.warranty_expiry}
                            onChange={(e) => setAsset({ ...asset, warranty_expiry: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Purchase cost per unit (KSh)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={asset.purchase_cost}
                          onChange={(e) => setAsset({ ...asset, purchase_cost: e.target.value })}
                          placeholder="e.g. 12500"
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Notes</label>
                        <textarea
                          rows={2}
                          value={asset.notes}
                          onChange={(e) => setAsset({ ...asset, notes: e.target.value })}
                          placeholder="Supplier, warranty, condition remarks…"
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 resize-none focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 text-sm bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors font-semibold"
                  >
                    {loading ? "Adding…" : `Add ${form.quantity} ${form.quantity === 1 ? "Item" : "Items"}`}
                  </button>
                  <button
                    type="button"
                    onClick={resetAndClose}
                    className="flex-1 py-2.5 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors font-medium"
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
