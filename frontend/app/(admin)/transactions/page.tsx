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

function StatCard({
  label, value, sub, accent, icon,
}: {
  label: string;
  value: number | string;
  sub: string;
  accent: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-3.5">
      <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${accent}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-none">{value}</p>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">{label}</p>
        <p className="text-[11px] text-slate-400 dark:text-slate-500">{sub}</p>
      </div>
    </div>
  );
}

export default async function TransactionsPage() {
  const { transactions, equipment, clients, categories } = await fetchAll();
  const availableEquipment = equipment.filter((e) => e.status === "Available");

  const now = new Date();
  const active = transactions.filter((t) => !t.audit_log);
  const overdue = active.filter((t) => new Date(t.due_date) < now);
  const dueSoon = active.filter((t) => {
    const due = new Date(t.due_date);
    return due >= now && due.getTime() - now.getTime() <= 7 * 24 * 3600 * 1000;
  });
  const activeClients = new Set(active.map((t) => t.client_id)).size;

  return (
    <div className="max-w-6xl mx-auto space-y-7">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Check-Out &amp; Returns</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Pick items by quantity, check them out to a client, and process returns with a quality check.
        </p>
      </div>

      {/* Loan stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Units on Loan"
          value={active.length}
          sub={`with ${activeClients} client${activeClients !== 1 ? "s" : ""}`}
          accent="bg-amber-100 dark:bg-amber-900/40"
          icon={<svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>}
        />
        <StatCard
          label="Overdue"
          value={overdue.length}
          sub={overdue.length > 0 ? "follow up with clients" : "nothing overdue"}
          accent="bg-red-100 dark:bg-red-900/40"
          icon={<svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
        />
        <StatCard
          label="Due This Week"
          value={dueSoon.length}
          sub="returns expected"
          accent="bg-sky-100 dark:bg-sky-900/40"
          icon={<svg className="w-5 h-5 text-sky-600 dark:text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          label="Ready to Lend"
          value={availableEquipment.length}
          sub="units in the available pool"
          accent="bg-emerald-100 dark:bg-emerald-900/40"
          icon={<svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">New Checkout</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Set the quantity per item — specific units are assigned automatically from the pool.
            </p>
          </div>
        </div>
        <CheckoutBrowser
          equipment={availableEquipment}
          clients={clients}
          categories={categories}
          onDone={refresh}
        />
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Loans &amp; Returns</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Grouped by item and client — expand a row to see individual serial numbers.
          </p>
        </div>
        <TransactionHistory transactions={transactions} onRefresh={refresh} />
      </section>
    </div>
  );
}
