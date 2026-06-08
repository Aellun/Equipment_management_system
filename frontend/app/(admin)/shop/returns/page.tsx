import { ReturnRequest } from "@/types";
import { revalidatePath } from "next/cache";
import ReturnsManager from "./ReturnsManager";

const API = process.env.INTERNAL_API_URL ?? "http://localhost:8000";

async function getData() {
  try {
    const res = await fetch(`${API}/returns/`, { cache: "no-store" });
    return (res.ok ? await res.json() : []) as ReturnRequest[];
  } catch {
    return [];
  }
}

async function refresh() {
  "use server";
  revalidatePath("/shop/returns");
}

export default async function ReturnsPage() {
  const returns = await getData();
  const pending = returns.filter((r) => r.status === "Requested").length;
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Returns &amp; Refunds</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {returns.length} request(s){pending > 0 && <span className="text-amber-600 dark:text-amber-400"> · {pending} awaiting review</span>}. Part of the Genuine Guarantee promise.
        </p>
      </div>
      <ReturnsManager returns={returns} onRefresh={refresh} />
    </div>
  );
}
