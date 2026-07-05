import { serverApi } from "@/app/lib/serverApi";
import { Order } from "@/types";
import { revalidatePath } from "next/cache";
import OrdersManager from "./OrdersManager";

const API = process.env.INTERNAL_API_URL ?? "http://localhost:8000";

async function getData() {
  try {
    const res = await serverApi(`${API}/orders/`, { cache: "no-store" });
    return (res.ok ? await res.json() : []) as Order[];
  } catch {
    return [];
  }
}

async function refresh() {
  "use server";
  revalidatePath("/shop/orders");
}

export default async function OrdersPage() {
  const orders = await getData();
  const pending = orders.filter((o) => o.status === "Pending").length;
  const revenue = orders
    .filter((o) => o.payment_status === "Paid")
    .reduce((s, o) => s + Number(o.total), 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Orders</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {orders.length} orders · {pending} pending · KSh {revenue.toLocaleString()} collected
        </p>
      </div>
      <OrdersManager orders={orders} onRefresh={refresh} />
    </div>
  );
}
