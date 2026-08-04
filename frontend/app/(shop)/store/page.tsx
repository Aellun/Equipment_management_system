import Link from "next/link";
import { Product, ShopCategory, Department } from "@/types";
import HeroCarousel, { Banner } from "./HeroCarousel";
import ProductCard from "./ProductCard";
import { imgSrc } from "./lib";

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

const U = "https://images.unsplash.com";
const BANNERS: Banner[] = [
  {
    image: `${U}/photo-1556909114-f6e7ad7d3136?w=1600&q=80&auto=format&fit=crop`,
    eyebrow: "Kitchen Season",
    title: "Cook like you mean it",
    subtitle: "Chef-grade knives, cookware and appliances — inspected before dispatch.",
    cta: "Shop Kitchenware",
    href: "/store/browse?dept=kitchenware",
  },
  {
    image: `${U}/photo-1607082348824-0a96f2a4b9da?w=1600&q=80&auto=format&fit=crop`,
    eyebrow: "Pay on Delivery",
    title: "Order now, pay at your door",
    subtitle: "No upfront payment. Countrywide delivery with transparent fees by zone.",
    cta: "Browse All Products",
    href: "/store/browse",
  },
  {
    image: `${U}/photo-1544441893-675973e31985?w=1600&q=80&auto=format&fit=crop`,
    eyebrow: "Style Refresh",
    title: "Wardrobe staples that last",
    subtitle: "Apparel, sneakers and accessories with our genuine guarantee.",
    cta: "Shop Fashion",
    href: "/store/browse?dept=clothing",
  },
  {
    image: `${U}/photo-1583847268964-b28dc8f51f92?w=1600&q=80&auto=format&fit=crop`,
    eyebrow: "Home & Living",
    title: "Make your space yours",
    subtitle: "Décor, bedding and furniture — handpicked for quality and comfort.",
    cta: "Shop Home & Living",
    href: "/store/browse?dept=home-living",
  },
];

function SectionHeading({ title, sub, href }: { title: string; sub?: string; href: string }) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">{title}</h2>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
      <Link href={href} className="text-sm font-semibold text-orange-600 hover:text-orange-500 flex items-center gap-1 shrink-0">
        View all
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
      </Link>
    </div>
  );
}

export default async function StoreHome() {
  const { products, categories, departments, settings } = await getData();

  // Admin-configurable hero copy (Store Settings) overrides the generic banner
  const banners = BANNERS.map((b, i) =>
    i === 1
      ? {
          ...b,
          title: settings.hero_title || b.title,
          subtitle: settings.hero_subtitle || b.subtitle,
        }
      : b,
  );

  const byNewest = [...products].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const topRated = [...products]
    .filter((p) => p.review_count > 0)
    .sort((a, b) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0) || b.review_count - a.review_count);

  // Pick a representative product image for each department tile
  const deptImage = (d: Department) =>
    products.find((p) => p.department_id === d.id && p.images.length)?.images[0]?.url;

  return (
    <div className="max-w-7xl mx-auto px-4">
      {/* ===== Hero: sidebar + carousel + info rail ===== */}
      <section className="grid lg:grid-cols-[220px_1fr_240px] gap-4 py-4">
        {/* Department sidebar (desktop) */}
        <aside className="hidden lg:block bg-white border border-slate-200 rounded-xl py-3 overflow-hidden">
          <p className="px-4 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
            Departments
          </p>
          <div className="pt-1">
            {departments.map((d) => (
              <Link
                key={d.id}
                href={`/store/browse?dept=${d.slug}`}
                className="flex items-center justify-between px-4 py-2 text-[13px] text-slate-700 hover:bg-orange-50 hover:text-orange-600 transition-colors group"
              >
                <span className="flex items-center gap-2.5 font-medium">
                  {d.icon && <span>{d.icon}</span>}
                  {d.name}
                </span>
                <svg className="w-3 h-3 text-slate-300 group-hover:text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
              </Link>
            ))}
            <Link
              href="/store/browse"
              className="flex items-center gap-2.5 px-4 py-2 mt-1 text-[13px] font-semibold text-orange-600 hover:bg-orange-50 transition-colors"
            >
              View all products →
            </Link>
          </div>
        </aside>

        {/* Carousel */}
        <HeroCarousel banners={banners} />

        {/* Info rail (desktop) */}
        <aside className="hidden lg:flex flex-col gap-3">
          {[
            {
              title: "Pay on Delivery",
              sub: "Order now, pay when it arrives at your door.",
              icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
              tint: "bg-orange-50 border-orange-100",
              iconTint: "bg-orange-100 text-orange-600",
            },
            {
              title: "Genuine Guarantee",
              sub: "Every item verified authentic — or your money back.",
              icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
              tint: "bg-emerald-50 border-emerald-100",
              iconTint: "bg-emerald-100 text-emerald-600",
            },
            {
              title: "Track Every Step",
              sub: "Follow your order from confirmation to delivery.",
              icon: "M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8h4l3 3v5a1 1 0 01-1 1h-1",
              tint: "bg-sky-50 border-sky-100",
              iconTint: "bg-sky-100 text-sky-600",
            },
          ].map((c) => (
            <div key={c.title} className={`flex-1 border rounded-xl p-4 flex flex-col justify-center ${c.tint}`}>
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${c.iconTint}`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={c.icon} /></svg>
              </span>
              <p className="text-[13px] font-bold text-slate-900">{c.title}</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-snug">{c.sub}</p>
            </div>
          ))}
        </aside>
      </section>

      {/* ===== Shop by department ===== */}
      {departments.length > 0 && (
        <section className="py-6">
          <SectionHeading title="Shop by Department" href="/store/browse" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {departments.map((d) => {
              const image = deptImage(d);
              return (
                <Link
                  key={d.id}
                  href={`/store/browse?dept=${d.slug}`}
                  className="group bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-orange-300 hover:shadow-md transition-all text-center"
                >
                  <div className="aspect-[4/3] bg-slate-100 overflow-hidden flex items-center justify-center">
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imgSrc(image)} alt={d.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <span className="text-3xl">{d.icon ?? "🛍️"}</span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-slate-700 py-2.5 px-1 group-hover:text-orange-600 transition-colors">
                    {d.icon ? `${d.icon} ` : ""}{d.name}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ===== New arrivals ===== */}
      {byNewest.length > 0 && (
        <section className="py-6">
          <SectionHeading title="New Arrivals" sub="Fresh stock, just landed" href="/store/browse?sort=new" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {byNewest.slice(0, 10).map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* ===== Top rated ===== */}
      {topRated.length > 0 && (
        <section className="py-6">
          <SectionHeading title="Top Rated" sub="Loved by verified buyers" href="/store/browse?sort=rating" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {topRated.slice(0, 5).map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* ===== Category quick links ===== */}
      {categories.length > 0 && (
        <section className="py-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-sm font-bold text-slate-900 mb-3">Browse by category</h2>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/store/browse?cat=${c.slug}`}
                  className="px-3.5 py-1.5 rounded-full border border-slate-200 text-[13px] font-medium text-slate-600 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== Everything else ===== */}
      {products.length > 0 && (
        <section className="py-6 pb-10">
          <SectionHeading title="Just for You" sub={`${products.length} products in store`} href="/store/browse" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {byNewest.slice(0, 20).map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
          <div className="text-center mt-8">
            <Link
              href="/store/browse"
              className="inline-flex items-center gap-2 px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-full transition-colors shadow-md shadow-orange-500/20"
            >
              Browse all products
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </Link>
          </div>
        </section>
      )}

      {products.length === 0 && (
        <div className="text-center py-24">
          <p className="font-semibold text-slate-700">The store is being stocked</p>
          <p className="text-sm text-slate-400 mt-1">Check back shortly — great things are coming.</p>
        </div>
      )}
    </div>
  );
}
