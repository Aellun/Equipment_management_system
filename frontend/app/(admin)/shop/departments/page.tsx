import { Department, Product } from "@/types";
import { revalidatePath } from "next/cache";
import DepartmentsManager from "./DepartmentsManager";

const API = process.env.INTERNAL_API_URL ?? "http://localhost:8000";

async function getData() {
  try {
    const [deptRes, prodRes] = await Promise.all([
      fetch(`${API}/departments/`, { cache: "no-store" }),
      fetch(`${API}/products/`, { cache: "no-store" }),
    ]);
    return {
      departments: (deptRes.ok ? await deptRes.json() : []) as Department[],
      products: (prodRes.ok ? await prodRes.json() : []) as Product[],
    };
  } catch {
    return { departments: [], products: [] };
  }
}

async function refresh() {
  "use server";
  revalidatePath("/shop/departments");
}

export default async function DepartmentsPage() {
  const { departments, products } = await getData();

  const productCounts: Record<number, number> = {};
  for (const p of products) {
    if (p.department_id != null) {
      productCounts[p.department_id] = (productCounts[p.department_id] ?? 0) + 1;
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Departments</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Top-level product lines (e.g. Kitchenware, Clothing). Use the switch to show or hide a
          department — hiding it removes it and all its products from the storefront instantly.
        </p>
      </div>
      <DepartmentsManager departments={departments} productCounts={productCounts} onRefresh={refresh} />
    </div>
  );
}
