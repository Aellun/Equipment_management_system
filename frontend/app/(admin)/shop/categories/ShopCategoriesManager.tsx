"use client";

import { useState } from "react";
import { ShopCategory } from "@/types";
import { useToast } from "@/app/components/Toast";
import ToggleSwitch from "@/app/components/ToggleSwitch";

const API = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export default function ShopCategoriesManager({
  categories,
  productCounts = {},
  onRefresh,
}: {
  categories: ShopCategory[];
  productCounts?: Record<number, number>;
  onRefresh: () => void;
}) {
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<ShopCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ShopCategory | null>(null);
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  async function toggleActive(cat: ShopCategory, next: boolean) {
    setTogglingId(cat.id);
    try {
      const res = await fetch(`${API}/shop-categories/${cat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: next }),
      });
      if (!res.ok) {
        toast.error("Could not update visibility.", "Error");
        return;
      }
      toast.success(
        next
          ? `"${cat.name}" is now visible in the storefront.`
          : `"${cat.name}" and its products are now hidden from the storefront.`,
        next ? "Category shown" : "Category hidden",
      );
      onRefresh();
    } catch {
      toast.error("Could not reach the server.", "Network error");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleCreate(name: string, description: string) {
    setLoading(true);
    try {
      const res = await fetch(`${API}/shop-categories/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: description || null }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.detail ?? "Failed to create category", "Create failed");
        return;
      }
      setShowAdd(false);
      toast.success(`Category "${name}" created.`, "Category created");
      onRefresh();
    } catch {
      toast.error("Could not reach the server.", "Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(id: number, name: string, description: string) {
    setLoading(true);
    try {
      const res = await fetch(`${API}/shop-categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: description || null }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.detail ?? "Failed to update category", "Update failed");
        return;
      }
      setEditTarget(null);
      toast.success(`Category "${name}" updated.`, "Category updated");
      onRefresh();
    } catch {
      toast.error("Could not reach the server.", "Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number, name: string) {
    setLoading(true);
    try {
      const res = await fetch(`${API}/shop-categories/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.detail ?? "Failed to delete category", "Delete failed");
        return;
      }
      setDeleteTarget(null);
      toast.success(`Category "${name}" deleted.`, "Category deleted");
      onRefresh();
    } catch {
      toast.error("Could not reach the server.", "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 font-medium">
          {categories.length} {categories.length === 1 ? "category" : "categories"}
        </p>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 active:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Category
        </button>
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
          <p className="font-semibold text-slate-700 text-sm">No categories yet</p>
          <p className="text-sm text-slate-400 mt-1">Add one to organise your store products</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className={`bg-white border rounded-2xl p-5 flex items-start justify-between gap-3 group transition-all ${cat.is_active ? "border-slate-200 hover:border-brand-300" : "border-dashed border-slate-300 opacity-75"}`}
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900 truncate flex items-center gap-2">
                  {cat.name}
                  {!cat.is_active && <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 shrink-0">Hidden</span>}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  /{cat.slug} · {productCounts[cat.id] ?? 0} product{(productCounts[cat.id] ?? 0) !== 1 ? "s" : ""}
                </p>
                <p className="text-sm text-slate-500 mt-2 line-clamp-2 min-h-[2.5rem]">
                  {cat.description || <span className="italic text-slate-400">No description</span>}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <ToggleSwitch
                  checked={cat.is_active}
                  disabled={togglingId === cat.id}
                  onChange={(next) => toggleActive(cat, next)}
                  label={cat.is_active ? "Visible in storefront — click to hide" : "Hidden — click to show in storefront"}
                />
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setEditTarget(cat)} className="p-2 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors" title="Edit">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button onClick={() => setDeleteTarget(cat)} className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <CategoryModal title="New Category" loading={loading} onClose={() => setShowAdd(false)} onSubmit={(n, d) => handleCreate(n, d)} />
      )}
      {editTarget && (
        <CategoryModal title="Edit Category" initial={editTarget} loading={loading} onClose={() => setEditTarget(null)} onSubmit={(n, d) => handleUpdate(editTarget.id, n, d)} />
      )}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-sm animate-fadeIn">
            <div className="px-6 py-6 text-center">
              <h3 className="font-semibold text-slate-900 mb-1">Delete Category</h3>
              <p className="text-sm text-slate-500">
                Delete <strong className="text-slate-700">{deleteTarget.name}</strong>? Products keep existing but lose this category.
              </p>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => handleDelete(deleteTarget.id, deleteTarget.name)} disabled={loading} className="flex-1 py-2.5 text-sm bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl transition-colors font-semibold">
                {loading ? "Deleting…" : "Delete"}
              </button>
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors font-medium">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryModal({
  title, initial, loading, onClose, onSubmit,
}: {
  title: string;
  initial?: ShopCategory;
  loading: boolean;
  onClose: () => void;
  onSubmit: (name: string, description: string) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-md animate-fadeIn">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(name, description); }} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Name <span className="text-red-500">*</span></label>
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cookware, Cutlery, Bakeware" className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
            <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional…" className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 resize-none transition-all" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={loading} className="flex-1 py-2.5 text-sm bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl transition-colors font-semibold">{loading ? "Saving…" : "Save"}</button>
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors font-medium">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
