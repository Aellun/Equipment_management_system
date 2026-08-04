"use client";

import { useState } from "react";
import { Department } from "@/types";
import { useToast } from "@/app/components/Toast";
import ToggleSwitch from "@/app/components/ToggleSwitch";

const API = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export default function DepartmentsManager({
  departments,
  productCounts = {},
  onRefresh,
}: {
  departments: Department[];
  productCounts?: Record<number, number>;
  onRefresh: () => void;
}) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Department | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  async function toggleActive(d: Department, next: boolean) {
    setTogglingId(d.id);
    try {
      const res = await fetch(`${API}/departments/${d.id}`, {
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
          ? `"${d.name}" is now visible in the storefront.`
          : `"${d.name}" and its products are now hidden from the storefront.`,
        next ? "Department shown" : "Department hidden",
      );
      onRefresh();
    } catch {
      toast.error("Could not reach the server.", "Network error");
    } finally {
      setTogglingId(null);
    }
  }

  async function save(body: Record<string, unknown>, id?: number) {
    setLoading(true);
    try {
      const res = await fetch(id ? `${API}/departments/${id}` : `${API}/departments/`, {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.detail ?? "Failed to save", "Error");
        return;
      }
      toast.success(`Department ${id ? "updated" : "created"}.`, "Saved");
      setShowForm(false); setEditTarget(null);
      onRefresh();
    } catch {
      toast.error("Could not reach the server.", "Network error");
    } finally { setLoading(false); }
  }

  async function handleDelete(d: Department) {
    setLoading(true);
    try {
      const res = await fetch(`${API}/departments/${d.id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) { toast.error("Failed to delete", "Error"); return; }
      toast.success(`"${d.name}" deleted.`, "Deleted");
      setDeleteTarget(null);
      onRefresh();
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 font-medium">{departments.length} department(s)</p>
        <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          New Department
        </button>
      </div>

      {departments.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
          <p className="font-semibold text-slate-700 text-sm">No departments yet</p>
          <p className="text-sm text-slate-400 mt-1">Create one (e.g. Kitchenware) to organise your catalog</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {departments.map((d) => (
            <div key={d.id} className={`bg-white border rounded-2xl p-5 group transition-colors ${d.is_active ? "border-slate-200" : "border-dashed border-slate-300 opacity-75"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 flex items-center gap-2">
                    {d.icon && <span className="text-lg">{d.icon}</span>}{d.name}
                    {!d.is_active && <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Hidden from store</span>}
                  </p>
                  {d.tagline && <p className="text-xs text-slate-500 mt-0.5">{d.tagline}</p>}
                  <p className="text-xs text-slate-400 mt-1">
                    {productCounts[d.id] ?? 0} product{(productCounts[d.id] ?? 0) !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <ToggleSwitch
                    checked={d.is_active}
                    disabled={togglingId === d.id}
                    onChange={(next) => toggleActive(d, next)}
                    label={d.is_active ? "Visible in storefront — click to hide" : "Hidden — click to show in storefront"}
                  />
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditTarget(d)} className="p-2 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50" title="Edit">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => setDeleteTarget(d)} className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50" title="Delete">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              </div>
              {d.attribute_labels && d.attribute_labels.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {d.attribute_labels.map((l) => (
                    <span key={l} className="text-[11px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{l}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {(showForm || editTarget) && (
        <DepartmentModal
          initial={editTarget ?? undefined}
          loading={loading}
          onClose={() => { setShowForm(false); setEditTarget(null); }}
          onSave={(body) => save(body, editTarget?.id)}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-sm animate-fadeIn">
            <div className="px-6 py-6 text-center">
              <h3 className="font-semibold text-slate-900 mb-1">Delete Department</h3>
              <p className="text-sm text-slate-500">Delete <strong className="text-slate-700">{deleteTarget.name}</strong>? Products keep existing but lose this department.</p>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => handleDelete(deleteTarget)} disabled={loading} className="flex-1 py-2.5 text-sm bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl font-semibold">{loading ? "Deleting…" : "Delete"}</button>
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DepartmentModal({
  initial, loading, onClose, onSave,
}: {
  initial?: Department;
  loading: boolean;
  onClose: () => void;
  onSave: (body: Record<string, unknown>) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? "");
  const [tagline, setTagline] = useState(initial?.tagline ?? "");
  const [labels, setLabels] = useState((initial?.attribute_labels ?? []).join(", "));
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      name,
      icon: icon || null,
      tagline: tagline || null,
      attribute_labels: labels.split(",").map((s) => s.trim()).filter(Boolean),
      is_active: isActive,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-md animate-fadeIn">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">{initial ? "Edit Department" : "New Department"}</h3>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Icon</label>
              <input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="🍳" className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-center" />
            </div>
            <div className="col-span-3">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Name <span className="text-red-500">*</span></label>
              <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kitchenware, Clothing" className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Tagline</label>
            <input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Short description for the storefront" className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Variant attribute labels</label>
            <input value={labels} onChange={(e) => setLabels(e.target.value)} placeholder="e.g. Size, Colour, Material" className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm" />
            <p className="text-xs text-slate-400 mt-1">Comma-separated. These become the suggested variant fields (e.g. Clothing → Size, Colour).</p>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-brand-600" />
            Active (shown in storefront)
          </label>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={loading} className="flex-1 py-2.5 text-sm bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl font-semibold">{loading ? "Saving…" : "Save"}</button>
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
