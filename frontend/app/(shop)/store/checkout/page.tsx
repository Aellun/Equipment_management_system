"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useStore } from "../StoreProvider";
import { useToast } from "@/app/components/Toast";
import { DeliveryZone } from "@/types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export default function CheckoutPage() {
  const { cart, token, refreshCart } = useStore();
  const { toast } = useToast();

  const items = cart?.items ?? [];
  const subtotal = Number(cart?.subtotal ?? 0);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [zoneId, setZoneId] = useState<number | null>(null);
  const [method, setMethod] = useState<"door" | "pickup">("door");
  const [placing, setPlacing] = useState(false);
  const [done, setDone] = useState<{ code: string; total: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/shop/delivery-zones`, { cache: "no-store" });
        if (res.ok) {
          const z: DeliveryZone[] = await res.json();
          setZones(z);
          if (z.length) setZoneId(z[0].id);
        }
      } catch { /* ignore */ }
    })();
  }, []);

  const zone = useMemo(() => zones.find((z) => z.id === zoneId) ?? null, [zones, zoneId]);

  const deliveryFee = useMemo(() => {
    if (!zone) return 0;
    if (method === "pickup") return Number(zone.pickup_fee);
    if (zone.free_over != null && subtotal >= Number(zone.free_over)) return 0;
    return Number(zone.door_fee);
  }, [zone, method, subtotal]);

  const total = subtotal + deliveryFee;

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    setPlacing(true);
    try {
      const res = await fetch(`${API}/orders/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_token: token,
          customer_id: null,
          contact_name: name,
          contact_email: email,
          contact_phone: phone || null,
          shipping_address: address,
          delivery_zone_id: zoneId,
          delivery_method: method,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.detail ?? "Could not place order.", "Checkout failed");
        return;
      }
      const order = await res.json();
      await refreshCart();
      setDone({ code: order.order_number, total: order.total });
      toast.success(`Order ${order.order_number} placed!`, "Order confirmed");
    } catch {
      toast.error("Could not reach the server.", "Network error");
    } finally {
      setPlacing(false);
    }
  }

  if (done) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Thank you!</h1>
        <p className="text-slate-500 mt-2">Your order has been placed.</p>
        <div className="mt-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 py-3 inline-block">
          <p className="text-xs text-slate-400 uppercase">Your tracking code</p>
          <p className="text-lg font-mono font-bold text-slate-900 dark:text-white">{done.code}</p>
        </div>
        <p className="text-sm text-slate-400 mt-4">Total to pay on delivery: <strong className="text-slate-700 dark:text-slate-300">KSh {Number(done.total).toLocaleString()}</strong></p>
        <p className="text-xs text-slate-400 mt-1">Save your code — use it to track your order anytime.</p>
        <div className="flex gap-3 justify-center mt-6">
          <Link href={`/store/track?code=${done.code}`} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors">Track this order</Link>
          <Link href="/store" className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-xl transition-colors">Continue shopping</Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Nothing to check out</h1>
        <p className="text-sm text-slate-500 mt-1">Your cart is empty.</p>
        <Link href="/store" className="inline-block mt-6 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors">Browse products</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Checkout</h1>
      <div className="grid lg:grid-cols-3 gap-6">
        <form onSubmit={placeOrder} className="lg:col-span-2 space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Full name <span className="text-red-500">*</span></label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email <span className="text-red-500">*</span></label>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Phone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07xx xxx xxx" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
            </div>
          </div>

          {/* Delivery zone + method */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Delivery region <span className="text-red-500">*</span></label>
            <select required value={zoneId ?? ""} onChange={(e) => setZoneId(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
              {zones.map((z) => (
                <option key={z.id} value={z.id}>{z.name} · {z.eta_days_min}-{z.eta_days_max} days</option>
              ))}
            </select>
          </div>

          {zone && (
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setMethod("door")} className={`rounded-xl border p-3 text-left transition-colors ${method === "door" ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20" : "border-slate-300 dark:border-slate-700"}`}>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Door delivery</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {zone.free_over != null && subtotal >= Number(zone.free_over) ? "FREE" : `KSh ${Number(zone.door_fee).toLocaleString()}`}
                </p>
              </button>
              <button type="button" onClick={() => setMethod("pickup")} className={`rounded-xl border p-3 text-left transition-colors ${method === "pickup" ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20" : "border-slate-300 dark:border-slate-700"}`}>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Pickup station</p>
                <p className="text-xs text-slate-500 mt-0.5">{Number(zone.pickup_fee) === 0 ? "FREE" : `KSh ${Number(zone.pickup_fee).toLocaleString()}`}</p>
              </button>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              {method === "pickup" ? "Pickup contact / nearest town" : "Delivery address"} <span className="text-red-500">*</span>
            </label>
            <textarea required rows={3} value={address} onChange={(e) => setAddress(e.target.value)} placeholder={method === "pickup" ? "Nearest pickup town / your details…" : "Street, building, city, landmark…"} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
          </div>

          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl px-4 py-3 text-sm text-indigo-700 dark:text-indigo-300">
            <strong>Payment:</strong> Pay on delivery. No payment is taken now.
          </div>
          <button type="submit" disabled={placing} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl disabled:opacity-50 transition-colors">
            {placing ? "Placing order…" : `Place order · KSh ${total.toLocaleString()}`}
          </button>
        </form>

        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sticky top-20">
            <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Order Summary</h2>
            <div className="space-y-2 mb-4">
              {items.map((it) => (
                <div key={it.id} className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400 truncate pr-2">{it.product_name} <span className="text-slate-400">×{it.quantity}</span></span>
                  <span className="text-slate-700 dark:text-slate-300 shrink-0">KSh {Number(it.line_total ?? 0).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1.5 text-sm border-t border-slate-100 dark:border-slate-800 pt-3">
              <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="text-slate-700 dark:text-slate-300">KSh {subtotal.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Delivery {method === "pickup" ? "(pickup)" : ""}</span><span className="text-slate-700 dark:text-slate-300">{deliveryFee === 0 ? "FREE" : `KSh ${deliveryFee.toLocaleString()}`}</span></div>
            </div>
            <div className="flex justify-between font-bold text-slate-900 dark:text-white border-t border-slate-100 dark:border-slate-800 pt-3 mt-2">
              <span>Total</span>
              <span>KSh {total.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
