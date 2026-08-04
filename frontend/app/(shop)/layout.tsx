import StoreProvider from "./store/StoreProvider";
import StoreHeader from "./store/StoreHeader";
import StoreFooter from "./store/StoreFooter";
import { Department, ShopCategory } from "@/types";

const API = process.env.INTERNAL_API_URL ?? "http://localhost:8000";

async function getChrome() {
  try {
    const [setRes, deptRes, catRes] = await Promise.all([
      fetch(`${API}/shop/settings`, { next: { revalidate: 60 } }),
      fetch(`${API}/shop/departments`, { next: { revalidate: 60 } }),
      fetch(`${API}/shop/categories`, { next: { revalidate: 60 } }),
    ]);
    return {
      settings: (setRes.ok ? await setRes.json() : {}) as Record<string, string>,
      departments: (deptRes.ok ? await deptRes.json() : []) as Department[],
      categories: (catRes.ok ? await catRes.json() : []) as ShopCategory[],
    };
  } catch {
    return { settings: {}, departments: [], categories: [] };
  }
}

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const { settings, departments, categories } = await getChrome();
  const storeName = settings.store_name || "Ahadi Store";

  return (
    <StoreProvider>
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <StoreHeader storeName={storeName} departments={departments} categories={categories} />
        <main className="flex-1">{children}</main>
        <StoreFooter storeName={storeName} departments={departments} />
      </div>
    </StoreProvider>
  );
}
