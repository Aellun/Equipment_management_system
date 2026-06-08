import { Transaction, Equipment, Client, Category } from "@/types";
import { revalidatePath } from "next/cache";
import CheckoutBrowser from "./CheckoutBrowser";
import TransactionHistory from "./TransactionHistory";

const API = process.env.INTERNAL_API_URL ?? "http://localhost:8000";

async function fetchAll() {
  try {
    const [txRes, eqRes, clRes, catRes] = await Promise.all([
      fetch(`${API}/transactions/`, { cache: "no-store" }),
      fetch(`${API}/equipment/`, { cache: "no-store" }),
      fetch(`${API}/clients/`, { cache: "no-store" }),
      fetch(`${API}/categories/`, { cache: "no-store" }),
    ]);
    return {
      transactions: (txRes.ok ? await txRes.json() : []) as Transaction[],
      equipment: (eqRes.ok ? await eqRes.json() : []) as Equipment[],
      clients: (clRes.ok ? await clRes.json() : []) as Client[],
      categories: (catRes.ok ? await catRes.json() : []) as Category[],
    };
  } catch {
    return { transactions: [], equipment: [], clients: [], categories: [] };
  }
}

async function refresh() {
  "use server";
  revalidatePath("/transactions");
}

export default async function TransactionsPage() {
  const { transactions, equipment, clients, categories } = await fetchAll();
  const availableEquipment = equipment.filter((e) => e.status === "Available");
  const activeCount = transactions.filter((t) => !t.audit_log).length;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Transactions</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Check out equipment to clients · {activeCount} active loan{activeCount !== 1 ? "s" : ""}
        </p>
      </div>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Check Out Equipment</h2>
          {availableEquipment.length > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
              {availableEquipment.length} available
            </span>
          )}
        </div>
        <CheckoutBrowser
          equipment={availableEquipment}
          clients={clients}
          categories={categories}
          onDone={refresh}
        />
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Transaction History</h2>
        <TransactionHistory transactions={transactions} onRefresh={refresh} />
      </section>
    </div>
  );
}
