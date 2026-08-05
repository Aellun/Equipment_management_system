"use client";

import { useState, useMemo } from "react";
import { Product, ShopCategory, Department } from "@/types";
import { useToast } from "@/app/components/Toast";

const API = process.env.NEXT_PUBLIC_API_URL ?? "/api";

function imgSrc(url: string) {
  return url.startsWith("/uploads") ? `${API}${url}` : url;
}

// A generated variant row (created from the options matrix or added manually)
type VariantDraft = {
  variant_name: string;
  price: string;
  stock_qty: string;
  attributes: Record<string, string>;
  image_index: number | null; // index into imageUrls
};

type OptionGroup = { name: string; values: string };

function cartesian(groups: { name: string; values: string[] }[]): Record<string, string>[] {
  if (groups.length === 0) return [];
  return groups.reduce<Record<string, string>[]>(
    (acc, g) => acc.flatMap((combo) => g.values.map((v) => ({ ...combo, [g.name]: v }))),
    [{}],
  );
}

export default function ProductForm({
  categories,
  departments = [],
  initial,
  onClose,
  onSaved,
}: {
  categories: ShopCategory[];
  departments?: Department[];
  initial?: Product;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const isEdit = !!initial;

  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [usageGuide, setUsageGuide] = useState(initial?.usage_guide ?? "");
  const [brand, setBrand] = useState(initial?.brand ?? "");
  const [departmentId, setDepartmentId] = useState<string>(
    initial?.department_id ? String(initial.department_id) : (departments[0] ? String(departments[0].id) : ""),
  );
  const [categoryId, setCategoryId] = useState<string>(
    initial?.shop_category_id ? String(initial.shop_category_id) : "",
  );
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [isGenuine, setIsGenuine] = useState(initial?.is_genuine_guaranteed ?? true);
  const [imageUrls, setImageUrls] = useState<string[]>(initial?.images.map((i) => i.url) ?? []);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  // --- Import from link ---
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);

  async function importFromLink() {
    if (!importUrl.trim()) {
      toast.error("Paste a product page link first.", "No link");
      return;
    }
    setImporting(true);
    try {
      const res = await fetch(`${API}/products/import-from-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: importUrl.trim(), mirror_images: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.detail ?? "Could not read that page.", "Import failed");
        return;
      }
      if (data.name && !name) setName(data.name);
      else if (data.name) setName(data.name);
      if (data.description) setDescription(data.description);
      if (data.brand) setBrand(data.brand);
      if (data.price) setDefaultPrice(String(data.price));
      if (Array.isArray(data.images) && data.images.length) {
        setImageUrls((urls) => [...urls, ...data.images.filter((u: string) => !urls.includes(u))]);
      }
      toast.success(
        `Pre-filled from link${data.images?.length ? ` with ${data.images.length} image(s)` : ""}. Review, set stock, then save.`,
        "Product imported",
      );
    } catch {
      toast.error("Could not reach the server.", "Network error");
    } finally {
      setImporting(false);
    }
  }

  const selectedDept = departments.find((d) => String(d.id) === departmentId);
  const deptLabels = selectedDept?.attribute_labels?.length ? selectedDept.attribute_labels : ["Size", "Colour"];

  // --- Option matrix builder (new products) ---
  const [options, setOptions] = useState<OptionGroup[]>([{ name: deptLabels[0] ?? "Size", values: "" }]);
  const [defaultPrice, setDefaultPrice] = useState("");
  const [defaultStock, setDefaultStock] = useState("");
  const [variants, setVariants] = useState<VariantDraft[]>([]);

  const parsedGroups = useMemo(
    () =>
      options
        .map((o) => ({ name: o.name.trim(), values: o.values.split(",").map((v) => v.trim()).filter(Boolean) }))
        .filter((o) => o.name && o.values.length),
    [options],
  );

  function generateVariants() {
    const combos = cartesian(parsedGroups);
    if (combos.length === 0) {
      // No options → single default variant
      setVariants([{ variant_name: name || "Default", price: defaultPrice, stock_qty: defaultStock, attributes: {}, image_index: null }]);
      return;
    }
    const rows: VariantDraft[] = combos.map((attrs) => ({
      variant_name: Object.values(attrs).join(" / "),
      price: defaultPrice,
      stock_qty: defaultStock,
      attributes: attrs,
      image_index: null,
    }));
    setVariants(rows);
    toast.success(`${rows.length} variant(s) generated.`, "Variants ready");
  }

  function updateVariant(i: number, patch: Partial<VariantDraft>) {
    setVariants((vs) => vs.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  }
  function removeVariant(i: number) {
    setVariants((vs) => vs.filter((_, idx) => idx !== i));
  }

  // --- Images: multi-upload + reorder ---
  async function uploadFiles(files: FileList) {
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(`${API}/uploads/image`, { method: "POST", body: fd });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          toast.error(data.detail ?? "Upload failed", "Image upload failed");
          continue;
        }
        const data = await res.json();
        setImageUrls((urls) => [...urls, data.url]);
      }
    } catch {
      toast.error("Could not reach the server.", "Network error");
    } finally {
      setUploading(false);
    }
  }

  function moveImage(from: number, to: number) {
    if (to < 0 || to >= imageUrls.length) return;
    setImageUrls((urls) => {
      const next = [...urls];
      const [m] = next.splice(from, 1);
      next.splice(to, 0, m);
      return next;
    });
    // shift any variant image_index references
    setVariants((vs) => vs.map((v) => {
      if (v.image_index === null) return v;
      if (v.image_index === from) return { ...v, image_index: to };
      return v;
    }));
  }

  function removeImage(i: number) {
    setImageUrls((urls) => urls.filter((_, idx) => idx !== i));
    setVariants((vs) => vs.map((v) => {
      if (v.image_index === null) return v;
      if (v.image_index === i) return { ...v, image_index: null };
      if (v.image_index > i) return { ...v, image_index: v.image_index - 1 };
      return v;
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (isEdit) {
      setLoading(true);
      try {
        const res = await fetch(`${API}/products/${initial!.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            description: description || null,
            usage_guide: usageGuide || null,
            brand: brand || null,
            department_id: departmentId ? Number(departmentId) : null,
            shop_category_id: categoryId ? Number(categoryId) : null,
            is_active: isActive,
            is_genuine_guaranteed: isGenuine,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          toast.error(data.detail ?? "Failed to update", "Update failed");
          return;
        }
        toast.success(`"${name}" updated.`, "Product updated");
        onSaved();
        onClose();
      } catch {
        toast.error("Could not reach the server.", "Network error");
      } finally {
        setLoading(false);
      }
      return;
    }

    // CREATE
    const rows = variants.length ? variants : [{ variant_name: "Default", price: defaultPrice, stock_qty: defaultStock, attributes: {}, image_index: null }];
    const cleanVariants = rows
      .filter((v) => v.variant_name.trim() && v.price !== "")
      .map((v) => ({
        variant_name: v.variant_name.trim(),
        price: Number(v.price),
        stock_qty: Number(v.stock_qty || 0),
        attributes: Object.keys(v.attributes).length ? v.attributes : null,
        image_index: v.image_index,
      }));

    if (cleanVariants.length === 0) {
      toast.error("Generate at least one variant with a price (set options + default price, then Generate).", "Missing variants");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/products/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || null,
          usage_guide: usageGuide || null,
          brand: brand || null,
          department_id: departmentId ? Number(departmentId) : null,
          shop_category_id: categoryId ? Number(categoryId) : null,
          base_price: cleanVariants[0]?.price ?? 0,
          is_active: isActive,
          is_genuine_guaranteed: isGenuine,
          variants: cleanVariants,
          image_urls: imageUrls,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.detail ?? "Failed to create", "Create failed");
        return;
      }
      toast.success(`"${name}" created with ${cleanVariants.length} variant(s).`, "Product created");
      onSaved();
      onClose();
    } catch {
      toast.error("Could not reach the server.", "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fadeIn">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h3 className="font-semibold text-slate-900">{isEdit ? "Edit Product" : "New Product"}</h3>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {!isEdit && (
            <div className="bg-brand-50/60 border border-brand-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                <p className="text-sm font-semibold text-slate-800">Import from a link</p>
                <span className="text-[10px] font-semibold uppercase tracking-wide bg-brand-100 text-brand-600 px-1.5 py-0.5 rounded">Optional</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); importFromLink(); } }}
                  placeholder="Paste a product page URL (e.g. from a supplier site)…"
                  className="flex-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={importFromLink}
                  disabled={importing}
                  className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors shrink-0 flex items-center gap-2"
                >
                  {importing && (
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  )}
                  {importing ? "Fetching…" : "Import"}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Fetches the name, description, brand, price and photos automatically. Images are copied to your store so they never break.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Product Name <span className="text-red-500">*</span></label>
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Non-stick Frying Pan" className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all" />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Department</label>
              <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all">
                <option value="">— None —</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.icon ? `${d.icon} ` : ""}{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Brand</label>
              <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Tefal (optional)" className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all">
                <option value="">— None —</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer py-2.5">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                Active
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer py-2.5">
                <input type="checkbox" checked={isGenuine} onChange={(e) => setIsGenuine(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                Genuine Guarantee
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
            <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the product…" className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 resize-none focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">How to use &amp; care</label>
            <textarea rows={3} value={usageGuide} onChange={(e) => setUsageGuide(e.target.value)} placeholder="How customers should use / care for this product…" className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 resize-none focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all" />
          </div>

          {/* Images — multi-upload + reorder */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Images</label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files); }}
              className="flex flex-wrap gap-3 p-3 rounded-xl border-2 border-dashed border-slate-200"
            >
              {imageUrls.map((url, i) => (
                <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imgSrc(url)} alt="" className="w-full h-full object-cover" />
                  {i === 0 && <span className="absolute top-0 left-0 bg-brand-600 text-white text-[9px] px-1 rounded-br">Main</span>}
                  <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="button" onClick={() => moveImage(i, i - 1)} className="text-white text-xs px-1" title="Move left">‹</button>
                    <button type="button" onClick={() => removeImage(i)} className="text-white text-xs px-1" title="Remove">✕</button>
                    <button type="button" onClick={() => moveImage(i, i + 1)} className="text-white text-xs px-1" title="Move right">›</button>
                  </div>
                </div>
              ))}
              <label className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-brand-400 transition-colors text-slate-400 text-center">
                {uploading ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>
                    <span className="text-[9px] mt-0.5">add / drop</span>
                  </>
                )}
                <input type="file" accept="image/*" multiple onChange={(e) => e.target.files && uploadFiles(e.target.files)} className="hidden" disabled={uploading} />
              </label>
            </div>
            <p className="text-xs text-slate-400 mt-1">First image is the main photo. Drag files in or click +. Use ‹ › to reorder.</p>
          </div>

          {/* Variants */}
          {isEdit ? (
            <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-500">
              Base details edit here. Add / edit variants, stock and per-variant images from the expandable product row on the list.
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Options → auto-build variants</label>
                <div className="space-y-2">
                  {options.map((o, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2">
                      <input value={o.name} onChange={(e) => setOptions((os) => os.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x))} placeholder="Option (e.g. Colour)" className="col-span-4 bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-sm" />
                      <input value={o.values} onChange={(e) => setOptions((os) => os.map((x, idx) => idx === i ? { ...x, values: e.target.value } : x))} placeholder="Values, comma-separated (Black, Red)" className="col-span-7 bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-sm" />
                      <button type="button" onClick={() => setOptions((os) => os.filter((_, idx) => idx !== i))} disabled={options.length === 1} className="col-span-1 text-slate-400 hover:text-red-500 disabled:opacity-30">✕</button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => setOptions((os) => [...os, { name: deptLabels[os.length] ?? "", values: "" }])} className="text-xs font-semibold text-brand-600 hover:text-brand-500 mt-2">+ Add option</button>
              </div>

              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-4">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Default price</label>
                  <input type="number" min="0" step="0.01" value={defaultPrice} onChange={(e) => setDefaultPrice(e.target.value)} placeholder="1200" className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="col-span-4">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Default stock</label>
                  <input type="number" min="0" value={defaultStock} onChange={(e) => setDefaultStock(e.target.value)} placeholder="10" className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="col-span-4">
                  <button type="button" onClick={generateVariants} className="w-full py-2 bg-brand-500 text-white text-sm font-semibold rounded-lg hover:bg-brand-600">
                    Generate variants
                  </button>
                </div>
              </div>

              {variants.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-slate-100 text-[11px] font-semibold text-slate-500 uppercase">
                    <span className="col-span-4">Variant</span>
                    <span className="col-span-2">Price</span>
                    <span className="col-span-2">Stock</span>
                    <span className="col-span-3">Image</span>
                    <span className="col-span-1"></span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {variants.map((v, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2 px-3 py-2 items-center">
                        <span className="col-span-4 text-sm text-slate-700 truncate">{v.variant_name}</span>
                        <input type="number" min="0" step="0.01" value={v.price} onChange={(e) => updateVariant(i, { price: e.target.value })} className="col-span-2 bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
                        <input type="number" min="0" value={v.stock_qty} onChange={(e) => updateVariant(i, { stock_qty: e.target.value })} className="col-span-2 bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
                        <select value={v.image_index ?? ""} onChange={(e) => updateVariant(i, { image_index: e.target.value === "" ? null : Number(e.target.value) })} className="col-span-3 bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-sm">
                          <option value="">No image</option>
                          {imageUrls.map((_, idx) => <option key={idx} value={idx}>Image {idx + 1}{idx === 0 ? " (main)" : ""}</option>)}
                        </select>
                        <button type="button" onClick={() => removeVariant(i)} className="col-span-1 text-slate-400 hover:text-red-500">✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={loading} className="flex-1 py-2.5 text-sm bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl transition-colors font-semibold">{loading ? "Saving…" : "Save Product"}</button>
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors font-medium">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
