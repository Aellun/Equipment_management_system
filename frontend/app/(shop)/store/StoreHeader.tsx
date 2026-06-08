"use client";

import Link from "next/link";
import { useStore } from "./StoreProvider";

export default function StoreHeader() {
  const { cartCount } = useStore();

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link href="/store" className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div className="leading-tight">
            <p className="font-bold text-slate-900 dark:text-white text-sm">Fab Kitchenware</p>
            <p className="text-[11px] text-slate-400">Quality cookware & more</p>
          </div>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-3">
          <Link href="/store" className="px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-colors">
            Shop
          </Link>
          <Link href="/store/track" className="hidden sm:inline px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-colors">
            Track Order
          </Link>
          <Link href="/store/reviews" className="hidden sm:inline px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-colors">
            Reviews
          </Link>
          <Link href="/store/cart" className="relative px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-colors flex items-center gap-1.5">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-indigo-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {cartCount}
              </span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}
