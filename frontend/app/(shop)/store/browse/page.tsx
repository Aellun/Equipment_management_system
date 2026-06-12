import { Product, ShopCategory, Department } from "@/types";
import BrowseClient from "./BrowseClient";

const API = process.env.INTERNAL_API_URL ?? "http://localhost:8000";

async function getData() {
  try {
    const [prodRes, catRes, deptRes] = await Promise.all([
      fetch(`${API}/shop/products`, { cache: "no-store" }),
      fetch(`${API}/shop/categories`, { cache: "no-store" }),
      fetch(`${API}/shop/departments`, { cache: "no-store" }),
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

export const metadata = { title: "Browse Products" };

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; dept?: string; cat?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const { products, categories, departments } = await getData();

  return (
    <BrowseClient
      products={products}
      categories={categories}
      departments={departments}
      initialQuery={params.q ?? ""}
      initialDept={params.dept ?? ""}
      initialCat={params.cat ?? ""}
      initialSort={params.sort ?? "featured"}
    />
  );
}
