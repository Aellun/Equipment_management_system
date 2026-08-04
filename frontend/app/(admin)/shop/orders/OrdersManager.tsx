"use client";

import { useState } from "react";
import { Order, OrderStatus, PaymentStatus } from "@/types";
import { useToast } from "@/app/components/Toast";

const API = process.env.NEXT_PUBLIC_API_URL ?? "/api";

const STATUS_OPTIONS: OrderStatus[] = ["Pending", "Confirmed", "Processing", "Shipped", "Delivered", "Cancelled"];
const PAYMENT_OPTIONS: PaymentStatus[] = ["Unpaid", "Paid", "Refunded"];

const statusColor: Record<OrderStatus, string> = {
  Pending: "bg-amber-100 text-amber-700",
  Confirmed: "bg-blue-100 text-blue-700",
  Processing: "bg-brand-100 text-brand-700",
  Shipped: "bg-brand-100 text-brand-700",
  Delivered: "bg-emerald-100 text-emerald-700",
  Cancelled: "bg-red-100 text-red-700",
};
const payColor: Record<PaymentStatus, string> = {
  Unpaid: "bg-slate-100 text-slate-600",
  Paid: "bg-emerald-100 text-emerald-700",
  Refunded: "bg-orange-100 text-orange-700",
};

export default function OrdersManager({ orders, onRefresh }: { orders: Order[]; onRefresh: () => void }) {
  const { toast } = useToast();
  const [filter, setFilter] = useState<OrderStatus | "All">("All");
  const [open, setOpen] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = filter === "All" ? orders : orders.filter((o) => o.status === filter);

  async function patch(order: Order, body: Partial<{ status: OrderStatus; payment_status: PaymentStatus }>) {
    setBusy(true);
    try {
      const res = await fetch(`${API}/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { toast.error("Failed to update order", "Update failed"); return; }
      toast.success(`Order ${order.order_number} updated.`, "Order updated");
      onRefresh();
    } catch {
      toast.error("Could not reach the server.", "Network error");
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {(["All", ...STATUS_OPTIONS] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${filter === s ? "bg-brand-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-brand-300"}`}>
            {s}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
          <p className="font-semibold text-slate-700 text-sm">No orders</p>
          <p className="text-sm text-slate-400 mt-1">Orders placed in the storefront will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => {
            const isOpen = open === o.id;
            return (
              <div key={o.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <button onClick={() => setOpen(isOpen ? null : o.id)} className="w-full flex items-center gap-4 p-4 text-left">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900 font-mono text-sm">{o.order_number}</span>
                      <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${statusColor[o.status]}`}>{o.status}</span>
                      <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${payColor[o.payment_status]}`}>{o.payment_status}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {o.contact_name} · {new Date(o.created_at).toLocaleString()} · {o.items.length} item(s)
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-slate-900">KSh {Number(o.total).toLocaleString()}</p>
                  </div>
                  <svg className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-100 p-4 space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Customer</p>
                        <p className="text-slate-700">{o.contact_name}</p>
                        <p className="text-slate-500">{o.contact_email}</p>
                        {o.contact_phone && <p className="text-slate-500">{o.contact_phone}</p>}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Shipping to</p>
                        <p className="text-slate-700 whitespace-pre-line">{o.shipping_address}</p>
                      </div>
                    </div>

                    <div className="border border-slate-100 rounded-xl overflow-hidden">
                      {o.items.map((it) => (
                        <div key={it.id} className="flex items-center justify-between px-4 py-2.5 text-sm border-b border-slate-100 last:border-0">
                          <span className="text-slate-700">{it.product_name} <span className="text-slate-400">— {it.variant_name}</span></span>
                          <span className="text-slate-500">{it.quantity} × KSh {Number(it.unit_price).toLocaleString()} = <strong className="text-slate-700">KSh {Number(it.line_total).toLocaleString()}</strong></span>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-end gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Order status</label>
                        <select value={o.status} disabled={busy} onChange={(e) => patch(o, { status: e.target.value as OrderStatus })} className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm">
                          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Payment</label>
                        <select value={o.payment_status} disabled={busy} onChange={(e) => patch(o, { payment_status: e.target.value as PaymentStatus })} className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm">
                          {PAYMENT_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="ml-auto text-right">
                        <p className="text-xs text-slate-400 uppercase">Total</p>
                        <p className="text-lg font-bold text-slate-900">KSh {Number(o.total).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
