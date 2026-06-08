import { Department } from "@/types";
import { revalidatePath } from "next/cache";
import DepartmentsManager from "./DepartmentsManager";

const API = process.env.INTERNAL_API_URL ?? "http://localhost:8000";

async function getData() {
  try {
    const res = await fetch(`${API}/departments/`, { cache: "no-store" });
    return (res.ok ? await res.json() : []) as Department[];
  } catch {
    return [];
  }
}

async function refresh() {
  "use server";
  revalidatePath("/shop/departments");
}

export default async function DepartmentsPage() {
  const departments = await getData();
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Departments</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Top-level product lines (e.g. Kitchenware, Clothing). Each department defines the variant
          attribute labels its products use — add a new department to expand into a new market without code changes.
        </p>
      </div>
      <DepartmentsManager departments={departments} onRefresh={refresh} />
    </div>
  );
}
