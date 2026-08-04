"use client";

import { useCallback, useEffect, useState } from "react";
import { KES, type Task } from "./client";
import { StatusBadge, Toggle, Spinner } from "./ui";
import { Icon } from "./Icon";

/**
 * Dyzah Errands — dispatch console.
 *
 * Errands are minute-to-minute work: a job is paid, it needs a runner now, and
 * someone is waiting. So this is a live dispatch board — the unassigned queue
 * first, then who is on the road — rather than the schedule-shaped console the
 * cleaning business uses, where work is booked days ahead.
 */
const API = process.env.NEXT_PUBLIC_API_URL ?? "/api";
const TOKEN_KEY = "dyzah_admin_token";

const AUTO_EMAIL = "admin@fabent.com";
const AUTO_PASS = "Admin2024";

const TABS = ["Dispatch", "Runners", "Disputes", "Pricing"] as const;
type Tab = (typeof TABS)[number];

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

interface Service {
  id: number;
  name: string;
  category: string;
  base_price: number;
  price_unit: string;
  is_active: boolean;
}

const getToken = () => (typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY));

async function ensureToken(force = false): Promise<boolean> {
  if (!force && getToken()) return true;
  try {
    const res = await fetch(`${API}/errands/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: AUTO_EMAIL, password: AUTO_PASS }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.user?.role !== "admin") return false;
    localStorage.setItem(TOKEN_KEY, data.access_token);
    return true;
  } catch {
    return false;
  }
}

async function apiFetch<T>(path: string, init?: RequestInit, retried = false): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { ...(init?.headers ?? {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if ((res.status === 401 || res.status === 403) && !retried) {
    localStorage.removeItem(TOKEN_KEY);
    if (await ensureToken(true)) return apiFetch<T>(path, init, true);
  }
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export default function ErrandsOps() {
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("Dispatch");

  useEffect(() => {
    ensureToken().then((ok) => {
      setAuthed(ok);
      setLoading(false);
    });
  }, []);

  if (loading) return <Spinner />;
  if (!authed)
    return (
      <p className="rounded border border-line bg-white p-6 text-sm text-muted">
        Could not sign in to the errands console.
      </p>
    );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Dispatch</h1>
          <p className="text-sm text-muted">Dyzah Errands</p>
        </div>
        <a href="/services" className="btn-ghost rounded">
          View site
        </a>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium ${
              tab === t ? "border-brand-500 text-brand-700" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Dispatch" && <Dispatch />}
      {tab === "Runners" && <Runners />}
      {tab === "Disputes" && <Disputes />}
      {tab === "Pricing" && <Pricing />}
    </div>
  );
}

// ── Dispatch board ───────────────────────────────────────────────
function Dispatch() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [runners, setRunners] = useState<AvailRunner[]>([]);
  const [autoAssign, setAutoAssign] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    () =>
      Promise.all([
        apiFetch<Task[]>("/errands/admin/tasks"),
        apiFetch<AvailRunner[]>("/errands/admin/runners/available"),
        apiFetch<{ auto_assign: boolean }>("/errands/admin/settings"),
      ])
        .then(([t, r, s]) => {
          setTasks(t.filter((x) => x.vertical === "errands"));
          setRunners(r);
          setAutoAssign(s.auto_assign);
        })
        .finally(() => setLoading(false)),
    []
  );

  useEffect(() => {
    load();
  }, [load]);

  if (loading || autoAssign === null) return <Spinner />;

  const open = tasks.filter((t) => !["completed", "cancelled"].includes(t.status));
  const queue = open.filter((t) => !t.runner);
  const onRoad = open.filter((t) => t.runner);
  const awaiting = tasks.filter((t) => t.status === "proof_submitted");
  const gmv = tasks
    .filter((t) => t.status === "completed")
    .reduce((n, t) => n + t.total_price, 0);

  const toggle = async (next: boolean) => {
    setBusy(true);
    try {
      const d = await apiFetch<{ auto_assign: boolean }>(
        `/errands/admin/settings/auto-assign?enabled=${next}`,
        { method: "POST" }
      );
      setAutoAssign(d.auto_assign);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Waiting for a runner" value={queue.length} hint="Unassigned" tone={queue.length ? "warn" : undefined} />
        <Tile label="On the road" value={onRoad.length} hint="In progress" />
        <Tile label="Awaiting sign-off" value={awaiting.length} hint="Proof submitted" />
        <Tile label="Runners free" value={runners.length} hint="Available now" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded border border-line bg-white p-5">
        <div>
          <p className="font-bold">Assignment mode</p>
          <p className="mt-0.5 max-w-xl text-sm text-muted">
            {autoAssign
              ? "Automatic — paid jobs go to the freest verified runner, and the open pool is visible to runners."
              : "Manual — you assign every paid job; runners only see their own."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-semibold ${autoAssign ? "text-brand-600" : "text-muted"}`}>
            {autoAssign ? "Auto" : "Manual"}
          </span>
          <Toggle checked={autoAssign} disabled={busy} onChange={toggle} />
        </div>
      </div>

      <Panel title={`Queue (${queue.length})`} tone={queue.length ? "warn" : undefined}>
        {queue.length === 0 ? (
          <p className="p-5 text-sm text-muted">Everything is assigned.</p>
        ) : (
          <TaskTable tasks={queue} runners={runners} onDone={load} />
        )}
      </Panel>

      <Panel title={`On the road (${onRoad.length})`}>
        {onRoad.length === 0 ? (
          <p className="p-5 text-sm text-muted">No jobs in progress.</p>
        ) : (
          <TaskTable tasks={onRoad} runners={runners} onDone={load} />
        )}
      </Panel>

      <div className="rounded border border-line bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Completed value</p>
        <p className="mt-1 text-3xl font-extrabold">{KES(gmv)}</p>
      </div>
    </div>
  );
}

function TaskTable({
  tasks,
  runners,
  onDone,
}: {
  tasks: Task[];
  runners: AvailRunner[];
  onDone: () => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-5 py-2.5 font-semibold">Job</th>
            <th className="px-5 py-2.5 font-semibold">Route</th>
            <th className="px-5 py-2.5 font-semibold">Runner</th>
            <th className="px-5 py-2.5 font-semibold">Status</th>
            <th className="px-5 py-2.5 text-right font-semibold">Value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {tasks.map((t) => (
            <tr key={t.id} className="align-top hover:bg-canvas">
              <td className="px-5 py-3">
                <span className="font-medium">{t.service_name}</span>
                <span className="block text-xs text-muted">{t.reference}</span>
              </td>
              <td className="max-w-[18rem] px-5 py-3">
                <span className="block truncate text-xs">
                  {t.pickup_location || "—"} → {t.dropoff_location || "—"}
                </span>
                {!!t.distance_km && <span className="text-xs text-muted">{t.distance_km} km</span>}
              </td>
              <td className="px-5 py-3">
                <AssignRunner task={t} runners={runners} onDone={onDone} />
              </td>
              <td className="px-5 py-3">
                <StatusBadge status={t.status} />
              </td>
              <td className="whitespace-nowrap px-5 py-3 text-right font-semibold">{KES(t.total_price)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AssignRunner({
  task,
  runners,
  onDone,
}: {
  task: Task;
  runners: AvailRunner[];
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);

  if (task.runner) {
    return (
      <span className="flex items-center gap-1.5">
        <Icon name="user" className="h-3.5 w-3.5 text-muted" />
        {task.runner.full_name}
      </span>
    );
  }

  const assign = async (id: string) => {
    if (!id) return;
    setBusy(true);
    try {
      await apiFetch(`/errands/admin/tasks/${task.id}/assign?runner_id=${id}`, { method: "POST" });
      onDone();
    } finally {
      setBusy(false);
    }
  };

  return (
    <select
      disabled={busy}
      defaultValue=""
      onChange={(e) => assign(e.target.value)}
      className="rounded border border-gold-300 bg-gold-50 px-2 py-1 text-xs font-medium"
    >
      <option value="">Assign…</option>
      {runners.map((r) => (
        <option key={r.id} value={r.id}>
          {r.full_name} ({r.active_load})
        </option>
      ))}
    </select>
  );
}

// ── Runners ──────────────────────────────────────────────────────
function Runners() {
  const [runners, setRunners] = useState<Runner[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    () =>
      apiFetch<Runner[]>("/errands/admin/runners")
        .then(setRunners)
        .finally(() => setLoading(false)),
    []
  );

  useEffect(() => {
    load();
  }, [load]);

  const verify = async (id: number, approve: boolean) => {
    await apiFetch(`/errands/admin/runners/${id}/verify?approve=${approve}`, { method: "POST" });
    load();
  };

  if (loading) return <Spinner />;

  return (
    <Panel title={`Runners (${runners.length})`}>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-5 py-2.5 font-semibold">Name</th>
              <th className="px-5 py-2.5 font-semibold">Base</th>
              <th className="px-5 py-2.5 font-semibold">Skills</th>
              <th className="px-5 py-2.5 font-semibold">Rating</th>
              <th className="px-5 py-2.5 font-semibold">Jobs</th>
              <th className="px-5 py-2.5 font-semibold">Vetting</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {runners.map((r) => (
              <tr key={r.id} className="hover:bg-canvas">
                <td className="px-5 py-3">
                  <span className="font-medium">{r.full_name}</span>
                  <span className="block text-xs text-muted">{r.phone}</span>
                </td>
                <td className="px-5 py-3">{r.suburb || "—"}</td>
                <td className="max-w-[14rem] truncate px-5 py-3 text-muted">{r.skills || "—"}</td>
                <td className="px-5 py-3">{r.rating_avg ? r.rating_avg.toFixed(1) : "—"}</td>
                <td className="px-5 py-3">{r.completed_tasks}</td>
                <td className="px-5 py-3">
                  {r.verification_status === "verified" ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-leaf-600">
                      <Icon name="badge-check" className="h-4 w-4" /> Verified
                    </span>
                  ) : (
                    <span className="flex gap-2">
                      <button onClick={() => verify(r.id, true)} className="text-xs font-semibold text-brand-600 hover:underline">
                        Approve
                      </button>
                      <button onClick={() => verify(r.id, false)} className="text-xs text-muted hover:text-red-600">
                        Reject
                      </button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

// ── Disputes ─────────────────────────────────────────────────────
function Disputes() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    () =>
      apiFetch<Task[]>("/errands/admin/tasks?status=disputed")
        .then((t) => setTasks(t.filter((x) => x.vertical === "errands")))
        .finally(() => setLoading(false)),
    []
  );

  useEffect(() => {
    load();
  }, [load]);

  const resolve = async (id: number, refund: boolean) => {
    await apiFetch(`/errands/admin/tasks/${id}/resolve?refund_customer=${refund}`, { method: "POST" });
    load();
  };

  if (loading) return <Spinner />;
  if (tasks.length === 0)
    return (
      <p className="flex items-center gap-2 rounded border border-line bg-white p-6 text-sm text-muted">
        <Icon name="check-circle" className="h-5 w-5 text-leaf-500" /> No open disputes.
      </p>
    );

  return (
    <div className="space-y-4">
      {tasks.map((t) => (
        <div key={t.id} className="rounded border border-line bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs text-muted">{t.reference}</p>
              <p className="font-semibold">{t.service_name}</p>
              <p className="text-sm text-muted">{KES(t.total_price)} paid via M-Pesa</p>
            </div>
            <StatusBadge status="disputed" />
          </div>
          <div className="mt-4 flex gap-3">
            <button className="btn-ghost flex-1 rounded" onClick={() => resolve(t.id, true)}>
              Refund customer
            </button>
            <button className="btn-primary flex-1 rounded" onClick={() => resolve(t.id, false)}>
              Pay the runner
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Pricing ──────────────────────────────────────────────────────
function Pricing() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState<number | null>(null);

  const load = useCallback(
    () =>
      fetch(`${API}/errands/services?vertical=errands`)
        .then((r) => r.json())
        .then(setServices)
        .finally(() => setLoading(false)),
    []
  );

  useEffect(() => {
    load();
  }, [load]);

  const save = async (s: Service, patch: Record<string, unknown>) => {
    await apiFetch(`/errands/admin/services/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setSaved(s.id);
    setTimeout(() => setSaved(null), 1500);
    load();
  };

  if (loading) return <Spinner />;

  return (
    <Panel title="Errand pricing">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-5 py-2.5 font-semibold">Service</th>
              <th className="px-5 py-2.5 font-semibold">Category</th>
              <th className="px-5 py-2.5 font-semibold">Base (KSh)</th>
              <th className="px-5 py-2.5 font-semibold">Live</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {services.map((s) => (
              <tr key={s.id} className={saved === s.id ? "bg-leaf-100/40" : "hover:bg-canvas"}>
                <td className="px-5 py-2.5 font-medium">{s.name}</td>
                <td className="px-5 py-2.5 text-muted">{s.category}</td>
                <td className="px-5 py-2.5">
                  <input
                    type="number"
                    defaultValue={s.base_price}
                    className="w-28 rounded border border-line px-2 py-1"
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (v !== s.base_price) save(s, { base_price: v });
                    }}
                  />
                </td>
                <td className="px-5 py-2.5">
                  <button onClick={() => save(s, { is_active: !s.is_active })} title="Toggle">
                    {s.is_active ? (
                      <Icon name="check" className="h-5 w-5 text-leaf-500" />
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-5 py-3 text-xs text-muted">Edit a price and click away to save.</p>
    </Panel>
  );
}

// ── Shared ───────────────────────────────────────────────────────
function Panel({
  title,
  tone,
  children,
}: {
  title: string;
  tone?: "warn";
  children: React.ReactNode;
}) {
  return (
    <section className={`overflow-hidden rounded border bg-white ${tone === "warn" ? "border-gold-300" : "border-line"}`}>
      <h2
        className={`border-b px-5 py-3 font-bold ${
          tone === "warn" ? "border-gold-300 bg-gold-50 text-gold-800" : "border-line"
        }`}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function Tile({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number;
  hint: string;
  tone?: "warn";
}) {
  return (
    <div className="rounded border border-line bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1 text-3xl font-extrabold leading-none ${tone === "warn" ? "text-gold-600" : "text-ink"}`}>
        {value}
      </p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  );
}
