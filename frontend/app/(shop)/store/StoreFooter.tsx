import Link from "next/link";
import { Department } from "@/types";

export default function StoreFooter({
  storeName = "Ahadi Store",
  departments = [],
}: {
  storeName?: string;
  departments?: Department[];
}) {
  return (
    <footer className="mt-16 bg-slate-900 dark:bg-slate-950 text-slate-300">
      {/* Trust strip */}
      <div className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-2 md:grid-cols-4 gap-5 text-sm">
          {[
            { title: "Genuine Guarantee", sub: "Authentic products or your money back", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
            { title: "Pay on Delivery", sub: "No upfront payment needed", icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" },
            { title: "Countrywide Delivery", sub: "Door delivery or pickup points", icon: "M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8h4l3 3v5a1 1 0 01-1 1h-1" },
            { title: "Easy Returns", sub: "Hassle-free refund process", icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" },
          ].map((t) => (
            <div key={t.title} className="flex items-start gap-3">
              <span className="w-9 h-9 rounded-lg bg-orange-500/15 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={t.icon} /></svg>
              </span>
              <div>
                <p className="font-semibold text-white text-[13px]">{t.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{t.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Link columns */}
      <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
            </div>
            <p className="font-extrabold text-white text-lg">{storeName}</p>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
            Quality products across every department — kitchenware, fashion, electronics
            and more. Pay on delivery anywhere in Kenya, backed by our genuine guarantee.
          </p>
        </div>

        <div>
          <p className="font-semibold text-white mb-3">Shop</p>
          <ul className="space-y-2 text-slate-400">
            {departments.slice(0, 6).map((d) => (
              <li key={d.id}>
                <Link href={`/store/browse?dept=${d.slug}`} className="hover:text-orange-400 transition-colors">{d.name}</Link>
              </li>
            ))}
            <li><Link href="/store/browse" className="hover:text-orange-400 transition-colors">All products</Link></li>
          </ul>
        </div>

        <div>
          <p className="font-semibold text-white mb-3">Customer Care</p>
          <ul className="space-y-2 text-slate-400">
            <li><Link href="/store/track" className="hover:text-orange-400 transition-colors">Track your order</Link></li>
            <li><Link href="/store/reviews" className="hover:text-orange-400 transition-colors">Store reviews</Link></li>
            <li><Link href="/store/cart" className="hover:text-orange-400 transition-colors">Your cart</Link></li>
          </ul>
        </div>

        <div>
          <p className="font-semibold text-white mb-3">Why shop with us</p>
          <ul className="space-y-2 text-slate-400 text-xs leading-relaxed">
            <li>✓ Inspected before dispatch</li>
            <li>✓ Transparent delivery fees by zone</li>
            <li>✓ Real reviews from verified buyers</li>
            <li>✓ Friendly support, 7 days a week</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} {storeName}. All rights reserved.</p>
          <p>Pay on delivery · Genuine guarantee · Easy returns</p>
        </div>
      </div>
    </footer>
  );
}
