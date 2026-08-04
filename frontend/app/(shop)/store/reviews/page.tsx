"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Review, ReviewSummary } from "@/types";
import { useToast } from "@/app/components/Toast";
import { Stars, StarInput } from "../Stars";

const API = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export default function StoreReviewsPage() {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [rating, setRating] = useState(5);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [r, s] = await Promise.all([
        fetch(`${API}/reviews/store`, { cache: "no-store" }),
        fetch(`${API}/reviews/store/summary`, { cache: "no-store" }),
      ]);
      if (r.ok) setReviews(await r.json());
      if (s.ok) setSummary(await s.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(`${API}/reviews/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review_type: "Store", rating, title: title || null, body: body || null, reviewer_name: name, reviewer_email: email || null }),
      });
      if (!res.ok) { toast.error("Could not submit", "Failed"); return; }
      toast.success("Thanks for your feedback!", "Review submitted");
      setTitle(""); setBody(""); setRating(5);
      load();
    } catch {
      toast.error("Could not reach the server.", "Network error");
    } finally { setBusy(false); }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Store Reviews</h1>
      <p className="text-sm text-slate-500 mt-1">What our customers say about shopping with us.</p>

      {summary && summary.review_count > 0 && (
        <div className="flex items-center gap-3 mt-5 bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-4xl font-bold text-slate-900">{summary.avg_rating?.toFixed(1)}</p>
          <div>
            <Stars value={summary.avg_rating ?? 0} size={18} />
            <p className="text-xs text-slate-400 mt-1">Based on {summary.review_count} review(s)</p>
          </div>
        </div>
      )}

      <form onSubmit={submit} className="mt-6 bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <p className="font-semibold text-slate-900">Leave a review</p>
        <StarInput value={rating} onChange={setRating} />
        <div className="grid sm:grid-cols-2 gap-3">
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name *" className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (for Verified badge)" className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm" />
        </div>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)" className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm" />
        <textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Tell others about your experience…" className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm resize-none" />
        <button type="submit" disabled={busy} className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold rounded-xl disabled:opacity-50">{busy ? "Submitting…" : "Submit review"}</button>
      </form>

      <div className="mt-8 space-y-4">
        {reviews.length === 0 ? (
          <p className="text-sm text-slate-400">No reviews yet — be the first!</p>
        ) : reviews.map((r) => (
          <div key={r.id} className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Stars value={r.rating} size={14} />
              {r.title && <span className="font-semibold text-slate-800 text-sm">{r.title}</span>}
              {r.verified_purchase && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  Verified Customer
                </span>
              )}
            </div>
            {r.body && <p className="text-sm text-slate-600 mt-1.5">{r.body}</p>}
            <p className="text-xs text-slate-400 mt-1.5">{r.reviewer_name} · {new Date(r.created_at).toLocaleDateString()}</p>
          </div>
        ))}
      </div>

      <p className="text-center text-sm text-slate-400 mt-8">
        Need to return something? <Link href="/store/track" className="text-orange-600 font-medium">Track your order</Link> to request a return.
      </p>
    </div>
  );
}
