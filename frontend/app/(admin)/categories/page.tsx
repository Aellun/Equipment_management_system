import { serverApi } from "@/app/lib/serverApi";
import { revalidatePath } from "next/cache";
import { Category } from "@/types";
import CategoriesManager from "./CategoriesManager";

const API = process.env.INTERNAL_API_URL ?? "http://localhost:8000";

async function getCategories(): Promise<Category[]> {
  try {
    const res = await serverApi(`${API}/categories/`, { cache: "no-store" });
    return res.ok ? res.json() : [];
  } catch {
    return [];
  }
}

async function refresh() {
  "use server";
  revalidatePath("/categories");
}

export default async function CategoriesPage() {
  const categories = await getCategories();
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Categories</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Organise your equipment inventory into logical groups
        </p>
      </div>
      <CategoriesManager categories={categories} onRefresh={refresh} />
    </div>
  );
}
