"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Reservation, Equipment, Client } from "@/types";
import { useToast } from "@/app/components/Toast";

const API = process.env.NEXT_PUBLIC_API_URL ?? "/api";

const statusBadge: Record<string, string> = {
  Upcoming: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400",
  Fulfilled: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  Cancelled: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

const FILTERS = ["Upcoming", "All", "Fulfilled", "Cancelled"] as const;

export default function ReservationsManager({
  reservations, equipment, clients, onRefresh,
}: {
  reservations: Reservation[];
  equipment: Equipment[];
  clients: Client[];
  onRefresh: () => void;
}) {
  const { toast } = useToast();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Upcoming");
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(
    () => (filter === "All" ? reservations : reservations.filter((r) => r.status === filter)),
    [reservations, filter],
  );

  async function patchReservation(r: Reservation, status: string, okMsg: string) {
    setLoading(true);
    try {
      const res = await fetch(`${API}/reservations/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.detail ?? "Update failed", "Error");
        return;
      }
      toast.success(okMsg, "Reservation updated");
      onRefresh();
    } catch {
      toast.error("Could not reach the server.", "Network error");
    } finally {
      setLoading(false);
    }
  }

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl gap-0.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-all font-semibold ${
                filter === f
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          New Reservation
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
              {reservations.length === 0 ? "No reservations yet" : "Nothing matches this filter"}
            </p>
            <p className="text-sm text-slate-400 mt-1">
              {reservations.length === 0 ? "Reserve a unit for a client's upcoming event." : "Try another status."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[680px]">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Asset</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Client</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Period</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3.5">
                      <Link href={`/equipment/${r.equipment_id}`} className="font-medium text-brand-600 dark:text-brand-400 hover:underline">
                        {r.equipment_name ?? `#${r.equipment_id}`}
                      </Link>
                      <p className="text-[11px] font-mono text-slate-400">{r.equipment_serial}</p>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300">{r.client_name ?? `#${r.client_id}`}</td>
                    <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300">
                      {fmt(r.start_date)} <span className="text-slate-300">→</span> {fmt(r.end_date)}
                      {r.notes && <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1 max-w-[200px]">{r.notes}</p>}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusBadge[r.status]}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      {r.status === "Upcoming" && (
                        <>
                          <button
                            disabled={loading}
                            onClick={() => patchReservation(r, "Fulfilled", "Reservation marked fulfilled.")}
                            className="px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-lg transition-colors mr-1.5"
                          >
                            Fulfil
                          </button>
                          <button
                            disabled={loading}
                            onClick={() => patchReservation(r, "Cancelled", "Reservation cancelled — the dates are free again.")}
                            className="px-3 py-1.5 text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showNew && (
        <NewReservationModal
          equipment={equipment}
          clients={clients}
          onClose={() => setShowNew(false)}
          onSaved={() => { setShowNew(false); onRefresh(); }}
        />
      )}
    </div>
  );
}

function NewReservationModal({
  equipment, clients, onClose, onSaved, presetEquipmentId,
}: {
  equipment: Equipment[];
  clients: Client[];
  onClose: () => void;
  onSaved: () => void;
  presetEquipmentId?: number;
}) {
  const { toast } = useToast();
  const [equipmentId, setEquipmentId] = useState(presetEquipmentId ? String(presetEquipmentId) : "");
  const [clientId, setClientId] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const eligible = equipment.filter((e) => e.status !== "Retired");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API}/reservations/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equipment_id: Number(equipmentId),
          client_id: Number(clientId),
          start_date: start,
          end_date: end,
          notes: notes || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.detail ?? "Could not create the reservation", "Booking failed");
        return;
      }
      toast.success("Unit reserved — it now appears in upcoming bookings.", "Reserved");
      onSaved();
    } catch {
      toast.error("Could not reach the server.", "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl w-full max-w-md animate-fadeIn">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-semibold text-slate-900 dark:text-white">New Reservation</h3>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Unit <span className="text-red-500">*</span></label>
            <select
              required
              value={equipmentId}
              onChange={(e) => setEquipmentId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="">Select a unit…</option>
              {eligible.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} — {e.serial_number} ({e.status})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Client <span className="text-red-500">*</span></label>
            <select
              required
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="">Select a client…</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">From <span className="text-red-500">*</span></label>
              <input
                type="date"
                required
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">To <span className="text-red-500">*</span></label>
              <input
                type="date"
                required
                value={end}
                min={start}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Notes</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Wedding at Karen Gardens"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={loading} className="flex-1 py-2.5 text-sm bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl transition-colors font-semibold">
              {loading ? "Reserving…" : "Reserve Unit"}
            </button>
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors font-medium">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
