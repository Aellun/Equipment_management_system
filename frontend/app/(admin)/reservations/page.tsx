import { serverApi } from "@/app/lib/serverApi";
import { Reservation, Equipment, Client } from "@/types";
import { revalidatePath } from "next/cache";
import ReservationsManager from "./ReservationsManager";

const API = process.env.INTERNAL_API_URL ?? "http://localhost:8000";

async function getData() {
  try {
    const [resRes, eqRes, clRes] = await Promise.all([
      serverApi(`${API}/reservations/`, { cache: "no-store" }),
      serverApi(`${API}/equipment/`, { cache: "no-store" }),
      serverApi(`${API}/clients/`, { cache: "no-store" }),
    ]);
    return {
      reservations: (resRes.ok ? await resRes.json() : []) as Reservation[],
      equipment: (eqRes.ok ? await eqRes.json() : []) as Equipment[],
      clients: (clRes.ok ? await clRes.json() : []) as Client[],
    };
  } catch {
    return { reservations: [], equipment: [], clients: [] };
  }
}

async function refresh() {
  "use server";
  revalidatePath("/reservations");
}

export default async function ReservationsPage() {
  const { reservations, equipment, clients } = await getData();

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = reservations.filter((r) => r.status === "Upcoming");
  const startingToday = upcoming.filter((r) => r.start_date <= today && r.end_date >= today).length;
  const next7 = upcoming.filter((r) => {
    const diff = (new Date(r.start_date).getTime() - new Date(today).getTime()) / 86400000;
    return diff >= 0 && diff <= 7;
  }).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Reservations</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Book specific units for clients ahead of time — double bookings are blocked automatically.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Upcoming", value: upcoming.length, sub: "active bookings" },
          { label: "Active Today", value: startingToday, sub: "covering today's date" },
          { label: "Next 7 Days", value: next7, sub: "starting this week" },
          { label: "Fulfilled", value: reservations.filter((r) => r.status === "Fulfilled").length, sub: "honoured all-time" },
        ].map((c) => (
          <div key={c.label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{c.label}</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mt-2">{c.value}</p>
            <p className="text-xs text-slate-400 mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      <ReservationsManager reservations={reservations} equipment={equipment} clients={clients} onRefresh={refresh} />
    </div>
  );
}
