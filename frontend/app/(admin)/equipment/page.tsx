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

function StatCard({
  label, value, sub, icon, accent,
}: {
  label: string;
  value: number | string;
  sub: string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-3.5">
      <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${accent}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-none">{value}</p>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">{label}</p>
        <p className="text-[11px] text-slate-400 dark:text-slate-500">{sub}</p>
      </div>
    </div>
  );
}

export default async function EquipmentPage() {
  const { equipment, categories } = await getData();

  const counts = {
    Available: equipment.filter((e) => e.status === "Available").length,
    Out: equipment.filter((e) => e.status === "Out").length,
    Maintenance: equipment.filter((e) => e.status === "Maintenance").length,
  };
  const totalValue = equipment.reduce((s, e) => s + (e.purchase_cost ? Number(e.purchase_cost) : 0), 0);
  const distinctItems = new Set(equipment.map((e) => e.name)).size;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Equipment Register</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {distinctItems} item type{distinctItems !== 1 ? "s" : ""} · {equipment.length} physical unit{equipment.length !== 1 ? "s" : ""} — click a row to see its units, click a unit to open its asset profile
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL ?? "/api"}/equipment/export.csv`}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold rounded-xl hover:border-brand-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Export CSV
          </a>
          <AddEquipmentForm categories={categories} onAdded={refresh} />
        </div>
      </div>

      {/* Register stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Available"
          value={counts.Available}
          sub="ready for checkout"
          accent="bg-emerald-100 dark:bg-emerald-900/40"
          icon={<svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          label="On Loan"
          value={counts.Out}
          sub="checked out to clients"
          accent="bg-amber-100 dark:bg-amber-900/40"
          icon={<svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>}
        />
        <StatCard
          label="In Maintenance"
          value={counts.Maintenance}
          sub="out of service"
          accent="bg-red-100 dark:bg-red-900/40"
          icon={<svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
        />
        <StatCard
          label="Asset Value"
          value={totalValue > 0 ? `KSh ${totalValue.toLocaleString()}` : "—"}
          sub="sum of recorded purchase costs"
          accent="bg-brand-100 dark:bg-brand-900/40"
          icon={<svg className="w-5 h-5 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
      </div>

      <EquipmentList equipment={equipment} categories={categories} onRefresh={refresh} />
    </div>
  );
}
