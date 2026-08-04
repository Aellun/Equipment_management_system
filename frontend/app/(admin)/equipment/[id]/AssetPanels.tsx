"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Equipment, MaintenanceLog, Reservation } from "@/types";
import { useToast } from "@/app/components/Toast";

const API = process.env.NEXT_PUBLIC_API_URL ?? "/api";

/* ================= QR asset tag ================= */
export function AssetTag({ equipment }: { equipment: Equipment }) {
  const [url, setUrl] = useState("");
  useEffect(() => setUrl(window.location.href), []);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Asset Tag</p>
      <div className="flex items-center gap-4">
        <div className="bg-white p-2 rounded-xl border border-slate-200 shrink-0">
          <QRCodeSVG value={url || equipment.serial_number} size={96} marginSize={0} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900 truncate">{equipment.name}</p>
          <p className="text-xs font-mono text-slate-500 mt-0.5">{equipment.serial_number}</p>
          <p className="text-[11px] text-slate-400 mt-2 leading-snug">
            Print and stick this on the unit — scanning it opens this asset profile.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ================= Maintenance panel ================= */
const logBadge: Record<string, string> = {
  Open: "bg-red-100 text-red-700",
  "In Progress": "bg-amber-100 text-amber-700",
  Completed: "bg-emerald-100 text-emerald-700",
  Cancelled: "bg-slate-100 text-slate-500",
};

export function MaintenancePanel({ equipment, logs }: { equipment: Equipment; logs: MaintenanceLog[] }) {
  const { toast } = useToast();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  async function openLog(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API}/maintenance/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ equipment_id: equipment.id, title, description: description || null }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.detail ?? "Could not open work log", "Error");
        return;
      }
      toast.success("Work log opened — the unit is out of service until it's completed.", "Maintenance opened");
      setShowForm(false);
      setTitle("");
      setDescription("");
      router.refresh();
    } catch {
      toast.error("Could not reach the server.", "Network error");
    } finally {
      setLoading(false);
    }
  }

  async function completeLog(log: MaintenanceLog) {
    setLoading(true);
    try {
      const res = await fetch(`${API}/maintenance/${log.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Completed" }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.detail ?? "Could not complete", "Error");
        return;
      }
      toast.success("Repair completed — the unit is back in service.", "Maintenance completed");
      router.refresh();
    } catch {
      toast.error("Could not reach the server.", "Network error");
    } finally {
      setLoading(false);
    }
  }

  const openLogs = logs.filter((l) => l.status === "Open" || l.status === "In Progress");

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
          Maintenance ({openLogs.length} open)
        </p>
        <div className="flex items-center gap-3">
          <Link href="/maintenance" className="text-xs font-semibold text-slate-400 hover:text-brand-500">All logs →</Link>
          {equipment.status !== "Retired" && equipment.status !== "Out" && (
            <button
              onClick={() => setShowForm((s) => !s)}
              className="text-xs font-semibold text-brand-600 hover:text-brand-500"
            >
              {showForm ? "Close" : "+ Open work log"}
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <form onSubmit={openLog} className="px-5 py-4 border-b border-slate-100 bg-slate-50/60 space-y-2.5">
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs doing? e.g. Replace power cable"
            className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Details (optional)"
            className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
          <button type="submit" disabled={loading} className="px-4 py-2 text-xs font-semibold bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-lg transition-colors">
            {loading ? "Opening…" : "Open work log (takes unit out of service)"}
          </button>
        </form>
      )}

      {logs.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">No maintenance history — this unit has a clean record.</p>
      ) : (
        <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
          {logs.map((l) => (
            <div key={l.id} className="px-5 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{l.title}</p>
                <p className="text-[11px] text-slate-400">
                  {new Date(l.reported_at).toLocaleDateString()}
                  {l.completed_at ? ` → ${new Date(l.completed_at).toLocaleDateString()}` : ""}
                  {l.cost ? ` · KSh ${Number(l.cost).toLocaleString()}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${logBadge[l.status]}`}>
                  {l.status}
                </span>
                {(l.status === "Open" || l.status === "In Progress") && (
                  <button
                    disabled={loading}
                    onClick={() => completeLog(l)}
                    className="px-2.5 py-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                  >
                    Complete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================= Reservations panel ================= */
const resBadge: Record<string, string> = {
  Upcoming: "bg-sky-100 text-sky-700",
  Fulfilled: "bg-emerald-100 text-emerald-700",
  Cancelled: "bg-slate-100 text-slate-500",
};

export function ReservationsPanel({ equipment, reservations }: { equipment: Equipment; reservations: Reservation[] }) {
  const fmt = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const upcoming = reservations.filter((r) => r.status === "Upcoming");

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
          Reservations ({upcoming.length} upcoming)
        </p>
        <Link href="/reservations" className="text-xs font-semibold text-brand-600 hover:text-brand-500">
          {equipment.status === "Retired" ? "View all →" : "+ Reserve this unit"}
        </Link>
      </div>
      {reservations.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">No bookings for this unit yet.</p>
      ) : (
        <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
          {reservations.map((r) => (
            <div key={r.id} className="px-5 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{r.client_name ?? `Client #${r.client_id}`}</p>
                <p className="text-[11px] text-slate-400">
                  {fmt(r.start_date)} → {fmt(r.end_date)}
                  {r.notes ? ` · ${r.notes}` : ""}
                </p>
              </div>
              <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${resBadge[r.status]}`}>
                {r.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
