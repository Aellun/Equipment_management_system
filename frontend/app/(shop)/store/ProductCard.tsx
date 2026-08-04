import Link from "next/link";
import { Product } from "@/types";
import { Stars } from "./Stars";
import { imgSrc, priceLabel, totalStock } from "./lib";

export default function ProductCard({ product: p }: { product: Product }) {
  const stock = totalStock(p);
  const variantCount = p.variants.filter((v) => v.is_active).length;

  return (
    <Link
      href={`/store/product/${p.slug}`}
      className="group bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-lg hover:border-orange-300 hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="relative aspect-square bg-slate-100 overflow-hidden flex items-center justify-center">
        {p.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgSrc(p.images[0].url)}
            alt={p.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )}
        {stock === 0 && (
          <span className="absolute inset-x-0 bottom-0 bg-slate-900/70 text-white text-[11px] font-semibold text-center py-1">
            Out of stock
          </span>
        )}
        {p.is_genuine_guaranteed && stock > 0 && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 bg-emerald-600/90 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4" /></svg>
            Genuine
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="text-[15px] font-bold text-slate-900 leading-snug">{priceLabel(p)}</p>
        <p className="text-[13px] text-slate-600 line-clamp-2 mt-1 leading-snug min-h-[2.4em]">
          {p.name}
        </p>
        <div className="flex items-center gap-1 mt-1.5 min-h-[16px]">
          {p.review_count > 0 ? (
            <>
              <Stars value={p.avg_rating ?? 0} size={12} />
              <span className="text-[11px] text-slate-400">
                {(p.avg_rating ?? 0).toFixed(1)} ({p.review_count})
              </span>
            </>
          ) : (
            <span className="text-[11px] text-slate-400">No reviews yet</span>
          )}
        </div>
        <div className="flex items-center justify-between mt-1.5 text-[11px]">
          <span className="text-slate-400">
            {variantCount > 1 ? `${variantCount} options` : p.brand ?? ""}
          </span>
          {stock > 0 && stock <= 5 ? (
            <span className="text-amber-600 font-semibold">Only {stock} left</span>
          ) : stock > 0 ? (
            <span className="text-emerald-600 font-medium">In stock</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
