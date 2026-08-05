import { serverApi } from "@/app/lib/serverApi";
import Link from "next/link";
import { Order, Product, ReturnRequest, Review } from "@/types";

const API = process.env.INTERNAL_API_URL ?? "http://localhost:8000";

async function getData() {
  try {
    const [ordRes, prodRes, retRes, revRes] = await Promise.all([
      serverApi(`${API}/orders/`, { cache: "no-store" }),
      serverApi(`${API}/products/`, { cache: "no-store" }),
      serverApi(`${API}/returns/`, { cache: "no-store" }),
      serverApi(`${API}/reviews/`, { cache: "no-store" }),
    ]);
    return {
      orders: (ordRes.ok ? await ordRes.json() : []) as Order[],
      products: (prodRes.ok ? await prodRes.json() : []) as Product[],
      returns: (retRes.ok ? await retRes.json() : []) as ReturnRequest[],
      reviews: (revRes.ok ? await revRes.json() : []) as Review[],
    };
  } catch {
    return { orders: [], products: [], returns: [], reviews: [] };
  }
}

const LOW_STOCK_AT = 5;

function StatCard({
  label, value, sublabel, href, accent, alert = false,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  href: string;
  accent: string;
  alert?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`bg-white border rounded-2xl p-5 block hover:shadow-md transition-all ${alert ? "border-amber-300" : "border-slate-200 hover:border-brand-300"}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{label}</p>
        <span className={`w-2.5 h-2.5 rounded-full ${accent}`} />
      </div>
      <p className="text-3xl font-bold text-slate-900 tracking-tight mt-3">{value}</p>
      {sublabel && <p className="text-xs text-slate-400 mt-1">{sublabel}</p>}
    </Link>
  );
}

export default async function StoreOverviewPage() {
  const { orders, products, returns, reviews } = await getData();

  const byStatus = (s: string) => orders.filter((o) => o.status === s).length;
  const pendingOrders = byStatus("Pending");
  const inFlight = byStatus("Confirmed") + byStatus("Processing") + byStatus("Shipped");
  const delivered = byStatus("Delivered");

  const today = new Date().toDateString();
  const todayOrders = orders.filter((o) => new Date(o.created_at).toDateString() === today).length;

  const revenue = orders
    .filter((o) => o.payment_status === "Paid")
    .reduce((s, o) => s + Number(o.total), 0);

  const pendingReturns = returns.filter((r) => r.status === "Requested").length;

  const lowStock = products
    .filter((p) => p.is_active)
    .flatMap((p) =>
      p.variants
        .filter((v) => v.is_active && v.stock_qty <= LOW_STOCK_AT)
        .map((v) => ({ product: p, variant: v })),
    )
    .sort((a, b) => a.variant.stock_qty - b.variant.stock_qty);

  const hiddenProducts = products.filter((p) => !p.is_active).length;
  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : null;

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);

  const statusBadge: Record<string, string> = {
    Pending: "bg-amber-100 text-amber-700",
    Confirmed: "bg-sky-100 text-sky-700",
    Processing: "bg-brand-100 text-brand-700",
    Shipped: "bg-brand-100 text-brand-700",
    Delivered: "bg-emerald-100 text-emerald-700",
    Cancelled: "bg-slate-100 text-slate-500",
  };

  return (
    <div className="max-w-6xl mx-auto space-y-7">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Store Overview</h1>
          <p className="text-sm text-slate-500 mt-1">
            Everything that needs your attention, at a glance
          </p>
        </div>
        <a
          href="/store"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-200 transition-colors"
        >
          View storefront
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
        </a>
      </div>

      {/* Needs attention */}
      {(pendingOrders > 0 || pendingReturns > 0 || lowStock.length > 0) && (
        <div className="flex items-center gap-3 px-4 py-3.5 bg-amber-50 border border-amber-200 rounded-2xl">
          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
          </div>
          <p className="text-sm font-medium text-amber-800">
            {[
              pendingOrders > 0 ? `${pendingOrders} order${pendingOrders !== 1 ? "s" : ""} awaiting confirmation` : null,
              pendingReturns > 0 ? `${pendingReturns} return request${pendingReturns !== 1 ? "s" : ""} to review` : null,
              lowStock.length > 0 ? `${lowStock.length} variant${lowStock.length !== 1 ? "s" : ""} low on stock` : null,
            ].filter(Boolean).join(" · ")}
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pending Orders" value={pendingOrders} sublabel={`${todayOrders} placed today`} href="/shop/orders" accent="bg-amber-500" alert={pendingOrders > 0} />
        <StatCard label="In Fulfilment" value={inFlight} sublabel={`${delivered} delivered all-time`} href="/shop/orders" accent="bg-brand-500" />
        <StatCard label="Revenue (Paid)" value={`KSh ${revenue.toLocaleString()}`} sublabel={`${orders.length} orders all-time`} href="/shop/orders" accent="bg-emerald-500" />
        <StatCard
          label="Catalog"
          value={products.length}
          sublabel={`${hiddenProducts} inactive · ${avgRating ? `★ ${avgRating.toFixed(1)} avg` : "no reviews yet"}`}
          href="/shop/products"
          accent="bg-sky-500"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-5 items-start">
        {/* Low stock */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-700">Low Stock (≤ {LOW_STOCK_AT})</p>
            <Link href="/shop/products" className="text-xs font-semibold text-brand-600 hover:text-brand-500">Manage products →</Link>
          </div>
          {lowStock.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">All variants are sufficiently stocked 🎉</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {lowStock.slice(0, 8).map(({ product, variant }) => (
                <div key={variant.id} className="flex items-center justify-between px-5 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{product.name}</p>
                    <p className="text-xs text-slate-400 truncate">{variant.variant_name} · {variant.sku}</p>
                  </div>
                  <span className={`shrink-0 ml-3 text-xs font-bold px-2.5 py-1 rounded-full ${variant.stock_qty === 0 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                    {variant.stock_qty === 0 ? "Out of stock" : `${variant.stock_qty} left`}
                  </span>
                </div>
              ))}
              {lowStock.length > 8 && (
                <p className="px-5 py-3 text-xs text-slate-400">+ {lowStock.length - 8} more…</p>
              )}
            </div>
          )}
        </div>

        {/* Recent orders */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-700">Recent Orders</p>
            <Link href="/shop/orders" className="text-xs font-semibold text-brand-600 hover:text-brand-500">All orders →</Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">No orders yet</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentOrders.map((o) => (
                <div key={o.id} className="flex items-center justify-between px-5 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800">{o.order_number}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {o.contact_name} · {new Date(o.created_at).toLocaleDateString()} · KSh {Number(o.total).toLocaleString()}
                    </p>
                  </div>
                  <span className={`shrink-0 ml-3 text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadge[o.status] ?? ""}`}>
                    {o.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Add product", sub: "Upload or import from a link", href: "/shop/products" },
          { label: "Departments", sub: "Show / hide product lines", href: "/shop/departments" },
          { label: "Categories", sub: "Show / hide categories", href: "/shop/categories" },
          { label: "Delivery zones", sub: "Fees & coverage", href: "/shop/delivery" },
        ].map((a) => (
          <Link key={a.href + a.label} href={a.href} className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-brand-300 hover:shadow-sm transition-all">
            <p className="text-sm font-semibold text-slate-800">{a.label}</p>
            <p className="text-xs text-slate-400 mt-0.5">{a.sub}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
