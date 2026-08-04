import { serverApi } from "@/app/lib/serverApi";
import { Product, ShopCategory, Department } from "@/types";
import { revalidatePath } from "next/cache";
import ProductsManager from "./ProductsManager";

const API = process.env.INTERNAL_API_URL ?? "http://localhost:8000";

async function getData() {
  try {
    const [prodRes, catRes, deptRes] = await Promise.all([
      serverApi(`${API}/products/`, { cache: "no-store" }),
      serverApi(`${API}/shop-categories/`, { cache: "no-store" }),
      serverApi(`${API}/departments/`, { cache: "no-store" }),
    ]);
    return {
      products: (prodRes.ok ? await prodRes.json() : []) as Product[],
      categories: (catRes.ok ? await catRes.json() : []) as ShopCategory[],
      departments: (deptRes.ok ? await deptRes.json() : []) as Department[],
    };
  } catch {
    return { products: [], categories: [], departments: [] };
  }
}

async function refresh() {
  "use server";
  revalidatePath("/shop/products");
}

export default async function ProductsPage() {
  const { products, categories, departments } = await getData();
  const totalStock = products.reduce(
    (sum, p) => sum + p.variants.reduce((s, v) => s + v.stock_qty, 0),
    0,
  );
  const lowStock = products.filter((p) =>
    p.variants.some((v) => v.stock_qty > 0 && v.stock_qty <= 5),
  ).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Products</h1>
          <p className="text-sm text-slate-500 mt-1">
            {products.length} products · {totalStock} units in stock
            {lowStock > 0 && <span className="text-amber-600"> · {lowStock} low stock</span>}
          </p>
        </div>
      </div>
      <ProductsManager products={products} categories={categories} departments={departments} onRefresh={refresh} />
    </div>
  );
}
