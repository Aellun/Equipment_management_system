import { serverApi } from "@/app/lib/serverApi";
import { MaintenanceLog, Equipment } from "@/types";
import { revalidatePath } from "next/cache";
import MaintenanceManager from "./MaintenanceManager";

const API = process.env.INTERNAL_API_URL ?? "http://localhost:8000";

async function getData() {
  try {
    const [logRes, eqRes] = await Promise.all([
      serverApi(`${API}/maintenance/`, { cache: "no-store" }),
      serverApi(`${API}/equipment/`, { cache: "no-store" }),
    ]);
    return {
      logs: (logRes.ok ? await logRes.json() : []) as MaintenanceLog[],
      equipment: (eqRes.ok ? await eqRes.json() : []) as Equipment[],
    };
  } catch {
    return { logs: [], equipment: [] };
  }
}

async function refresh() {
  "use server";
  revalidatePath("/maintenance");
}

export default async function MaintenancePage() {
  const { logs, equipment } = await getData();

  const open = logs.filter((l) => l.status === "Open").length;
  const inProgress = logs.filter((l) => l.status === "In Progress").length;
  const completed = logs.filter((l) => l.status === "Completed");
  const totalCost = logs
    .filter((l) => l.status !== "Cancelled" && l.cost)
    .reduce((s, l) => s + Number(l.cost), 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Maintenance</h1>
        <p className="text-sm text-slate-500 mt-1">
          Work logs for repairs and servicing. Opening a log pulls the unit out of service;
          completing the last open log returns it automatically.
        </p>
      </div>

      {/* Backlog stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Open", value: open, sub: "awaiting action", tone: open > 0 ? "text-red-600" : "" },
          { label: "In Progress", value: inProgress, sub: "being worked on", tone: "" },
          { label: "Completed", value: completed.length, sub: "all-time repairs", tone: "" },
          { label: "Repair Spend", value: totalCost > 0 ? `KSh ${totalCost.toLocaleString()}` : "—", sub: "recorded costs", tone: "" },
        ].map((c) => (
          <div key={c.label} className="bg-white border border-slate-200 rounded-2xl p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{c.label}</p>
            <p className={`text-3xl font-bold tracking-tight mt-2 ${c.tone || "text-slate-900"}`}>{c.value}</p>
            <p className="text-xs text-slate-400 mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      <MaintenanceManager logs={logs} equipment={equipment} onRefresh={refresh} />
    </div>
  );
}
