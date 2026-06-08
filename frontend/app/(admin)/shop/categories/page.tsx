import { ShopCategory } from "@/types";
import { revalidatePath } from "next/cache";
import ShopCategoriesManager from "./ShopCategoriesManager";

const API = process.env.INTERNAL_API_URL ?? "http://localhost:8000";

async function getData() {
  try {
    const res = await fetch(`${API}/shop-categories/`, { cache: "no-store" });
    return (res.ok ? await res.json() : []) as ShopCategory[];
  } catch {
    return [];
  }
}

async function refresh() {
  "use server";
  revalidatePath("/shop/categories");
}

export default async function ShopCategoriesPage() {
  const categories = await getData();
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Shop Categories</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Organise your store products into browsable categories
        </p>
      </div>
      <ShopCategoriesManager categories={categories} onRefresh={refresh} />
    </div>
  );
}
