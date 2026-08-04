"use client";

import { useState, useEffect, useCallback } from "react";
import { Review, ReviewSummary } from "@/types";
import { useToast } from "@/app/components/Toast";
import { Stars, StarInput } from "../../Stars";

const API = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export default function ProductReviews({ productId }: { productId: number }) {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [rating, setRating] = useState(5);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [rRes, sRes] = await Promise.all([
        fetch(`${API}/reviews/product/${productId}`, { cache: "no-store" }),
        fetch(`${API}/reviews/product/${productId}/summary`, { cache: "no-store" }),
      ]);
      if (rRes.ok) setReviews(await rRes.json());
      if (sRes.ok) setSummary(await sRes.json());
    } catch { /* ignore */ }
  }, [productId]);

  useEffect(() => { load(); }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(`${API}/reviews/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          review_type: "Product",
          product_id: productId,
          rating,
          title: title || null,
          body: body || null,
          reviewer_name: name,
          reviewer_email: email || null,
        }),
      });
      if (!res.ok) { toast.error("Could not submit review", "Failed"); return; }
      toast.success("Thanks for your review!", "Review submitted");
      setShowForm(false);
      setTitle(""); setBody(""); setRating(5);
      load();
    } catch {
      toast.error("Could not reach the server.", "Network error");
    } finally { setBusy(false); }
  }

  return (
    <div className="mt-12 border-t border-slate-200 pt-8">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-slate-900">Customer Reviews</h2>
        <button onClick={() => setShowForm((v) => !v)} className="text-sm font-semibold text-orange-600 hover:text-orange-500">
          {showForm ? "Cancel" : "Write a review"}
        </button>
      </div>

      {summary && summary.review_count > 0 && (
        <div className="flex items-center gap-4 mb-6">
          <div className="text-center">
            <p className="text-4xl font-bold text-slate-900">{summary.avg_rating?.toFixed(1)}</p>
            <Stars value={summary.avg_rating ?? 0} />
            <p className="text-xs text-slate-400 mt-1">{summary.review_count} review(s)</p>
          </div>
          <div className="flex-1 space-y-1">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = summary.breakdown[star] ?? 0;
              const pct = summary.review_count ? (count / summary.review_count) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 w-3">{star}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-slate-400 w-6 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={submit} className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Your rating</label>
            <StarInput value={rating} onChange={setRating} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name *" className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm" />
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (for Verified Purchase badge)" className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm" />
          </div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)" className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm" />
          <textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Share your experience…" className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm resize-none" />
          <button type="submit" disabled={busy} className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold rounded-xl disabled:opacity-50">{busy ? "Submitting…" : "Submit review"}</button>
        </form>
      )}

      {reviews.length === 0 ? (
        <p className="text-sm text-slate-400">No reviews yet. Be the first to review this product.</p>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="border-b border-slate-100 pb-4 last:border-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Stars value={r.rating} size={14} />
                {r.title && <span className="font-semibold text-slate-800 text-sm">{r.title}</span>}
                {r.verified_purchase && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    Verified Purchase
                  </span>
                )}
              </div>
              {r.body && <p className="text-sm text-slate-600 mt-1.5">{r.body}</p>}
              <p className="text-xs text-slate-400 mt-1.5">{r.reviewer_name} · {new Date(r.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
