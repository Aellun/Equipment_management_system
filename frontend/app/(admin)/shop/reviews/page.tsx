import { serverApi } from "@/app/lib/serverApi";
import { Review } from "@/types";
import { revalidatePath } from "next/cache";
import ReviewsManager from "./ReviewsManager";

const API = process.env.INTERNAL_API_URL ?? "http://localhost:8000";

async function getData() {
  try {
    const res = await serverApi(`${API}/reviews/`, { cache: "no-store" });
    return (res.ok ? await res.json() : []) as Review[];
  } catch {
    return [];
  }
}

async function refresh() {
  "use server";
  revalidatePath("/shop/reviews");
}

export default async function AdminReviewsPage() {
  const reviews = await getData();
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Reviews</h1>
        <p className="text-sm text-slate-500 mt-1">
          {reviews.length} review(s) across products and the store. Remove any that are spam or inappropriate.
        </p>
      </div>
      <ReviewsManager reviews={reviews} onRefresh={refresh} />
    </div>
  );
}
