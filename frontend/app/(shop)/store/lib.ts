import { Product } from "@/types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export function imgSrc(url: string) {
  return url.startsWith("/uploads") ? `${API}${url}` : url;
}

export function priceLabel(p: Product) {
  const prices = p.variants.filter((v) => v.is_active).map((v) => Number(v.price));
  if (!prices.length) return `KSh ${Number(p.base_price).toLocaleString()}`;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max
    ? `KSh ${min.toLocaleString()}`
    : `KSh ${min.toLocaleString()} – ${max.toLocaleString()}`;
}

export function minPrice(p: Product) {
  const prices = p.variants.filter((v) => v.is_active).map((v) => Number(v.price));
  return prices.length ? Math.min(...prices) : Number(p.base_price);
}

export function totalStock(p: Product) {
  return p.variants.reduce((s, v) => s + v.stock_qty, 0);
}
