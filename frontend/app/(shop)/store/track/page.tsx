"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { OrderTracking } from "@/types";
import { useToast } from "@/app/components/Toast";

const API = process.env.NEXT_PUBLIC_API_URL ?? "/api";

const RETURN_REASONS = ["Item damaged", "Wrong item received", "Not as described", "Changed my mind", "Quality issue", "Other"];

function ReturnRequestBox({ orderNumber }: { orderNumber: string }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState(RETURN_REASONS[0]);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(`${API}/returns/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_number: orderNumber, reason, details: details || null, contact_email: email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.detail ?? "Could not submit request", "Failed");
        return;
      }
      setDone(true);
      toast.success("Return request submitted. We'll be in touch.", "Request received");
    } catch {
      toast.error("Could not reach the server.", "Network error");
    } finally { setBusy(false); }
  }

  if (done) {
    return (
      <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-4 text-sm text-emerald-700 dark:text-emerald-400">
        ✓ Your return request has been received. We&apos;ll review it and contact you by email.
      </div>
    );
  }

  return (
    <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-4">
      {!open ? (
        <button onClick={() => setOpen(true)} className="text-sm font-medium text-orange-600 hover:text-orange-500">
          Request a return or refund
        </button>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Request a return — covered by our Genuine Guarantee</p>
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email used on the order *" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm" />
          <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm">
            {RETURN_REASONS.map((r) => <option key={r}>{r}</option>)}
          </select>
          <textarea rows={2} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Tell us more (optional)…" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm resize-none" />
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold rounded-xl disabled:opacity-50">{busy ? "Submitting…" : "Submit request"}</button>
            <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-slate-500">Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}

const STAGES = ["Pending", "Confirmed", "Processing", "Shipped", "Delivered"];

function imgStageIndex(status: string) {
  const i = STAGES.indexOf(status);
  return i < 0 ? 0 : i;
}

function TrackInner() {
  const params = useSearchParams();
  const [code, setCode] = useState("");
  const [order, setOrder] = useState<OrderTracking | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function lookup(c: string) {
    if (!c.trim()) return;
    setBusy(true);
    setError("");
    setOrder(null);
    try {
      const res = await fetch(`${API}/orders/track/${encodeURIComponent(c.trim())}`, { cache: "no-store" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.detail ?? "Order not found.");
        return;
      }
      setOrder(await res.json());
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const c = params.get("code");
    if (c) { setCode(c); lookup(c); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cancelled = order?.status === "Cancelled";
  const currentStage = order ? imgStageIndex(order.status) : 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Track your order</h1>
      <p className="text-sm text-slate-500 mt-1">Enter the order code you received at checkout (e.g. ORD-20260607-ABC123).</p>

      <form onSubmit={(e) => { e.preventDefault(); lookup(code); }} className="flex gap-3 mt-5">
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter order code" className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20" />
        <button type="submit" disabled={busy} className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-xl disabled:opacity-50">{busy ? "…" : "Track"}</button>
      </form>

      {error && (
        <div className="mt-6 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-xl px-4 py-3 text-sm">{error}</div>
      )}

      {order && (
        <div className="mt-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-6">
            <div>
              <p className="font-mono font-bold text-slate-900 dark:text-white">{order.order_number}</p>
              <p className="text-xs text-slate-400 mt-0.5">Placed {new Date(order.created_at).toLocaleString()} · {order.delivery_method === "pickup" ? "Pickup" : "Door delivery"}{order.delivery_zone_name ? ` · ${order.delivery_zone_name}` : ""}</p>
            </div>
            <span className={`text-xs font-semibold uppercase px-3 py-1 rounded-full ${cancelled ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"}`}>{order.status}</span>
          </div>

          {/* Progress bar */}
          {!cancelled && (
            <div className="flex items-center mb-8">
              {STAGES.map((stage, i) => (
                <div key={stage} className="flex-1 flex items-center last:flex-none">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${i <= currentStage ? "bg-orange-600 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-400"}`}>
                      {i < currentStage ? "✓" : i + 1}
                    </div>
                    <span className={`text-[10px] mt-1.5 ${i <= currentStage ? "text-slate-700 dark:text-slate-300 font-medium" : "text-slate-400"}`}>{stage}</span>
                  </div>
                  {i < STAGES.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 -mt-4 ${i < currentStage ? "bg-orange-600" : "bg-slate-200 dark:bg-slate-700"}`} />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Timeline */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">History</p>
            {order.tracking_events.length === 0 ? (
              <p className="text-sm text-slate-400">No updates yet.</p>
            ) : (
              <ol className="relative border-l border-slate-200 dark:border-slate-700 ml-2">
                {order.tracking_events.map((ev) => (
                  <li key={ev.id} className="ml-4 pb-4 last:pb-0">
                    <div className="absolute -left-1.5 w-3 h-3 rounded-full bg-orange-600" />
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{ev.status}</p>
                    {ev.note && <p className="text-xs text-slate-500">{ev.note}</p>}
                    <p className="text-[11px] text-slate-400 mt-0.5">{new Date(ev.created_at).toLocaleString()}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Items */}
          <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-4">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Items</p>
            {order.items.map((it) => (
              <div key={it.id} className="flex justify-between text-sm py-1">
                <span className="text-slate-600 dark:text-slate-400">{it.product_name} — {it.variant_name} ×{it.quantity}</span>
                <span className="text-slate-700 dark:text-slate-300">KSh {Number(it.line_total).toLocaleString()}</span>
              </div>
            ))}
          </div>

          {/* Return request (Genuine Guarantee) */}
          <ReturnRequestBox orderNumber={order.order_number} />
        </div>
      )}
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-4 py-10 text-slate-400">Loading…</div>}>
      <TrackInner />
    </Suspense>
  );
}
