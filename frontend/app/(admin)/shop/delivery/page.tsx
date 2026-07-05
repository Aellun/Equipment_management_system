import { serverApi } from "@/app/lib/serverApi";
import { DeliveryZone } from "@/types";
import { revalidatePath } from "next/cache";
import DeliveryManager from "./DeliveryManager";

const API = process.env.INTERNAL_API_URL ?? "http://localhost:8000";

async function getData() {
  try {
    const res = await serverApi(`${API}/delivery-zones/`, { cache: "no-store" });
    return (res.ok ? await res.json() : []) as DeliveryZone[];
  } catch {
    return [];
  }
}

async function refresh() {
  "use server";
  revalidatePath("/shop/delivery");
}

export default async function DeliveryPage() {
  const zones = await getData();
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Delivery Zones</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Set delivery fees by region (like Jumia/Kilimall). Customers pick a zone at checkout and see the fee before paying.
          Set a &ldquo;free over&rdquo; threshold to offer free door delivery on larger orders.
        </p>
      </div>
      <DeliveryManager zones={zones} onRefresh={refresh} />
    </div>
  );
}
