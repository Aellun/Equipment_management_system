import { Equipment, Category } from "@/types";
import { revalidatePath } from "next/cache";
import AddEquipmentForm from "./AddEquipmentForm";
import EquipmentList from "./EquipmentList";

const API = process.env.INTERNAL_API_URL ?? "http://localhost:8000";

async function getData() {
  try {
    const [eqRes, catRes] = await Promise.all([
      fetch(`${API}/equipment/`, { cache: "no-store" }),
      fetch(`${API}/categories/`, { cache: "no-store" }),
    ]);
    return {
      equipment: (eqRes.ok ? await eqRes.json() : []) as Equipment[],
      categories: (catRes.ok ? await catRes.json() : []) as Category[],
    };
  } catch {
    return { equipment: [], categories: [] };
  }
}

async function refresh() {
  "use server";
  revalidatePath("/equipment");
}

export default async function EquipmentPage() {
  const { equipment, categories } = await getData();

  const counts = {
    Available: equipment.filter((e) => e.status === "Available").length,
    Out: equipment.filter((e) => e.status === "Out").length,
    Maintenance: equipment.filter((e) => e.status === "Maintenance").length,
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Equipment</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {equipment.length} items · {counts.Available} available · {counts.Out} out · {counts.Maintenance} in maintenance
          </p>
        </div>
        <AddEquipmentForm categories={categories} onAdded={refresh} />
      </div>
      <EquipmentList equipment={equipment} categories={categories} onRefresh={refresh} />
    </div>
  );
}
