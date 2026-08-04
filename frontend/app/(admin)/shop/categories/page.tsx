import { serverApi } from "@/app/lib/serverApi";
import { ShopCategory, Product } from "@/types";
import { revalidatePath } from "next/cache";
import ShopCategoriesManager from "./ShopCategoriesManager";

const API = process.env.INTERNAL_API_URL ?? "http://localhost:8000";

async function getData() {
  try {
    const [catRes, prodRes] = await Promise.all([
      serverApi(`${API}/shop-categories/`, { cache: "no-store" }),
      serverApi(`${API}/products/`, { cache: "no-store" }),
    ]);
    return {
      categories: (catRes.ok ? await catRes.json() : []) as ShopCategory[],
      products: (prodRes.ok ? await prodRes.json() : []) as Product[],
    };
  } catch {
    return { categories: [], products: [] };
  }
}

async function refresh() {
  "use server";
  revalidatePath("/shop/categories");
}

export default async function ShopCategoriesPage() {
  const { categories, products } = await getData();

  const productCounts: Record<number, number> = {};
  for (const p of products) {
    if (p.shop_category_id != null) {
      productCounts[p.shop_category_id] = (productCounts[p.shop_category_id] ?? 0) + 1;
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Shop Categories</h1>
        <p className="text-sm text-slate-500 mt-1">
          Organise products into browsable categories. Use the switch to show or hide a category —
          hiding it removes it and its products from the storefront until you turn it back on.
        </p>
      </div>
      <ShopCategoriesManager categories={categories} productCounts={productCounts} onRefresh={refresh} />
    </div>
  );
}
