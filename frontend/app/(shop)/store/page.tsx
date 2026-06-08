import { Product, ShopCategory, Department } from "@/types";
import StoreGrid from "./StoreGrid";

const API = process.env.INTERNAL_API_URL ?? "http://localhost:8000";

async function getData() {
  try {
    const [prodRes, catRes, deptRes, setRes] = await Promise.all([
      fetch(`${API}/shop/products`, { cache: "no-store" }),
      fetch(`${API}/shop/categories`, { cache: "no-store" }),
      fetch(`${API}/shop/departments`, { cache: "no-store" }),
      fetch(`${API}/shop/settings`, { cache: "no-store" }),
    ]);
    return {
      products: (prodRes.ok ? await prodRes.json() : []) as Product[],
      categories: (catRes.ok ? await catRes.json() : []) as ShopCategory[],
      departments: (deptRes.ok ? await deptRes.json() : []) as Department[],
      settings: (setRes.ok ? await setRes.json() : {}) as Record<string, string>,
    };
  } catch {
    return { products: [], categories: [], departments: [], settings: {} };
  }
}

export default async function StoreHome() {
  const { products, categories, departments, settings } = await getData();

  const heroTitle = settings.hero_title || "Shop quality you can trust";
  const heroSubtitle =
    settings.hero_subtitle ||
    "Genuine products, fair delivery, easy returns. Pay on delivery anywhere in Kenya.";

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white">
        <div className="max-w-6xl mx-auto px-4 py-14 sm:py-20">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight max-w-xl">{heroTitle}</h1>
          <p className="text-indigo-100 mt-3 max-w-md">{heroSubtitle}</p>

          {/* Department chips (dynamic) */}
          {departments.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6">
              {departments.map((d) => (
                <span key={d.id} className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur rounded-full px-3 py-1.5 text-sm font-medium">
                  {d.icon && <span>{d.icon}</span>}
                  {d.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Trust strip — competitive advantage surfaced */}
      <section className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-6xl mx-auto px-4 py-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-xs sm:text-sm">
          {[
            { icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", title: "Genuine Guarantee", sub: "Authentic or refund" },
            { icon: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17", title: "Pay on Delivery", sub: "No upfront payment" },
            { icon: "M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9", title: "Countrywide Delivery", sub: "Door or pickup" },
            { icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15", title: "Easy Returns", sub: "Hassle-free refunds" },
          ].map((t) => (
            <div key={t.title} className="flex flex-col items-center gap-1">
              <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={t.icon} /></svg>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{t.title}</span>
              <span className="text-slate-400">{t.sub}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <StoreGrid products={products} categories={categories} departments={departments} />
      </div>
    </div>
  );
}
