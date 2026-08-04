"use client";

import { useState } from "react";
import { Product, ProductVariant, ShopCategory, Department } from "@/types";
import { useToast } from "@/app/components/Toast";
import ProductForm from "./ProductForm";

const API = process.env.NEXT_PUBLIC_API_URL ?? "/api";

function imgSrc(url: string) {
  return url.startsWith("/uploads") ? `${API}${url}` : url;
}

export default function ProductsManager({
  products,
  categories,
  departments = [],
  onRefresh,
}: {
  products: Product[];
  categories: ShopCategory[];
  departments?: Department[];
  onRefresh: () => void;
}) {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const filtered = products.filter((p) =>
    !query || p.name.toLowerCase().includes(query.toLowerCase()),
  );

  function catName(id: number | null) {
    return categories.find((c) => c.id === id)?.name ?? "Uncategorised";
  }

  async function handleDelete(p: Product) {
    setLoading(true);
    try {
      const res = await fetch(`${API}/products/${p.id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        toast.error("Failed to delete product", "Delete failed");
        return;
      }
      setDeleteTarget(null);
      toast.success(`"${p.name}" deleted.`, "Product deleted");
      onRefresh();
    } catch {
      toast.error("Could not reach the server.", "Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handleDuplicate(p: Product) {
    setLoading(true);
    try {
      const res = await fetch(`${API}/products/${p.id}/duplicate`, { method: "POST" });
      if (!res.ok) {
        toast.error("Failed to duplicate product", "Duplicate failed");
        return;
      }
      toast.success(`"${p.name}" duplicated (saved as hidden — review & publish).`, "Product duplicated");
      onRefresh();
    } catch {
      toast.error("Could not reach the server.", "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="relative flex-1 max-w-xs">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products…" className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all" />
        </div>
        <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          New Product
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
          <p className="font-semibold text-slate-700 text-sm">No products yet</p>
          <p className="text-sm text-slate-400 mt-1">Add your first kitchenware product to start selling</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => {
            const totalStock = p.variants.reduce((s, v) => s + v.stock_qty, 0);
            const minPrice = Math.min(...p.variants.map((v) => Number(v.price)), Infinity);
            const isOpen = expanded === p.id;
            return (
              <div key={p.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="flex items-center gap-4 p-4">
                  <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                    {p.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imgSrc(p.images[0].url)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900 truncate">{p.name}</p>
                      {!p.is_active && <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-200 text-slate-500">Hidden</span>}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {catName(p.shop_category_id)} · {p.variants.length} variant(s) · {totalStock} in stock
                      {minPrice !== Infinity && <> · from KSh {minPrice.toLocaleString()}</>}
                    </p>
                  </div>
                  <button onClick={() => setExpanded(isOpen ? null : p.id)} className="p-2 text-slate-400 hover:text-brand-600 transition-colors" title="Variants & stock">
                    <svg className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  <button onClick={() => handleDuplicate(p)} disabled={loading} className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" title="Duplicate">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  </button>
                  <button onClick={() => setEditTarget(p)} className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" title="Edit">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button onClick={() => setDeleteTarget(p)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>

                {isOpen && (
                  <VariantEditor product={p} onRefresh={onRefresh} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <ProductForm categories={categories} departments={departments} onClose={() => setShowForm(false)} onSaved={onRefresh} />
      )}
      {editTarget && (
        <ProductForm categories={categories} departments={departments} initial={editTarget} onClose={() => setEditTarget(null)} onSaved={onRefresh} />
      )}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-sm animate-fadeIn">
            <div className="px-6 py-6 text-center">
              <h3 className="font-semibold text-slate-900 mb-1">Delete Product</h3>
              <p className="text-sm text-slate-500">
                Delete <strong className="text-slate-700">{deleteTarget.name}</strong> and all its variants? This cannot be undone.
              </p>
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

function VariantEditor({ product, onRefresh }: { product: Product; onRefresh: () => void }) {
  const { toast } = useToast();
  const [adding, setAdding] = useState(false);
  const [newV, setNewV] = useState({ variant_name: "", price: "", stock_qty: "" });
  const [busy, setBusy] = useState(false);

  async function saveStock(v: ProductVariant, stock: number, price: number) {
    setBusy(true);
    try {
      const res = await fetch(`${API}/products/variants/${v.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock_qty: stock, price }),
      });
      if (!res.ok) { toast.error("Failed to update variant", "Update failed"); return; }
      toast.success(`${v.variant_name} updated.`, "Variant updated");
      onRefresh();
    } finally { setBusy(false); }
  }

  async function setVariantImage(v: ProductVariant, imageId: number | null) {
    setBusy(true);
    try {
      const res = await fetch(`${API}/products/variants/${v.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_id: imageId }),
      });
      if (!res.ok) { toast.error("Failed to link image", "Update failed"); return; }
      toast.success(`Image linked to ${v.variant_name}.`, "Image linked");
      onRefresh();
    } finally { setBusy(false); }
  }

  async function deleteVariant(v: ProductVariant) {
    setBusy(true);
    try {
      const res = await fetch(`${API}/products/variants/${v.id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) { toast.error("Failed to delete variant", "Delete failed"); return; }
      toast.success(`${v.variant_name} removed.`, "Variant deleted");
      onRefresh();
    } finally { setBusy(false); }
  }

  async function addVariant() {
    if (!newV.variant_name.trim() || newV.price === "") {
      toast.error("Variant name and price are required.", "Missing fields");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${API}/products/${product.id}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variant_name: newV.variant_name.trim(),
          price: Number(newV.price),
          stock_qty: Number(newV.stock_qty || 0),
        }),
      });
      if (!res.ok) { toast.error("Failed to add variant", "Add failed"); return; }
      setNewV({ variant_name: "", price: "", stock_qty: "" });
      setAdding(false);
      toast.success("Variant added.", "Variant added");
      onRefresh();
    } finally { setBusy(false); }
  }

  return (
    <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 space-y-2">
      {product.variants.map((v) => (
        <VariantRow key={v.id} variant={v} images={product.images} busy={busy} onSave={saveStock} onDelete={deleteVariant} onSetImage={setVariantImage} />
      ))}
      {adding ? (
        <div className="grid grid-cols-12 gap-2 items-center pt-1">
          <input value={newV.variant_name} onChange={(e) => setNewV({ ...newV, variant_name: e.target.value })} placeholder="Variant name" className="col-span-5 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm" />
          <input type="number" step="0.01" value={newV.price} onChange={(e) => setNewV({ ...newV, price: e.target.value })} placeholder="Price" className="col-span-3 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm" />
          <input type="number" value={newV.stock_qty} onChange={(e) => setNewV({ ...newV, stock_qty: e.target.value })} placeholder="Stock" className="col-span-2 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm" />
          <button onClick={addVariant} disabled={busy} className="col-span-1 text-brand-600 hover:text-brand-500 text-sm font-semibold">Save</button>
          <button onClick={() => setAdding(false)} className="col-span-1 text-slate-400 hover:text-slate-600 text-sm">✕</button>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="text-xs font-semibold text-brand-600 hover:text-brand-500 pt-1">+ Add variant</button>
      )}
    </div>
  );
}

function VariantRow({
  variant, images, busy, onSave, onDelete, onSetImage,
}: {
  variant: ProductVariant;
  images: { id: number; url: string }[];
  busy: boolean;
  onSave: (v: ProductVariant, stock: number, price: number) => void;
  onDelete: (v: ProductVariant) => void;
  onSetImage: (v: ProductVariant, imageId: number | null) => void;
}) {
  const [stock, setStock] = useState(String(variant.stock_qty));
  const [price, setPrice] = useState(String(variant.price));
  const dirty = stock !== String(variant.stock_qty) || price !== String(variant.price);

  return (
    <div className="grid grid-cols-12 gap-2 items-center text-sm">
      <div className="col-span-3 min-w-0">
        <p className="font-medium text-slate-800 truncate">{variant.variant_name}</p>
        <p className="text-[11px] text-slate-400 font-mono truncate">{variant.sku}</p>
      </div>
      <div className="col-span-2 flex items-center gap-1">
        <span className="text-xs text-slate-400">KSh</span>
        <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-sm" />
      </div>
      <div className="col-span-2">
        <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} className={`w-full border rounded-lg px-2 py-1 text-sm bg-white ${Number(stock) === 0 ? "border-red-300" : "border-slate-300"}`} />
      </div>
      <div className="col-span-3">
        <select
          value={variant.image_id ?? ""}
          onChange={(e) => onSetImage(variant, e.target.value === "" ? null : Number(e.target.value))}
          disabled={busy || images.length === 0}
          className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-sm disabled:opacity-50"
          title="Image shown when this variant is selected"
        >
          <option value="">{images.length ? "No image" : "No images"}</option>
          {images.map((img, idx) => <option key={img.id} value={img.id}>Image {idx + 1}{idx === 0 ? " (main)" : ""}</option>)}
        </select>
      </div>
      <div className="col-span-2 flex justify-end gap-1">
        <button onClick={() => onSave(variant, Number(stock), Number(price))} disabled={busy || !dirty} className="text-xs font-semibold text-brand-600 hover:text-brand-500 disabled:opacity-30">Save</button>
        <button onClick={() => onDelete(variant)} disabled={busy} className="p-1 text-slate-400 hover:text-red-500">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6" /></svg>
        </button>
      </div>
    </div>
  );
}
