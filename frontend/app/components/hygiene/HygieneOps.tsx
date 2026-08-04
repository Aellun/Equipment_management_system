"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/app/components/services/Icon";
import { StatusBadge, Spinner } from "@/app/components/services/ui";
import { FREQUENCY_OPTIONS, KES } from "./client";

/**
 * Dyzah Hygiene — operations console.
 *
 * A cleaning business is run off a day sheet, not a task queue: who is going
 * where this morning, which jobs have no crew yet, and which finished work is
 * waiting on the customer to approve. That is the shape of this page, and it
 * is why the generic services console did not fit — that one is built around
 * errands, which have no schedule, no site and no recurring plan.
 *
 * Leads (site surveys and product supply) live here too, because in this
 * business the same person works the schedule and the pipeline.
 */
const API = process.env.NEXT_PUBLIC_API_URL ?? "/api";
const TOKEN_KEY = "dyzah_admin_token";

const AUTO_EMAIL = "admin@fabent.com";
const AUTO_PASS = "Admin2024";

const TABS = ["Today", "Schedule", "Crew", "Leads", "Pricing"] as const;
type Tab = (typeof TABS)[number];

interface Task {
  id: number;
  reference: string;
  service_name: string;
  vertical: string;
  category: string;
  status: string;
  scheduled_date?: string | null;
  arrival_window?: string;
  service_address?: string;
  frequency?: string;
  bedrooms?: number;
  bathrooms?: number;
  total_price: number;
  runner?: { id: number; full_name: string; suburb?: string; rating_avg?: number } | null;
  customer?: { full_name: string; phone?: string } | null;
  created_at: string;
}

interface Crew {
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

interface AvailableCrew {
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
  vertical: string;
  base_price: number;
  price_unit: string;
  is_active: boolean;
  quote_mode: string;
}

interface Enquiry {
  id: number;
  reference: string;
  kind: "supply" | "survey";
  organisation: string;
  sector: string;
  county: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  products: string;
  estimated_quantity: string;
  site_type: string;
  site_size: string;
  locations: string;
  frequency: string;
  notes: string;
  status: string;
  created_at: string;
}

// ── Auth plumbing (shared admin identity) ────────────────────────
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
  // Expired token: drop it, re-authenticate once, retry — so the page heals
  // instead of stalling on a credentials error.
  if ((res.status === 401 || res.status === 403) && !retried) {
    localStorage.removeItem(TOKEN_KEY);
    if (await ensureToken(true)) return apiFetch<T>(path, init, true);
  }
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtDate = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short" }) : "Unscheduled";

export default function HygieneOps() {
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("Today");

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
        Could not sign in to the hygiene console. Check the services admin account exists.
      </p>
    );

  return (
    <div className="theme-hygiene space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Cleaning operations</h1>
          <p className="text-sm text-muted">Dyzah Hygiene</p>
        </div>
        <a href="/hygiene" className="btn-ghost rounded">
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

      {tab === "Today" && <Today />}
      {tab === "Schedule" && <Schedule />}
      {tab === "Crew" && <CrewTab />}
      {tab === "Leads" && <Leads />}
      {tab === "Pricing" && <Pricing />}
    </div>
  );
}

// ── Today: the day sheet ─────────────────────────────────────────
function Today() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [crew, setCrew] = useState<AvailableCrew[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    () =>
      Promise.all([
        apiFetch<Task[]>("/errands/admin/tasks"),
        apiFetch<AvailableCrew[]>("/errands/admin/runners/available"),
      ])
        .then(([t, c]) => {
          setTasks(t.filter((x) => x.vertical === "hygiene"));
          setCrew(c);
        })
        .finally(() => setLoading(false)),
    []
  );

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Spinner />;

  const today = todayISO();
  const open = tasks.filter((t) => !["completed", "cancelled"].includes(t.status));
  const todays = open.filter((t) => t.scheduled_date === today);
  const unassigned = open.filter((t) => !t.runner);
  const awaitingApproval = tasks.filter((t) => t.status === "proof_submitted");
  // A job whose date has passed and is still open needs chasing today.
  const overdue = open.filter((t) => t.scheduled_date && t.scheduled_date < today);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Visits today" value={todays.length} hint="Scheduled" />
        <Tile
          label="No crew yet"
          value={unassigned.length}
          hint="Needs assigning"
          tone={unassigned.length ? "warn" : undefined}
        />
        <Tile
          label="Overdue"
          value={overdue.length}
          hint="Past their date"
          tone={overdue.length ? "danger" : undefined}
        />
        <Tile label="Awaiting sign-off" value={awaitingApproval.length} hint="Customer to approve" />
      </div>

      <Panel title={`Today — ${new Date().toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long" })}`}>
        {todays.length === 0 ? (
          <p className="p-5 text-sm text-muted">No visits scheduled today.</p>
        ) : (
          <VisitTable visits={todays} crew={crew} onDone={load} />
        )}
      </Panel>

      {unassigned.length > 0 && (
        <Panel title={`Waiting for a crew (${unassigned.length})`} tone="warn">
          <VisitTable visits={unassigned} crew={crew} onDone={load} />
        </Panel>
      )}
    </div>
  );
}

// ── Schedule: everything upcoming, grouped by day ────────────────
function Schedule() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [crew, setCrew] = useState<AvailableCrew[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    () =>
      Promise.all([
        apiFetch<Task[]>("/errands/admin/tasks"),
        apiFetch<AvailableCrew[]>("/errands/admin/runners/available"),
      ])
        .then(([t, c]) => {
          setTasks(t.filter((x) => x.vertical === "hygiene"));
          setCrew(c);
        })
        .finally(() => setLoading(false)),
    []
  );

  useEffect(() => {
    load();
  }, [load]);

  const byDay = useMemo(() => {
    const open = tasks.filter((t) => !["completed", "cancelled"].includes(t.status));
    const groups: Record<string, Task[]> = {};
    for (const t of open) (groups[t.scheduled_date ?? ""] ??= []).push(t);
    return Object.entries(groups).sort(([a], [b]) => (a || "9999").localeCompare(b || "9999"));
  }, [tasks]);

  if (loading) return <Spinner />;
  if (byDay.length === 0)
    return <p className="rounded border border-line bg-white p-6 text-sm text-muted">Nothing booked.</p>;

  return (
    <div className="space-y-4">
      {byDay.map(([day, visits]) => (
        <Panel key={day || "none"} title={`${fmtDate(day || null)} · ${visits.length} visit(s)`}>
          <VisitTable visits={visits} crew={crew} onDone={load} />
        </Panel>
      ))}
    </div>
  );
}

function VisitTable({
  visits,
  crew,
  onDone,
}: {
  visits: Task[];
  crew: AvailableCrew[];
  onDone: () => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-5 py-2.5 font-semibold">Time</th>
            <th className="px-5 py-2.5 font-semibold">Service</th>
            <th className="px-5 py-2.5 font-semibold">Where</th>
            <th className="px-5 py-2.5 font-semibold">Crew</th>
            <th className="px-5 py-2.5 font-semibold">Status</th>
            <th className="px-5 py-2.5 text-right font-semibold">Value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {visits.map((t) => (
            <tr key={t.id} className="align-top hover:bg-canvas">
              <td className="whitespace-nowrap px-5 py-3">
                <span className="font-semibold">{t.arrival_window || "—"}</span>
                <span className="block text-xs text-muted">{t.reference}</span>
              </td>
              <td className="px-5 py-3">
                <span className="font-medium">{t.service_name}</span>
                {t.frequency && t.frequency !== "one_off" && (
                  <span className="ml-2 rounded bg-brand-50 px-1.5 py-0.5 text-[11px] font-semibold text-brand-700">
                    {FREQUENCY_OPTIONS.find((f) => f.value === t.frequency)?.label}
                  </span>
                )}
                {!!t.bedrooms && (
                  <span className="block text-xs text-muted">
                    {t.bedrooms} bed · {t.bathrooms} bath
                  </span>
                )}
              </td>
              <td className="max-w-[16rem] px-5 py-3">
                <span className="block truncate">{t.service_address || "—"}</span>
                <span className="block truncate text-xs text-muted">{t.customer?.full_name ?? ""}</span>
              </td>
              <td className="px-5 py-3">
                <AssignCrew task={t} crew={crew} onDone={onDone} />
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

function AssignCrew({ task, crew, onDone }: { task: Task; crew: AvailableCrew[]; onDone: () => void }) {
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
      <option value="">Assign crew…</option>
      {crew.map((c) => (
        <option key={c.id} value={c.id}>
          {c.full_name} ({c.active_load} jobs)
        </option>
      ))}
    </select>
  );
}

// ── Crew ─────────────────────────────────────────────────────────
function CrewTab() {
  const [crew, setCrew] = useState<Crew[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    () =>
      apiFetch<Crew[]>("/errands/admin/runners")
        .then(setCrew)
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
    <Panel title={`Cleaning crew (${crew.length})`}>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-5 py-2.5 font-semibold">Name</th>
              <th className="px-5 py-2.5 font-semibold">Area</th>
              <th className="px-5 py-2.5 font-semibold">Rating</th>
              <th className="px-5 py-2.5 font-semibold">Jobs done</th>
              <th className="px-5 py-2.5 font-semibold">On duty</th>
              <th className="px-5 py-2.5 font-semibold">Vetting</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {crew.map((c) => (
              <tr key={c.id} className="hover:bg-canvas">
                <td className="px-5 py-3">
                  <span className="font-medium">{c.full_name}</span>
                  <span className="block text-xs text-muted">{c.phone}</span>
                </td>
                <td className="px-5 py-3">{c.suburb || "—"}</td>
                <td className="px-5 py-3">{c.rating_avg ? c.rating_avg.toFixed(1) : "—"}</td>
                <td className="px-5 py-3">{c.completed_tasks}</td>
                <td className="px-5 py-3">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-semibold ${
                      c.is_available ? "bg-leaf-100 text-leaf-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {c.is_available ? "Available" : "Off"}
                  </span>
                </td>
                <td className="px-5 py-3">
                  {c.verification_status === "verified" ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-leaf-600">
                      <Icon name="badge-check" className="h-4 w-4" /> Vetted
                    </span>
                  ) : (
                    <span className="flex gap-2">
                      <button onClick={() => verify(c.id, true)} className="text-xs font-semibold text-brand-600 hover:underline">
                        Approve
                      </button>
                      <button onClick={() => verify(c.id, false)} className="text-xs text-muted hover:text-red-600">
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

// ── Leads: site surveys + product supply ─────────────────────────
const LEAD_STATUSES = ["new", "contacted", "quoted", "won", "closed"];

function Leads() {
  const [rows, setRows] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState<"" | "survey" | "supply">("");

  const load = useCallback(
    () =>
      apiFetch<Enquiry[]>("/errands/hygiene/admin/enquiries")
        .then(setRows)
        .finally(() => setLoading(false)),
    []
  );

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (id: number, status: string) => {
    await apiFetch(`/errands/hygiene/admin/enquiries/${id}/status?status=${status}`, { method: "POST" });
    load();
  };

  if (loading) return <Spinner />;

  const shown = kind ? rows.filter((r) => r.kind === kind) : rows;

  return (
    <div className="space-y-4">
      <p className="flex items-start gap-2 rounded bg-gold-50 p-3 text-xs text-gold-700 ring-1 ring-gold-300">
        <Icon name="shield-check" className="mt-0.5 h-4 w-4 shrink-0" />
        These records hold prospective-client contact details. Use them only to follow up on the quote.
      </p>

      <div className="flex gap-2">
        {(
          [
            ["", `All (${rows.length})`],
            ["survey", `Site surveys (${rows.filter((r) => r.kind === "survey").length})`],
            ["supply", `Product supply (${rows.filter((r) => r.kind === "supply").length})`],
          ] as ["" | "survey" | "supply", string][]
        ).map(([k, label]) => (
          <button
            key={k || "all"}
            onClick={() => setKind(k)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium ${
              kind === k
                ? "border-hygiene-navy bg-hygiene-navy text-white"
                : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="rounded border border-line bg-white p-6 text-sm text-muted">No leads yet.</p>
      ) : (
        shown.map((e) => (
          <article key={e.id} className="rounded border border-line bg-white p-5">
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-xs text-muted">
                  <span
                    className={`rounded px-1.5 py-0.5 font-semibold uppercase tracking-wide ${
                      e.kind === "survey" ? "bg-sky-100 text-sky-700" : "bg-leaf-100 text-leaf-700"
                    }`}
                  >
                    {e.kind === "survey" ? "Site survey" : "Supply"}
                  </span>
                  {e.reference} · {new Date(e.created_at).toLocaleDateString("en-KE")}
                </p>
                <p className="mt-1 font-semibold">{e.organisation}</p>
                <p className="text-sm text-muted">{[e.sector, e.county].filter(Boolean).join(" · ") || "—"}</p>
              </div>
              <select
                value={e.status}
                onChange={(ev) => setStatus(e.id, ev.target.value)}
                className="rounded border border-line px-3 py-1.5 text-sm capitalize"
              >
                {LEAD_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </header>

            <dl className="mt-4 grid gap-x-6 gap-y-2 border-t border-line pt-4 text-sm sm:grid-cols-3">
              <Detail label="Contact" value={e.contact_name} />
              <Detail label="Phone" value={e.contact_phone} href={e.contact_phone ? `tel:${e.contact_phone}` : undefined} />
              <Detail label="Email" value={e.contact_email} href={e.contact_email ? `mailto:${e.contact_email}` : undefined} />
              <Detail label="Site type" value={e.site_type} />
              <Detail label="Size" value={e.site_size} />
              <Detail label="Locations" value={e.locations} />
              <Detail label="Products" value={e.products} />
              <Detail label="Quantity" value={e.estimated_quantity} />
              <Detail label="Frequency" value={e.frequency} />
            </dl>
            {e.notes && <p className="mt-3 rounded bg-canvas p-3 text-sm text-slate-600">{e.notes}</p>}
          </article>
        ))
      )}
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
      fetch(`${API}/errands/services?vertical=hygiene`)
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
    <Panel title="Service pricing">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-5 py-2.5 font-semibold">Service</th>
              <th className="px-5 py-2.5 font-semibold">Category</th>
              <th className="px-5 py-2.5 font-semibold">Booking path</th>
              <th className="px-5 py-2.5 font-semibold">From (KSh)</th>
              <th className="px-5 py-2.5 font-semibold">Live</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {services.map((s) => (
              <tr key={s.id} className={saved === s.id ? "bg-leaf-100/40" : "hover:bg-canvas"}>
                <td className="px-5 py-2.5 font-medium">{s.name}</td>
                <td className="px-5 py-2.5 text-muted">{s.category}</td>
                <td className="px-5 py-2.5">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-semibold ${
                      s.quote_mode === "survey"
                        ? "bg-sky-100 text-sky-700"
                        : "bg-leaf-100 text-leaf-700"
                    }`}
                  >
                    {s.quote_mode === "survey"
                      ? "Site survey"
                      : s.quote_mode === "rooms"
                        ? "By home size"
                        : "Per unit"}
                  </span>
                </td>
                <td className="px-5 py-2.5">
                  {s.quote_mode === "survey" ? (
                    <span className="text-muted">Quoted on site</span>
                  ) : (
                    <input
                      type="number"
                      defaultValue={s.base_price}
                      className="w-28 rounded border border-line px-2 py-1"
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (v !== s.base_price) save(s, { base_price: v });
                      }}
                    />
                  )}
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
      <p className="px-5 py-3 text-xs text-muted">
        Edit a price and click away to save. Survey-quoted services have no public price by design.
      </p>
    </Panel>
  );
}

// ── Shared bits ──────────────────────────────────────────────────
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
  tone?: "danger" | "warn";
}) {
  const valueTone = tone === "danger" ? "text-red-600" : tone === "warn" ? "text-gold-600" : "text-ink";
  return (
    <div className="rounded border border-line bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1 text-3xl font-extrabold leading-none ${valueTone}`}>{value}</p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  );
}

function Detail({ label, value, href }: { label: string; value: string; href?: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="font-medium">
        {href ? (
          <a href={href} className="link">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
