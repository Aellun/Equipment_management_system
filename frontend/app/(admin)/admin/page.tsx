import Link from "next/link";
import { serverApi } from "@/app/lib/serverApi";
import { Equipment, Transaction } from "@/types";

const API = process.env.INTERNAL_API_URL ?? "http://localhost:8000";

/**
 * Dyzah Events — operations dashboard.
 *
 * A hire business runs on utilisation: stock sitting in the store earns
 * nothing, and the two things that go wrong daily are kit not coming back and
 * kit stuck in repair. So this leads with utilisation, overdue returns and
 * today's movements rather than a wall of counts.
 */
interface Stats {
  total_units: number;
  out: number;
  maintenance: number;
  utilisation: number;
  overdue: number;
  dispatches_today: number;
  returns_due_today: number;
  open_quotes: number;
  pipeline_value: number;
}

async function get<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await serverApi(`${API}${path}`, { cache: "no-store" });
    return res.ok ? await res.json() : fallback;
  } catch {
    return fallback;
  }
}

const KES = (n: number) =>
  `KSh ${Number(n || 0).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;

export default async function DashboardPage() {
  const [stats, equipment, transactions] = await Promise.all([
    get<Stats | null>("/events/admin/stats", null),
    get<Equipment[]>("/equipment/", []),
    get<Transaction[]>("/transactions/", []),
  ]);

  const now = new Date();
  // A transaction is open until its audit log records the return.
  const open = transactions.filter((t) => !t.audit_log);
  const overdue = open.filter((t) => new Date(t.due_date) < now);
  const dueSoon = open.filter((t) => {
    const due = new Date(t.due_date);
    return due >= now && due.getTime() - now.getTime() <= 48 * 3600 * 1000;
  });
  const recent = [...transactions]
    .sort((a, b) => new Date(b.out_timestamp).getTime() - new Date(a.out_timestamp).getTime())
    .slice(0, 8);

  // Retired stock is kept for records but excluded from operational maths.
  const fleet = equipment.filter((e) => e.status !== "Retired");
  const outCount = fleet.filter((e) => e.status === "Out").length;
  const maintenanceCount = fleet.filter((e) => e.status === "Maintenance").length;
  const util = fleet.length ? Math.round((outCount / fleet.length) * 100) : 0;

  // Equipment hire benchmarks at roughly 60–80% utilisation; below that,
  // stock is idle.
  const utilTone = util >= 60 ? "text-hygiene-green" : util >= 35 ? "text-gold-600" : "text-red-600";

  return (
    <div className="theme-events space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Operations</h1>
          <p className="text-sm text-muted">Dyzah Events · equipment hire</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/transactions" className="btn-primary rounded">Check out / in</Link>
          <Link href="/events" className="btn-ghost rounded">View storefront</Link>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-[320px,minmax(0,1fr)]">
        <div className="rounded border border-line bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Fleet utilisation</p>
          <p className={`mt-1 text-5xl font-extrabold leading-none ${utilTone}`}>{util}%</p>
          <p className="mt-1 text-sm text-muted">{outCount} of {fleet.length} units out</p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-canvas">
            <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${Math.min(100, util)}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted">Healthy hire businesses run 60–80%.</p>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Tile label="Out today" value={stats?.dispatches_today ?? 0} hint="Dispatches" href="/reservations" />
          <Tile label="Due back" value={dueSoon.length} hint="Next 48 hours" href="/transactions" />
          <Tile label="Overdue" value={overdue.length} hint="Past due date" href="/transactions" tone={overdue.length ? "danger" : undefined} />
          <Tile label="In repair" value={maintenanceCount} hint="Not hireable" href="/maintenance" tone={maintenanceCount ? "warn" : undefined} />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-line bg-white p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Open hire requests</p>
            <p className="mt-1 text-3xl font-extrabold">{stats?.open_quotes ?? 0}</p>
            <p className="text-sm text-muted">From the storefront, awaiting a quote</p>
          </div>
          <Link href="/events-ops" className="btn-primary rounded">Work the pipeline</Link>
        </div>
        <div className="rounded border border-line bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Pipeline value</p>
          <p className="mt-1 text-3xl font-extrabold">{KES(stats?.pipeline_value ?? 0)}</p>
          <p className="text-sm text-muted">Estimated across open requests</p>
        </div>
      </section>

      {overdue.length > 0 && (
        <section className="overflow-hidden rounded border border-red-200 bg-white">
          <h2 className="border-b border-red-200 bg-red-50 px-5 py-3 font-bold text-red-800">
            Overdue returns ({overdue.length})
          </h2>
          <ul className="divide-y divide-line">
            {overdue.slice(0, 6).map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.equipment?.name ?? "—"}</p>
                  <p className="truncate text-xs text-muted">{t.client?.name ?? "—"}</p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-red-600">
                  due {new Date(t.due_date).toLocaleDateString("en-KE")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-2">
        <Panel title={`Currently out (${open.length})`} action={["/transactions", "All movements →"]}>
          {open.length === 0 ? (
            <p className="p-5 text-sm text-muted">Nothing is out — everything is on the shelf.</p>
          ) : (
            <ul className="divide-y divide-line">
              {open.slice(0, 8).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{t.equipment?.name ?? "—"}</p>
                    <p className="truncate text-xs text-muted">{t.client?.name ?? "—"}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted">
                    due {new Date(t.due_date).toLocaleDateString("en-KE")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Recent movements">
          {recent.length === 0 ? (
            <p className="p-5 text-sm text-muted">No movements yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {recent.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{t.equipment?.name ?? "—"}</p>
                    <p className="truncate text-xs text-muted">{t.client?.name ?? "—"}</p>
                  </div>
                  <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${t.audit_log ? "bg-leaf-100 text-leaf-700" : "bg-gold-100 text-gold-700"}`}>
                    {t.audit_log ? "Returned" : "Out"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </section>

      <Panel title="Stock by category" action={["/equipment", "Manage stock →"]}>
        <CategoryTable equipment={fleet} />
      </Panel>
    </div>
  );
}

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: [string, string];
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded border border-line bg-white">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <h2 className="font-bold">{title}</h2>
        {action && (
          <Link href={action[0]} className="text-sm font-semibold text-brand-600 hover:underline">
            {action[1]}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function Tile({
  label,
  value,
  hint,
  href,
  tone,
}: {
  label: string;
  value: number;
  hint: string;
  href: string;
  tone?: "danger" | "warn";
}) {
  const valueTone = tone === "danger" ? "text-red-600" : tone === "warn" ? "text-gold-600" : "text-ink";
  return (
    <Link href={href} className="rounded border border-line bg-white p-4 hover:bg-canvas hover:no-underline">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1 text-3xl font-extrabold leading-none ${valueTone}`}>{value}</p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </Link>
  );
}

function CategoryTable({ equipment }: { equipment: Equipment[] }) {
  const rows = Object.entries(
    equipment.reduce<Record<string, { total: number; out: number; maintenance: number }>>((acc, e) => {
      const r = (acc[e.category] ??= { total: 0, out: 0, maintenance: 0 });
      r.total += 1;
      if (e.status === "Out") r.out += 1;
      if (e.status === "Maintenance") r.maintenance += 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1].total - a[1].total);

  if (rows.length === 0) return <p className="p-5 text-sm text-muted">No stock recorded yet.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-5 py-2.5 font-semibold">Category</th>
            <th className="px-5 py-2.5 text-right font-semibold">Units</th>
            <th className="px-5 py-2.5 text-right font-semibold">Out</th>
            <th className="px-5 py-2.5 text-right font-semibold">Repair</th>
            <th className="px-5 py-2.5 text-right font-semibold">Utilisation</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map(([category, r]) => {
            const pct = r.total ? Math.round((r.out / r.total) * 100) : 0;
            return (
              <tr key={category} className="hover:bg-canvas">
                <td className="px-5 py-2.5 font-medium">{category}</td>
                <td className="px-5 py-2.5 text-right">{r.total}</td>
                <td className="px-5 py-2.5 text-right">{r.out}</td>
                <td className="px-5 py-2.5 text-right">{r.maintenance || "—"}</td>
                <td className="px-5 py-2.5 text-right">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-1.5 w-16 overflow-hidden rounded-full bg-canvas">
                      <span className="block h-full bg-brand-500" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="w-9 text-right font-medium">{pct}%</span>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
