"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

export type Banner = {
  image: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
};

export default function HeroCarousel({ banners }: { banners: Banner[] }) {
  const [index, setIndex] = useState(0);

  const next = useCallback(() => setIndex((i) => (i + 1) % banners.length), [banners.length]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const id = setInterval(next, 5500);
    return () => clearInterval(id);
  }, [next, banners.length]);

  if (!banners.length) return null;

  return (
    <div className="relative h-64 sm:h-80 lg:h-full min-h-[16rem] rounded-xl overflow-hidden group">
      {banners.map((b, i) => (
        <div
          key={i}
          className={`absolute inset-0 transition-opacity duration-700 ${i === index ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={b.image} alt={b.title} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/40 to-transparent" />
          <div className="relative h-full flex flex-col justify-center px-6 sm:px-10 max-w-md">
            <p className="text-orange-400 text-xs font-bold uppercase tracking-widest">{b.eyebrow}</p>
            <h2 className="text-white text-2xl sm:text-3xl font-extrabold tracking-tight mt-2 leading-tight">{b.title}</h2>
            <p className="text-slate-200 text-sm mt-2 leading-relaxed">{b.subtitle}</p>
            <Link
              href={b.href}
              className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-full w-fit transition-colors shadow-lg shadow-orange-900/30"
            >
              {b.cta}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </Link>
          </div>
        </div>
      ))}

      {/* Dots */}
      {banners.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {banners.map((_, i) => (
            <button
              key={i}
              aria-label={`Slide ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-orange-500" : "w-1.5 bg-white/60 hover:bg-white"}`}
            />
          ))}
        </div>
      )}

      {/* Arrows */}
      {banners.length > 1 && (
        <>
          <button
            aria-label="Previous slide"
            onClick={() => setIndex((i) => (i - 1 + banners.length) % banners.length)}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button
            aria-label="Next slide"
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
          </button>
        </>
      )}
    </div>
  );
}
