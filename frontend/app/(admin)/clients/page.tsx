import { serverApi } from "@/app/lib/serverApi";
import { Client } from "@/types";
import { revalidatePath } from "next/cache";
import AddClientForm from "./AddClientForm";
import ClientList from "./ClientList";

const API = process.env.INTERNAL_API_URL ?? "http://localhost:8000";

async function getClients(): Promise<Client[]> {
  try {
    const res = await serverApi(`${API}/clients/`, { cache: "no-store" });
    return res.ok ? res.json() : [];
  } catch {
    return [];
  }
}

async function refresh() {
  "use server";
  revalidatePath("/clients");
}

export default async function ClientsPage() {
  const clients = await getClients();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Clients</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {clients.length} registered client{clients.length !== 1 ? "s" : ""}
          </p>
        </div>
        <AddClientForm onAdded={refresh} />
      </div>
      <ClientList clients={clients} />
    </div>
  );
}
