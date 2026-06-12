"use client";

import Link from "next/link";
import { useStore } from "../StoreProvider";

const API = process.env.NEXT_PUBLIC_API_URL ?? "/api";

function imgSrc(url: string) {
  return url.startsWith("/uploads") ? `${API}${url}` : url;
}

export default function CartPage() {
  const { cart, updateItem, removeItem } = useStore();
  const items = cart?.items ?? [];
  const subtotal = Number(cart?.subtotal ?? 0);

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Your cart is empty</h1>
        <p className="text-sm text-slate-500 mt-1">Browse our kitchenware and add something you love.</p>
        <Link href="/store" className="inline-block mt-6 px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold rounded-xl transition-colors">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Your Cart</h1>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
              <div className="w-20 h-20 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                {item.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imgSrc(item.image_url)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 dark:text-white">{item.product_name}</p>
                <p className="text-xs text-slate-400">{item.variant?.variant_name}</p>
                <p className="text-sm text-orange-600 dark:text-orange-400 font-semibold mt-1">
                  KSh {Number(item.variant?.price ?? 0).toLocaleString()}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden">
                    <button onClick={() => item.quantity > 1 && updateItem(item.id, item.quantity - 1)} className="px-2.5 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">−</button>
                    <span className="px-3 py-1 text-sm font-medium">{item.quantity}</span>
                    <button onClick={() => updateItem(item.id, item.quantity + 1)} disabled={!!item.variant && item.quantity >= item.variant.stock_qty} className="px-2.5 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30">+</button>
                  </div>
                  <button onClick={() => removeItem(item.id)} className="text-xs text-slate-400 hover:text-red-500 font-medium">Remove</button>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-slate-900 dark:text-white">KSh {Number(item.line_total ?? 0).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sticky top-20">
            <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Order Summary</h2>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-medium text-slate-900 dark:text-white">KSh {subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm mb-4">
              <span className="text-slate-500">Delivery</span>
              <span className="text-slate-400">Calculated at delivery</span>
            </div>
            <div className="flex justify-between font-bold text-slate-900 dark:text-white border-t border-slate-100 dark:border-slate-800 pt-4">
              <span>Total</span>
              <span>KSh {subtotal.toLocaleString()}</span>
            </div>
            <Link href="/store/checkout" className="block text-center mt-5 py-3 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-xl transition-colors">
              Proceed to checkout
            </Link>
            <Link href="/store" className="block text-center mt-2 py-2 text-sm text-slate-500 hover:text-orange-600">
              Continue shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
