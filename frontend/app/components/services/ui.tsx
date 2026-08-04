"use client";

import { Icon } from "./Icon";
import { KES, type Quote } from "./client";

const STATUS_STYLES: Record<string, string> = {
  quoted: "bg-slate-100 text-slate-700",
  paid: "bg-sky-100 text-sky-700",
  assigned: "bg-brand-100 text-brand-700",
  in_progress: "bg-gold-100 text-gold-700",
  proof_submitted: "bg-purple-100 text-purple-700",
  completed: "bg-leaf-100 text-leaf-700",
  disputed: "bg-red-100 text-red-700",
  cancelled: "bg-slate-200 text-slate-500",
  refunded: "bg-slate-200 text-slate-600",
  pending: "bg-slate-100 text-slate-600",
  failed: "bg-red-100 text-red-700",
};

export function StatusBadge({ status }: { status: string }) {
  const label = (status || "").replace(/_/g, " ");
  return <span className={`badge ${STATUS_STYLES[status] || "bg-slate-100 text-slate-700"}`}>{label}</span>;
}

export function PriceBreakdown({ q }: { q: Quote | null }) {
  if (!q) return null;
  const Row = ({ label, value, hint }: { label: string; value: number; hint?: string }) => (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-slate-600">
        {label}
        {hint && <span className="text-slate-400"> · {hint}</span>}
      </span>
      <span className="font-medium">{KES(value)}</span>
    </div>
  );
  return (
    <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <Row label="Base price" value={q.base_price} />
      {q.distance_fee > 0 && <Row label="Distance fee" value={q.distance_fee} />}
      {q.urgency_fee > 0 && <Row label="Urgency surcharge" value={q.urgency_fee} />}
      <Row label="Service fee" value={q.service_fee} hint="platform + support" />
      <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-3">
        <span className="font-semibold">Total to pay now</span>
        <span className="text-lg font-bold text-brand-600">{KES(q.total_price)}</span>
      </div>
      {q.goods_paid_separately && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-slate-500">
          <Icon name="info" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
          Cost of goods purchased is reimbursed separately with a receipt.
        </p>
      )}
    </div>
  );
}

export function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
        checked ? "bg-brand-500" : "bg-slate-300"
      } ${disabled ? "opacity-50" : ""}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-100 border-t-brand-500" />
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="card p-6 text-center text-slate-500">
      <p className="font-semibold text-slate-700">{title}</p>
      {children && <p className="mt-1 text-sm">{children}</p>}
    </div>
  );
}
