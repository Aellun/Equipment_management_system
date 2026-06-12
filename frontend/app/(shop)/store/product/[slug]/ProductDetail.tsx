"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Product } from "@/types";
import { useStore } from "../../StoreProvider";
import { useToast } from "@/app/components/Toast";
import { Stars } from "../../Stars";
import ProductReviews from "./ProductReviews";

const API = process.env.NEXT_PUBLIC_API_URL ?? "/api";

function imgSrc(url: string) {
  return url.startsWith("/uploads") ? `${API}${url}` : url;
}

export default function ProductDetail({ product }: { product: Product }) {
  const { addToCart } = useStore();
  const { toast } = useToast();
  const router = useRouter();

  const activeVariants = product.variants.filter((v) => v.is_active);
  const initialVariant = activeVariants.find((v) => v.stock_qty > 0) ?? activeVariants[0] ?? null;
  const [variantId, setVariantId] = useState<number | null>(initialVariant?.id ?? null);
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(() => {
    if (initialVariant?.image_id != null) {
      const idx = product.images.findIndex((img) => img.id === initialVariant.image_id);
      if (idx >= 0) return idx;
    }
    return 0;
  });
  const [adding, setAdding] = useState(false);

  const variant = activeVariants.find((v) => v.id === variantId) ?? null;
  const inStock = variant ? variant.stock_qty > 0 : false;
  const maxQty = variant?.stock_qty ?? 0;

  // When a variant is picked, switch the main photo to its linked image (if any)
  function selectVariant(vId: number) {
    setVariantId(vId);
    setQty(1);
    const v = activeVariants.find((x) => x.id === vId);
    if (v?.image_id != null) {
      const idx = product.images.findIndex((img) => img.id === v.image_id);
      if (idx >= 0) setActiveImg(idx);
    }
  }

  async function handleAdd(goToCart: boolean) {
    if (!variant) return;
    setAdding(true);
    const ok = await addToCart(variant.id, qty);
    setAdding(false);
    if (ok) {
      toast.success(`${product.name} (${variant.variant_name}) added to cart.`, "Added to cart");
      if (goToCart) router.push("/store/cart");
    } else {
      toast.error("Could not add to cart. Stock may have changed.", "Add failed");
    }
  }

  return (
    <div>
      <Link href="/store" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-orange-600 mb-6 transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Back to shop
      </Link>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Images */}
        <div>
          <div className="aspect-square bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden flex items-center justify-center">
            {product.images[activeImg] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imgSrc(product.images[activeImg].url)} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <svg className="w-20 h-20 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-2 mt-3">
              {product.images.map((img, i) => (
                <button key={img.id} onClick={() => setActiveImg(i)} className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors ${i === activeImg ? "border-orange-500" : "border-slate-200 dark:border-slate-800"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imgSrc(img.url)} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          {product.brand && <p className="text-xs font-semibold uppercase tracking-wide text-orange-500 mb-1">{product.brand}</p>}
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{product.name}</h1>

          {/* Rating summary */}
          {product.review_count > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <Stars value={product.avg_rating ?? 0} size={16} />
              <span className="text-sm text-slate-500">{product.avg_rating?.toFixed(1)} · {product.review_count} review(s)</span>
            </div>
          )}

          {variant && (
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-3">
              KSh {Number(variant.price).toLocaleString()}
            </p>
          )}

          {/* Genuine Guarantee trust badge */}
          {product.is_genuine_guaranteed && (
            <div className="flex items-center gap-2 mt-3 text-sm bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-xl px-3 py-2 w-fit">
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              <span className="font-semibold">Genuine Guarantee</span>
              <span className="text-emerald-600/80 dark:text-emerald-500">— authentic or your money back</span>
            </div>
          )}

          {product.description && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-4 leading-relaxed whitespace-pre-line">{product.description}</p>
          )}

          {/* Variant picker */}
          <div className="mt-6">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Options</p>
            <div className="flex flex-wrap gap-2">
              {activeVariants.map((v) => {
                const selected = v.id === variantId;
                const oos = v.stock_qty === 0;
                return (
                  <button
                    key={v.id}
                    onClick={() => selectVariant(v.id)}
                    disabled={oos}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                      selected
                        ? "border-orange-600 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300"
                        : oos
                        ? "border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-600 line-through cursor-not-allowed"
                        : "border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-orange-400"
                    }`}
                  >
                    {v.variant_name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantity + actions */}
          <div className="mt-6">
            {variant && (
              <p className={`text-sm font-medium mb-3 ${inStock ? "text-emerald-600" : "text-red-500"}`}>
                {inStock ? `${variant.stock_qty} in stock` : "Out of stock"}
              </p>
            )}
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={!inStock} className="px-3 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30">−</button>
                <span className="px-4 py-2 text-sm font-medium min-w-[3rem] text-center">{qty}</span>
                <button onClick={() => setQty((q) => Math.min(maxQty, q + 1))} disabled={!inStock || qty >= maxQty} className="px-3 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30">+</button>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button onClick={() => handleAdd(false)} disabled={!inStock || adding} className="flex-1 py-3 bg-white dark:bg-slate-900 border-2 border-orange-600 text-orange-600 dark:text-orange-400 font-semibold rounded-xl hover:bg-orange-50 dark:hover:bg-orange-900/20 disabled:opacity-50 transition-colors">
                {adding ? "Adding…" : "Add to cart"}
              </button>
              <button onClick={() => handleAdd(true)} disabled={!inStock || adding} className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-xl disabled:opacity-50 transition-colors">
                Buy now
              </button>
            </div>
          </div>

          {variant?.attributes && Object.keys(variant.attributes).length > 0 && (
            <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-4">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Specifications</p>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(variant.attributes).map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-slate-50 dark:border-slate-800/50 py-1">
                    <dt className="text-slate-400 capitalize">{k}</dt>
                    <dd className="text-slate-700 dark:text-slate-300 font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* How to use / care guide */}
          {product.usage_guide && (
            <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-4">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                How to use &amp; care
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">{product.usage_guide}</p>
            </div>
          )}
        </div>
      </div>

      {/* Reviews */}
      <ProductReviews productId={product.id} />
    </div>
  );
}
