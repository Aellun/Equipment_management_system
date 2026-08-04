import { serverApi } from "@/app/lib/serverApi";
import { Customer } from "@/types";

const API = process.env.INTERNAL_API_URL ?? "http://localhost:8000";

async function getData() {
  try {
    const res = await serverApi(`${API}/customers/`, { cache: "no-store" });
    return (res.ok ? await res.json() : []) as Customer[];
  } catch {
    return [];
  }
}

export default async function CustomersPage() {
  const customers = await getData();
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Customers</h1>
        <p className="text-sm text-slate-500 mt-1">
          {customers.length} registered {customers.length === 1 ? "customer" : "customers"}
        </p>
      </div>

      {customers.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
          <p className="font-semibold text-slate-700 text-sm">No registered customers yet</p>
          <p className="text-sm text-slate-400 mt-1">Customers who create accounts in the store will appear here</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase">
              <tr>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Phone</th>
                <th className="px-5 py-3">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-900">{c.name}</td>
                  <td className="px-5 py-3 text-slate-600">{c.email}</td>
                  <td className="px-5 py-3 text-slate-600">{c.phone ?? "—"}</td>
                  <td className="px-5 py-3 text-slate-500">{new Date(c.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
