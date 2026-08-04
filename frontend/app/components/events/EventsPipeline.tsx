"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/app/components/services/Icon";
import { Spinner } from "@/app/components/services/ui";
import { KES } from "./client";

/**
 * Hire request pipeline.
 *
 * Event hire is won or lost on response time, so requests are worked as a
 * board: what came in, what needs quoting, what is confirmed and going out.
 * Each card carries everything needed to price the job without opening
 * another screen — dates, kit, venue and the customer.
 *
 * These records hold customer contact details and venue addresses, which is
 * why the list is only ever fetched from this staff-authenticated console.
 */
const API = process.env.NEXT_PUBLIC_API_URL ?? "/api";

const STAGES = ["New", "Quoted", "Confirmed", "Completed", "Cancelled"] as const;
type Stage = (typeof STAGES)[number];

interface QuoteItem {
  equipment_name: string;
  category: string;
  quantity: number;
  daily_rate: number;
}

interface Quote {
  id: number;
  reference: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  organisation: string;
  event_type: string;
  start_date: string;
  end_date: string;
  guest_count: number;
  fulfilment: string;
  venue: string;
  notes: string;
  estimated_total: number | null;
  quoted_total: number | null;
  status: Stage;
  created_at: string;
  items: QuoteItem[];
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, { credentials: "include", ...init });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export default function EventsPipeline() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stage, setStage] = useState<Stage | "">("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(
    () =>
      api<Quote[]>("/events/admin/quotes")
        .then((rows) => {
          setQuotes(rows);
          setError("");
        })
        .catch(() => setError("Could not load hire requests. Check you're signed in as staff."))
        .finally(() => setLoading(false)),
    []
  );

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const q of quotes) c[q.status] = (c[q.status] ?? 0) + 1;
    return c;
  }, [quotes]);

  const shown = stage ? quotes.filter((q) => q.status === stage) : quotes;

  const update = async (id: number, params: Record<string, string>) => {
    setBusyId(id);
    try {
      const qs = new URLSearchParams(params).toString();
      await api(`/events/admin/quotes/${id}?${qs}`, { method: "PATCH" });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="theme-events space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">Hire requests</h1>
        <p className="text-sm text-muted">Storefront enquiries, newest first</p>
      </div>

      {error && (
        <p className="flex items-start gap-2 rounded bg-red-50 p-3 text-sm text-red-700">
          <Icon name="alert-triangle" className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      <p className="flex items-start gap-2 rounded bg-gold-50 p-3 text-xs text-gold-700 ring-1 ring-gold-300">
        <Icon name="shield-check" className="mt-0.5 h-4 w-4 shrink-0" />
        These records hold customer contact details and venue addresses. Use them only to quote and
        deliver the hire.
      </p>

      <div className="flex flex-wrap gap-2">
        <Chip active={!stage} onClick={() => setStage("")}>
          All ({quotes.length})
        </Chip>
        {STAGES.map((s) => (
          <Chip key={s} active={stage === s} onClick={() => setStage(s)}>
            {s} ({counts[s] ?? 0})
          </Chip>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="rounded border border-line bg-white p-8 text-center text-sm text-muted">
          No requests here yet.
        </p>
      ) : (
        <div className="space-y-4">
          {shown.map((q) => (
            <QuoteCard key={q.id} quote={q} busy={busyId === q.id} onUpdate={update} />
          ))}
        </div>
      )}
    </div>
  );
}

function QuoteCard({
  quote: q,
  busy,
  onUpdate,
}: {
  quote: Quote;
  busy: boolean;
  onUpdate: (id: number, params: Record<string, string>) => void;
}) {
  const [price, setPrice] = useState(String(q.quoted_total ?? q.estimated_total ?? ""));
  const days = Math.max(
    1,
    Math.round((new Date(q.end_date).getTime() - new Date(q.start_date).getTime()) / 86_400_000) + 1
  );
  const units = q.items.reduce((n, i) => n + i.quantity, 0);

  return (
    <article className="overflow-hidden rounded border border-line bg-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded bg-hygiene-navy px-2 py-0.5 text-xs font-bold text-white">
            {q.reference}
          </span>
          <span className="font-semibold">{q.organisation || q.contact_name}</span>
          <span className="text-sm text-muted">
            {q.event_type || "Event"} · {q.guest_count || "—"} guests
          </span>
        </div>
        <select
          value={q.status}
          disabled={busy}
          onChange={(e) => onUpdate(q.id, { status: e.target.value })}
          className="rounded border border-line px-3 py-1.5 text-sm font-medium"
        >
          {STAGES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </header>

      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr),300px]">
        <div className="space-y-4">
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <Detail
              label="Hire dates"
              value={`${fmt(q.start_date)} → ${fmt(q.end_date)} (${days}d)`}
            />
            <Detail label={q.fulfilment} value={q.venue || "—"} />
            <Detail label="Requested" value={fmt(q.created_at)} />
            <Detail label="Contact" value={q.contact_name} />
            <Detail label="Phone" value={q.contact_phone} href={q.contact_phone ? `tel:${q.contact_phone}` : undefined} />
            <Detail
              label="Email"
              value={q.contact_email}
              href={q.contact_email ? `mailto:${q.contact_email}` : undefined}
            />
          </dl>

          <div className="overflow-hidden rounded border border-line">
            <p className="border-b border-line bg-canvas px-3 py-2 text-xs font-bold uppercase tracking-wide text-muted">
              {q.items.length} line{q.items.length === 1 ? "" : "s"} · {units} units
            </p>
            <ul className="divide-y divide-line text-sm">
              {q.items.map((i) => (
                <li key={i.equipment_name} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="min-w-0 truncate">
                    <span className="font-semibold">{i.quantity}×</span> {i.equipment_name}
                  </span>
                  <span className="shrink-0 text-muted">
                    {KES(i.daily_rate)}/day · {KES(i.daily_rate * i.quantity * days)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {q.notes && <p className="rounded bg-canvas p-3 text-sm text-slate-600">{q.notes}</p>}
        </div>

        <aside className="rounded border border-line bg-canvas p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Customer estimate</p>
          <p className="text-2xl font-extrabold">{KES(q.estimated_total ?? 0)}</p>
          <p className="mt-1 text-xs text-muted">Equipment only — transport not included.</p>

          <label className="mt-4 block">
            <span className="label">Your quote (KSh)</span>
            <input
              className="input bg-white"
              type="number"
              min={0}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </label>
          <button
            className="btn-primary mt-2 w-full rounded"
            disabled={busy || price === ""}
            onClick={() => onUpdate(q.id, { quoted_total: price, status: "Quoted" })}
          >
            {busy ? "Saving…" : "Send quote"}
          </button>
          {q.quoted_total != null && (
            <p className="mt-2 text-center text-xs text-muted">
              Quoted at <span className="font-bold text-ink">{KES(q.quoted_total)}</span>
            </p>
          )}
        </aside>
      </div>
    </article>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
        active
          ? "border-hygiene-navy bg-hygiene-navy text-white"
          : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
      }`}
    >
      {children}
    </button>
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

function fmt(value: string) {
  return new Date(value).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}
