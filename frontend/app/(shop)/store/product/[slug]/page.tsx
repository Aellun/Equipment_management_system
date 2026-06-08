import { Product } from "@/types";
import { notFound } from "next/navigation";
import ProductDetail from "./ProductDetail";

const API = process.env.INTERNAL_API_URL ?? "http://localhost:8000";

async function getProduct(slug: string): Promise<Product | null> {
  try {
    const res = await fetch(`${API}/shop/products/${slug}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as Product;
  } catch {
    return null;
  }
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <ProductDetail product={product} />
    </div>
  );
}
