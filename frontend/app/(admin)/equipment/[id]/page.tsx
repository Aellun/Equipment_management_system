import Link from "next/link";
import { notFound } from "next/navigation";
import { Equipment, Transaction, MaintenanceLog, Reservation } from "@/types";
import { StatusActions, EditAssetDetails } from "./AssetActions";
import { AssetTag, MaintenancePanel, ReservationsPanel } from "./AssetPanels";

const API = process.env.INTERNAL_API_URL ?? "http://localhost:8000";

async function getData(id: string) {
  try {
    const [eqRes, txRes, mlRes, rsRes] = await Promise.all([
      fetch(`${API}/equipment/${id}`, { cache: "no-store" }),
      fetch(`${API}/transactions/`, { cache: "no-store" }),
      fetch(`${API}/maintenance/equipment/${id}`, { cache: "no-store" }),
      fetch(`${API}/reservations/equipment/${id}`, { cache: "no-store" }),
    ]);
    if (!eqRes.ok) return { equipment: null, transactions: [], logs: [], reservations: [] };
    return {
      equipment: (await eqRes.json()) as Equipment,
      transactions: (txRes.ok ? await txRes.json() : []) as Transaction[],
      logs: (mlRes.ok ? await mlRes.json() : []) as MaintenanceLog[],
      reservations: (rsRes.ok ? await rsRes.json() : []) as Reservation[],
    };
  } catch {
    return { equipment: null, transactions: [], logs: [], reservations: [] };
  }
}

const statusStyle: Record<string, { badge: string; dot: string; label: string }> = {
  Available: {
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
    dot: "bg-emerald-500",
    label: "Ready for checkout",
  },
  Out: {
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
    dot: "bg-amber-500",
    label: "Currently on loan",
  },
  Maintenance: {
    badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
    dot: "bg-red-500",
    label: "Under maintenance",
  },
  Retired: {
    badge: "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    dot: "bg-slate-400",
    label: "Retired — kept for records only",
  },
};

const conditionBadge: Record<string, string> = {
  Good: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  Damaged: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  "Needs Repair": "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
};

function InfoRow({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide shrink-0">{label}</p>
      <p className={`text-sm text-slate-800 dark:text-slate-200 text-right ${mono ? "font-mono text-xs" : ""}`}>
        {value ?? <span className="text-slate-300 dark:text-slate-600">—</span>}
      </p>
    </div>
  );
}

export default async function EquipmentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { equipment, transactions, logs, reservations } = await getData(id);
  if (!equipment) notFound();

  const history = transactions
    .filter((t) => t.equipment_id === equipment.id)
    .sort((a, b) => new Date(b.out_timestamp).getTime() - new Date(a.out_timestamp).getTime());

  const activeLoan = history.find((t) => !t.audit_log);
  const completed = history.filter((t) => t.audit_log);
  const onTime = completed.filter(
    (t) => new Date(t.audit_log!.return_timestamp) <= new Date(t.due_date),
  ).length;
  const damagedReturns = completed.filter(
    (t) => t.audit_log!.condition_on_return !== "Good",
  ).length;

  const ss = statusStyle[equipment.status];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/equipment" className="text-slate-400 hover:text-indigo-600 transition-colors">Equipment</Link>
        <svg className="w-3 h-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
        <span className="text-slate-700 dark:text-slate-300 font-medium">{equipment.name}</span>
      </div>

      {/* Profile header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-center shrink-0">
            <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{equipment.name}</h1>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${ss.badge}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${ss.dot}`} />
                {equipment.status}
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              <span className="font-mono text-xs">{equipment.serial_number}</span>
              {" · "}{equipment.category}
              {equipment.location ? ` · ${equipment.location}` : ""}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">{ss.label}</p>
          </div>
          <div className="shrink-0">
            <StatusActions equipment={equipment} />
          </div>
        </div>
      </div>

      {/* Active loan banner */}
      {activeLoan && (
        <div className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border ${new Date(activeLoan.due_date) < new Date() ? "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/40" : "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/40"}`}>
          <div className="w-8 h-8 bg-white/60 dark:bg-slate-900/40 rounded-lg flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              On loan to {activeLoan.client?.name ?? `client #${activeLoan.client_id}`}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Out since {new Date(activeLoan.out_timestamp).toLocaleDateString()} · due{" "}
              {new Date(activeLoan.due_date).toLocaleDateString()}
              {new Date(activeLoan.due_date) < new Date() && (
                <span className="ml-2 text-xs bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-semibold">OVERDUE</span>
              )}
            </p>
          </div>
          <Link href="/transactions" className="shrink-0 text-xs font-semibold text-indigo-600 hover:text-indigo-500">
            Go to check-in →
          </Link>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-5 items-start">
        {/* Asset information + tag */}
        <div className="space-y-5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Asset Information</p>
            <EditAssetDetails equipment={equipment} />
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            <InfoRow label="Serial No." value={equipment.serial_number} mono />
            <InfoRow label="Category" value={equipment.category} />
            <InfoRow label="Location" value={equipment.location} />
            <InfoRow label="Supplier" value={equipment.supplier} />
            <InfoRow
              label="Purchased"
              value={equipment.purchase_date ? new Date(equipment.purchase_date).toLocaleDateString() : null}
            />
            <InfoRow
              label="Cost"
              value={equipment.purchase_cost != null ? `KSh ${Number(equipment.purchase_cost).toLocaleString()}` : null}
            />
            <InfoRow
              label="Warranty"
              value={
                equipment.warranty_expiry ? (
                  <span className={new Date(equipment.warranty_expiry) < new Date() ? "text-red-500" : ""}>
                    {new Date(equipment.warranty_expiry) < new Date() ? "Expired " : "Until "}
                    {new Date(equipment.warranty_expiry).toLocaleDateString()}
                  </span>
                ) : null
              }
            />
            <InfoRow
              label="Registered"
              value={new Date(equipment.created_at).toLocaleDateString()}
            />
            <InfoRow
              label="Last Inspected"
              value={equipment.last_inspected ? new Date(equipment.last_inspected).toLocaleDateString() : null}
            />
          </div>
          {equipment.notes && (
            <div className="mt-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{equipment.notes}</p>
            </div>
          )}
        </div>

        <AssetTag equipment={equipment} />
        </div>

        {/* Usage stats */}
        <div className="lg:col-span-2 grid sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Total Loans</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mt-3">{history.length}</p>
            <p className="text-xs text-slate-400 mt-1">{activeLoan ? "1 currently active" : "none active"}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">On-time Returns</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mt-3">
              {completed.length ? `${Math.round((onTime / completed.length) * 100)}%` : "—"}
            </p>
            <p className="text-xs text-slate-400 mt-1">{onTime} of {completed.length} returns</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Damage Reports</p>
            <p className={`text-3xl font-bold tracking-tight mt-3 ${damagedReturns > 0 ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-white"}`}>
              {damagedReturns}
            </p>
            <p className="text-xs text-slate-400 mt-1">returned damaged / needing repair</p>
          </div>

          {/* Loan & inspection history */}
          <div className="sm:col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              Loan &amp; Inspection History
            </p>
            {history.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-10">
                This unit has never been checked out.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[560px]">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Checked Out</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Due</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Returned</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Condition</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {history.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">
                          {t.client?.name ?? `#${t.client_id}`}
                        </td>
                        <td className="px-5 py-3 text-slate-500 dark:text-slate-400 text-xs">
                          {new Date(t.out_timestamp).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3 text-slate-500 dark:text-slate-400 text-xs">
                          {new Date(t.due_date).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3 text-xs">
                          {t.audit_log ? (
                            <span className="text-slate-500 dark:text-slate-400">
                              {new Date(t.audit_log.return_timestamp).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="font-semibold text-amber-600 dark:text-amber-400">Still out</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          {t.audit_log ? (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${conditionBadge[t.audit_log.condition_on_return]}`}>
                              {t.audit_log.condition_on_return}
                            </span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Maintenance & reservations */}
      <div className="grid lg:grid-cols-2 gap-5 items-start">
        <MaintenancePanel equipment={equipment} logs={logs} />
        <ReservationsPanel equipment={equipment} reservations={reservations} />
      </div>
    </div>
  );
}
