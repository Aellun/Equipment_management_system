"use client";

import { useCallback, useEffect, useState } from "react";
import { KES, type Task, type Service } from "./client";
import { StatusBadge, Toggle, Spinner } from "./ui";
import { Icon, serviceIconName } from "./Icon";

const API = process.env.NEXT_PUBLIC_API_URL ?? "/api";
const ADMIN_TOKEN_KEY = "dyzah_admin_token";

// Unified admin identity — the services admin is seeded with the same
// credentials as the main staff admin, so one login covers everything.
const AUTO_EMAIL = "admin@fabent.com";
const AUTO_PASS = "Admin2024";

interface Runner {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  suburb?: string;
  skills?: string;
  verification_status: string;
  is_available: boolean;
  rating_avg: number;
  completed_tasks: number;
}
interface AvailRunner {
  id: number;
  full_name: string;
  suburb?: string;
  rating_avg: number;
  active_load: number;
}

function getAdminToken() {
  return typeof window === "undefined" ? null : localStorage.getItem(ADMIN_TOKEN_KEY);
}

async function ensureAdminToken(): Promise<boolean> {
  if (getAdminToken()) return true;
  try {
    const res = await fetch(`${API}/errands/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: AUTO_EMAIL, password: AUTO_PASS }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.user?.role !== "admin") return false;
    localStorage.setItem(ADMIN_TOKEN_KEY, data.access_token);
    return true;
  } catch {
    return false;
  }
}

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAdminToken();
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { ...(init?.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      detail = (await res.json()).detail ?? detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

const TABS = ["Overview", "Runners", "Tasks", "Disputes", "Pricing"] as const;
type Tab = (typeof TABS)[number];

function AdminLogin({ onAuthed }: { onAuthed: () => void }) {
  const [email, setEmail] = useState(AUTO_EMAIL);
  const [password, setPassword] = useState(AUTO_PASS);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`${API}/errands/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error((await res.json()).detail ?? "Login failed");
      const data = await res.json();
      if (data.user?.role !== "admin") throw new Error("Not a services admin account");
      localStorage.setItem(ADMIN_TOKEN_KEY, data.access_token);
      onAuthed();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card max-w-md space-y-4 p-6">
      <div>
        <h2 className="text-lg font-bold">Services admin sign-in</h2>
        <p className="mt-1 text-sm text-slate-500">Use your staff admin credentials.</p>
      </div>
      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div>
        <label className="form-label">Email</label>
        <input className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label className="form-label">Password</label>
        <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <button className="btn-primary w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}

// ── Overview tab ─────────────────────────────────────────────────
function Overview() {
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [autoAssign, setAutoAssign] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [s, settings] = await Promise.all([
      adminFetch<Record<string, unknown>>("/errands/admin/stats"),
      adminFetch<{ auto_assign: boolean }>("/errands/admin/settings"),
    ]);
    setStats(s);
    setAutoAssign(settings.auto_assign);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!stats || autoAssign === null) return <Spinner />;

  const toggle = async (next: boolean) => {
    setBusy(true);
    try {
      const d = await adminFetch<{ auto_assign: boolean }>(`/errands/admin/settings/auto-assign?enabled=${next}`, { method: "POST" });
      setAutoAssign(d.auto_assign);
    } finally {
      setBusy(false);
    }
  };

  const byStatus = (stats.tasks_by_status ?? {}) as Record<string, number>;
  const cards: [string, string | number][] = [
    ["Completed GMV", KES(Number(stats.completed_gmv ?? 0))],
    ["Total runners", Number(stats.runners_total ?? 0)],
    ["Pending verifications", Number(stats.runners_pending ?? 0)],
    ["Open disputes", Number(stats.open_disputes ?? 0)],
  ];

  return (
    <div className="space-y-6">
      <div className="card border-2 border-brand-100 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">Task assignment mode</h2>
            <p className="mt-1 max-w-xl text-sm text-slate-500">
              {autoAssign ? (
                <><span className="font-semibold text-brand-600">Automatic.</span> Paid tasks auto-assign to the most available runner; the open pool is visible to runners.</>
              ) : (
                <><span className="font-semibold text-slate-700">Manual.</span> You assign every paid task; runners only see tasks assigned to them.</>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-semibold ${autoAssign ? "text-brand-600" : "text-slate-400"}`}>{autoAssign ? "Auto" : "Manual"}</span>
            <Toggle checked={autoAssign} disabled={busy} onChange={toggle} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className="card p-5">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <div className="card p-6">
        <h2 className="mb-3 font-bold">Tasks by status</h2>
        <div className="flex flex-wrap gap-3">
          {Object.entries(byStatus).map(([s, n]) => (
            <div key={s} className="flex items-center gap-2">
              <StatusBadge status={s} /> <span className="font-semibold">{n}</span>
            </div>
          ))}
          {Object.keys(byStatus).length === 0 && <p className="text-sm text-slate-400">No tasks yet.</p>}
        </div>
      </div>
    </div>
  );
}

// ── Runners tab ──────────────────────────────────────────────────
function Runners() {
  const [runners, setRunners] = useState<Runner[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => adminFetch<Runner[]>("/errands/admin/runners").then(setRunners).finally(() => setLoading(false)), []);
  useEffect(() => {
    load();
  }, [load]);
  const verify = async (id: number, approve: boolean) => {
    await adminFetch(`/errands/admin/runners/${id}/verify?approve=${approve}`, { method: "POST" });
    load();
  };
  if (loading) return <Spinner />;

  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white">
      <table className="min-w-full divide-y divide-line text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-4 py-3">Runner</th>
            <th className="px-4 py-3">Suburb</th>
            <th className="px-4 py-3">Rating</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {runners.map((r) => (
            <tr key={r.id}>
              <td className="px-4 py-3">
                <p className="font-medium">{r.full_name}</p>
                <p className="text-xs text-muted">{r.phone}</p>
              </td>
              <td className="px-4 py-3">{r.suburb || "—"}</td>
              <td className="px-4 py-3">
                <span className="flex items-center gap-1.5">
                  <Icon name="star" filled className="h-3.5 w-3.5 text-gold-500" />
                  {r.rating_avg} · {r.completed_tasks} done
                </span>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={r.verification_status === "verified" ? "completed" : r.verification_status === "rejected" ? "cancelled" : "pending"} />
              </td>
              <td className="px-4 py-3 text-right">
                {r.verification_status !== "verified" ? (
                  <button className="btn-primary px-3 py-1.5 text-xs" onClick={() => verify(r.id, true)}>Verify</button>
                ) : (
                  <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => verify(r.id, false)}>Revoke</button>
                )}
              </td>
            </tr>
          ))}
          {runners.length === 0 && (
            <tr><td colSpan={5} className="px-4 py-6 text-center text-muted">No runners yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Tasks tab (assign / reassign) ────────────────────────────────
function AssignControl({ task, runners, onDone }: { task: Task; runners: AvailRunner[]; onDone: () => void }) {
  const [runnerId, setRunnerId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const assign = async () => {
    if (!runnerId) return;
    setBusy(true);
    setError("");
    try {
      await adminFetch(`/errands/admin/tasks/${task.id}/assign?runner_id=${runnerId}`, { method: "POST" });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mt-3 border-t border-line pt-3">
      <label className="text-xs font-medium text-muted">{task.runner ? "Reassign to" : "Assign to"}</label>
      <div className="mt-1 flex gap-2">
        <select className="flex-1 rounded-lg border border-line px-2 py-1.5 text-sm" value={runnerId} onChange={(e) => setRunnerId(e.target.value)}>
          <option value="">Select runner…</option>
          {runners.map((r) => (
            <option key={r.id} value={r.id}>{r.full_name} · {r.rating_avg}★ · {r.active_load} active</option>
          ))}
        </select>
        <button className="btn-primary px-3 py-1.5 text-xs" disabled={busy || !runnerId} onClick={assign}>
          {task.runner ? "Reassign" : "Assign"}
        </button>
      </div>
      {runners.length === 0 && <p className="mt-1 text-xs text-amber-600">No available runners right now.</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [runners, setRunners] = useState<AvailRunner[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(
    () =>
      Promise.all([adminFetch<Task[]>("/errands/admin/tasks"), adminFetch<AvailRunner[]>("/errands/admin/runners/available")])
        .then(([t, r]) => {
          setTasks(t);
          setRunners(r);
        })
        .finally(() => setLoading(false)),
    []
  );
  useEffect(() => {
    load();
  }, [load]);
  if (loading) return <Spinner />;
  const closed = (s: string) => ["completed", "cancelled"].includes(s);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {tasks.map((t) => (
        <div key={t.id} className="card flex flex-col p-5">
          <div className="flex justify-between">
            <p className="text-xs text-muted">{t.reference}</p>
            <StatusBadge status={t.status} />
          </div>
          <p className="mt-1 font-semibold">{t.service_name}</p>
          <p className="flex items-center gap-1.5 text-sm text-muted">
            {t.runner ? (
              <><Icon name="user" className="h-3.5 w-3.5 text-muted" /> {t.runner.full_name}</>
            ) : (
              <><Icon name="alert-triangle" className="h-3.5 w-3.5 text-gold-600" /> Unassigned</>
            )}
            <span>· {KES(t.total_price)}</span>
          </p>
          {!closed(t.status) && <AssignControl task={t} runners={runners} onDone={load} />}
        </div>
      ))}
      {tasks.length === 0 && <p className="text-sm text-muted">No tasks yet.</p>}
    </div>
  );
}

// ── Disputes tab ─────────────────────────────────────────────────
function Disputes() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => adminFetch<Task[]>("/errands/admin/tasks?status=disputed").then(setTasks).finally(() => setLoading(false)), []);
  useEffect(() => {
    load();
  }, [load]);
  const resolve = async (id: number, refund: boolean) => {
    await adminFetch(`/errands/admin/tasks/${id}/resolve?refund_customer=${refund}`, { method: "POST" });
    load();
  };
  if (loading) return <Spinner />;
  if (tasks.length === 0)
    return (
      <div className="card flex items-center gap-2 p-6 text-slate-500">
        <Icon name="check-circle" className="h-5 w-5 text-leaf-500" /> No open disputes.
      </div>
    );

  return (
    <div className="space-y-4">
      {tasks.map((t) => (
        <div key={t.id} className="card p-6">
          <div className="flex justify-between">
            <div>
              <p className="text-xs text-muted">{t.reference}</p>
              <p className="font-semibold">{t.service_name}</p>
              <p className="text-sm text-muted">{KES(t.total_price)} held in escrow</p>
            </div>
            <StatusBadge status="disputed" />
          </div>
          <div className="mt-4 flex gap-3">
            <button className="btn-ghost flex-1" onClick={() => resolve(t.id, true)}>Refund customer</button>
            <button className="btn-primary flex-1" onClick={() => resolve(t.id, false)}>Release to runner</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Pricing tab (edit base price + toggle active) ────────────────
function Pricing() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState<number | null>(null);
  const load = useCallback(
    () =>
      fetch(`${API}/errands/services`)
        .then((r) => r.json())
        .then(setServices)
        .finally(() => setLoading(false)),
    []
  );
  useEffect(() => {
    load();
  }, [load]);

  const save = async (s: Service, patch: Record<string, unknown>) => {
    await adminFetch(`/errands/admin/services/${s.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    setSaved(s.id);
    setTimeout(() => setSaved(null), 1500);
    load();
  };
  if (loading) return <Spinner />;

  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white">
      <table className="min-w-full divide-y divide-line text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-4 py-3">Service</th>
            <th className="px-4 py-3">Vertical</th>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3">Base price (KSh)</th>
            <th className="px-4 py-3">Active</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {services.map((s) => (
            <tr key={s.id} className={saved === s.id ? "bg-leaf-100/40" : ""}>
              <td className="px-4 py-3 font-medium">
                <span className="flex items-center gap-2">
                  <Icon name={serviceIconName(s)} className="h-4 w-4 text-brand-500" />
                  {s.name}
                </span>
              </td>
              <td className="px-4 py-3 capitalize text-muted">{s.vertical}</td>
              <td className="px-4 py-3 text-muted">{s.category}</td>
              <td className="px-4 py-3">
                <input
                  type="number"
                  defaultValue={s.base_price}
                  className="w-28 rounded-lg border border-line px-2 py-1"
                  onBlur={(e) => {
                    const v = Number(e.target.value);
                    if (v !== s.base_price) save(s, { base_price: v });
                  }}
                />
              </td>
              <td className="px-4 py-3">
                <button onClick={() => save(s, { is_active: !s.is_active })} title="Toggle active">
                  {s.is_active ? <Icon name="check" className="h-5 w-5 text-leaf-500" /> : <span className="text-slate-300">—</span>}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-4 py-3 text-xs text-muted">Edit a price and click away to save. Click the tick to toggle a service on/off.</p>
    </div>
  );
}

export default function AdminServices({ label }: { vertical?: string; label: string }) {
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("Overview");

  useEffect(() => {
    (async () => {
      const ok = await ensureAdminToken();
      setAuthed(ok);
      setLoading(false);
    })();
  }, []);

  if (loading) return <Spinner />;
  if (!authed) return <AdminLogin onAuthed={() => setAuthed(true)} />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dyzah {label} — Operations</h1>
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${tab === t ? "bg-brand-500 text-white" : "bg-white text-ink ring-1 ring-line hover:ring-brand-300"}`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Overview" && <Overview />}
      {tab === "Runners" && <Runners />}
      {tab === "Tasks" && <Tasks />}
      {tab === "Disputes" && <Disputes />}
      {tab === "Pricing" && <Pricing />}
    </div>
  );
}
