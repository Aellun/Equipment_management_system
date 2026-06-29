import { Equipment, Transaction } from "@/types";
import {
  ActivityChart, CategoryBreakdown, TopClients,
  DayActivity, CategoryRow, ClientRow,
} from "../DashboardCharts";

const API = process.env.INTERNAL_API_URL ?? "http://localhost:8000";

async function getEquipment(): Promise<Equipment[]> {
  try {
    const res = await fetch(`${API}/equipment/`, { cache: "no-store" });
    return res.ok ? res.json() : [];
  } catch {
    return [];
  }
}

async function getTransactions(): Promise<Transaction[]> {
  try {
    const res = await fetch(`${API}/transactions/`, { cache: "no-store" });
    return res.ok ? res.json() : [];
  } catch {
    return [];
  }
}

function StatCard({
  label,
  value,
  sublabel,
  accent,
  icon,
}: {
  label: string;
  value: number | string;
  sublabel?: string;
  accent: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
          {label}
        </p>
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent}`}>
          {icon}
        </span>
      </div>
      <div>
        <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{value}</p>
        {sublabel && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{sublabel}</p>
        )}
      </div>
    </div>
  );
}

function UtilisationRing({ percent }: { percent: number }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col gap-3">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
        Utilisation
      </p>
      <div className="flex items-center gap-4">
        <div className="relative inline-flex items-center justify-center">
          <svg width={70} height={70} className="-rotate-90">
            <circle cx={35} cy={35} r={r} fill="none" stroke="currentColor" strokeWidth={8} className="text-slate-100 dark:text-slate-800" />
            <circle
              cx={35} cy={35} r={r} fill="none"
              stroke="#6366f1" strokeWidth={8}
              strokeDasharray={circ} strokeDashoffset={offset}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute text-sm font-bold text-slate-900 dark:text-white">{percent}%</span>
        </div>
        <div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{percent}%</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">equipment out</p>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{title}</h3>
      {count !== undefined && (
        <span className="inline-flex items-center justify-center min-w-[1.4rem] h-5 px-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold rounded-full">
          {count}
        </span>
      )}
    </div>
  );
}

export default async function DashboardPage() {
  const [equipment, transactions] = await Promise.all([getEquipment(), getTransactions()]);

  // Retired assets are kept for records but excluded from operational metrics
  const fleet = equipment.filter((e) => e.status !== "Retired");
  const total = fleet.length;
  const counts = {
    Available: fleet.filter((e) => e.status === "Available").length,
    Out: fleet.filter((e) => e.status === "Out").length,
    Maintenance: fleet.filter((e) => e.status === "Maintenance").length,
  };
  const utilPct = total > 0 ? Math.round((counts.Out / total) * 100) : 0;

  const active = transactions.filter((t) => !t.audit_log);
  const maintenanceItems = equipment.filter((e) => e.status === "Maintenance");
  const now = new Date();
  const overdueCount = active.filter((t) => new Date(t.due_date) < now).length;
  const dueSoon = active.filter((t) => {
    const due = new Date(t.due_date);
    return due >= now && due.getTime() - now.getTime() <= 48 * 3600 * 1000;
  });

  // ---- Chart data ----
  const dayKey = (d: Date) => d.toISOString().slice(0, 10);
  const days: (DayActivity & { key: string })[] = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (13 - i));
    return { key: dayKey(d), label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }), checkouts: 0, returns: 0 };
  });
  const dayIndex = new Map(days.map((d, i) => [d.key, i]));
  for (const t of transactions) {
    const outIdx = dayIndex.get(dayKey(new Date(t.out_timestamp)));
    if (outIdx !== undefined) days[outIdx].checkouts++;
    if (t.audit_log) {
      const retIdx = dayIndex.get(dayKey(new Date(t.audit_log.return_timestamp)));
      if (retIdx !== undefined) days[retIdx].returns++;
    }
  }

  const catMap = new Map<string, CategoryRow>();
  for (const e of fleet) {
    const row = catMap.get(e.category) ?? { name: e.category, available: 0, out: 0, maintenance: 0 };
    if (e.status === "Available") row.available++;
    else if (e.status === "Out") row.out++;
    else row.maintenance++;
    catMap.set(e.category, row);
  }
  const categoryRows = [...catMap.values()].sort(
    (a, b) => b.available + b.out + b.maintenance - (a.available + a.out + a.maintenance),
  );

  const clientCounts = new Map<string, number>();
  for (const t of transactions) {
    const name = t.client?.name ?? `Client #${t.client_id}`;
    clientCounts.set(name, (clientCounts.get(name) ?? 0) + 1);
  }
  const topClients: ClientRow[] = [...clientCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const recentReturns = transactions
    .filter((t) => t.audit_log)
    .sort((a, b) =>
      new Date(b.audit_log!.return_timestamp).getTime() - new Date(a.audit_log!.return_timestamp).getTime()
    )
    .slice(0, 5);

  const conditionBadge: Record<string, string> = {
    Good: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
    Damaged: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
    "Needs Repair": "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  };

  return (
    <div className="max-w-6xl mx-auto space-y-7">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Live inventory overview — {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* Overdue alert */}
      {overdueCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 rounded-2xl">
          <div className="w-8 h-8 bg-red-100 dark:bg-red-900/40 rounded-lg flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              {overdueCount} item{overdueCount !== 1 ? "s" : ""} overdue for return
            </p>
            <p className="text-xs text-red-500 dark:text-red-500 mt-0.5">
              Check the active loans table below and follow up with clients
            </p>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Available"
          value={counts.Available}
          sublabel={`of ${total} total`}
          accent="bg-emerald-100 dark:bg-emerald-900/40"
          icon={
            <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Checked Out"
          value={counts.Out}
          sublabel="currently out"
          accent="bg-amber-100 dark:bg-amber-900/40"
          icon={
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          }
        />
        <StatCard
          label="Maintenance"
          value={counts.Maintenance}
          sublabel="needs attention"
          accent="bg-red-100 dark:bg-red-900/40"
          icon={
            <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <UtilisationRing percent={utilPct} />
      </div>

      {/* Analytics */}
      <ActivityChart data={days.map(({ label, checkouts, returns }) => ({ label, checkouts, returns }))} />
      <div className="grid lg:grid-cols-2 gap-4">
        <CategoryBreakdown data={categoryRows} />
        <TopClients data={topClients} />
      </div>

      {/* Due within 48 hours */}
      {dueSoon.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 rounded-2xl">
          <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/40 rounded-lg flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              {dueSoon.length} return{dueSoon.length !== 1 ? "s" : ""} due within 48 hours
            </p>
            <p className="text-xs text-amber-600/80 dark:text-amber-500 mt-0.5 truncate">
              {dueSoon.slice(0, 3).map((t) => `${t.equipment?.name ?? `#${t.equipment_id}`} (${t.client?.name ?? "client"})`).join(" · ")}
              {dueSoon.length > 3 ? " …" : ""}
            </p>
          </div>
        </div>
      )}

      {/* Active loans */}
      <div>
        <SectionHeader title="Active Loans" count={active.length} />
        {active.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">All clear!</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">No equipment currently checked out.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Equipment</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Due Date</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Staff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {active.map((t) => {
                    const due = new Date(t.due_date);
                    const overdue = due < new Date();
                    return (
                      <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-white">
                          {t.equipment?.name ?? `#${t.equipment_id}`}
                        </td>
                        <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                          {t.client?.name ?? `#${t.client_id}`}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`text-sm ${overdue ? "text-red-600 dark:text-red-400 font-semibold" : "text-slate-600 dark:text-slate-300"}`}>
                            {due.toLocaleDateString()}
                          </span>
                          {overdue && (
                            <span className="ml-2 text-xs bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-semibold">
                              OVERDUE
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 text-xs font-mono">
                          {t.staff_out_id}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Maintenance watchlist */}
      {maintenanceItems.length > 0 && (
        <div>
          <SectionHeader title="Maintenance Watchlist" count={maintenanceItems.length} />
          <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/40 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-950/30">
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">Item</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">Serial</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">Category</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">Last Inspected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {maintenanceItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-white">{item.name}</td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 font-mono text-xs">{item.serial_number}</td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 text-xs">
                        {item.last_inspected ? new Date(item.last_inspected).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Recent returns */}
      {recentReturns.length > 0 && (
        <div>
          <SectionHeader title="Recent Returns" count={recentReturns.length} />
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Equipment</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Returned</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Condition</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recentReturns.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-white">
                        {t.equipment?.name ?? `#${t.equipment_id}`}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                        {t.client?.name ?? `#${t.client_id}`}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 text-xs">
                        {new Date(t.audit_log!.return_timestamp).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${conditionBadge[t.audit_log!.condition_on_return]}`}>
                          {t.audit_log!.condition_on_return}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-400 dark:text-slate-500 text-xs max-w-xs truncate">
                        {t.audit_log!.notes ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
