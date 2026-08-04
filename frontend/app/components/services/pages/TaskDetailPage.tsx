"use client";

import { useEffect, useState } from "react";
import { tasksApi, mediaUrl, KES, type Task, type Quote } from "../client";
import { useServicesAuth } from "../ServicesAuthProvider";
import { PriceBreakdown, Spinner, StatusBadge } from "../ui";
import { Icon } from "../Icon";

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="font-medium capitalize">{value}</p>
    </div>
  );
}

export default function TaskDetailPage({ id }: { id: string }) {
  const { user } = useServicesAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [busy, setBusy] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  const load = () => tasksApi.get(id).then(setTask);
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!task) return <Spinner />;

  const isCustomer = user?.role === "customer";
  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="card p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-400">{task.reference}</p>
            <h1 className="text-2xl font-bold">{task.service_name}</h1>
            <p className="text-sm text-slate-500">{task.category}</p>
          </div>
          <div className="text-right">
            <StatusBadge status={task.status} />
            {task.payment_status && (
              <p className="mt-1 text-xs text-slate-400">
                payment: <StatusBadge status={task.payment_status} />
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
          <Info label="Pickup" value={task.pickup_location || "—"} />
          <Info label="Drop-off" value={task.dropoff_location || "—"} />
          <Info label="Urgency" value={task.urgency} />
          <Info label="Distance" value={`${task.distance_km} km`} />
          {task.runner && (
            <Info
              label="Crew"
              value={
                <span className="flex items-center gap-1">
                  {task.runner.full_name} ·<Icon name="star" filled className="h-3.5 w-3.5 text-gold-500" />
                  {task.runner.rating_avg ?? "—"}
                </span>
              }
            />
          )}
          {task.customer && user?.role !== "customer" && (
            <Info
              label="Customer"
              value={
                <span className="flex flex-col">
                  <span>{task.customer.full_name}</span>
                  {task.customer.phone && (
                    <a href={`tel:${task.customer.phone}`} className="link inline-flex items-center gap-1 normal-case">
                      <Icon name="phone" className="h-3.5 w-3.5" />
                      {task.customer.phone}
                    </a>
                  )}
                </span>
              }
            />
          )}
          {task.notes && <Info label="Notes" value={task.notes} />}
        </div>
      </div>

      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {task.proof_photo_url && (
        <div className="card p-6">
          <h2 className="font-bold">Proof of completion</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mediaUrl(task.proof_photo_url)} alt="proof" className="mt-3 max-h-72 rounded-xl ring-1 ring-slate-200" />
          {task.proof_note && <p className="mt-2 text-sm text-slate-600">{task.proof_note}</p>}
        </div>
      )}

      <div className="card p-6">
        <h2 className="mb-3 font-bold">Payment</h2>
        <PriceBreakdown q={task as unknown as Quote} />
      </div>

      {isCustomer && task.status === "proof_submitted" && (
        <div className="card border-2 border-brand-200 p-6">
          <h2 className="font-bold">Review the work</h2>
          <p className="mt-1 text-sm text-slate-500">Happy with the proof above? Approve to mark this {KES(task.total_price)} job as completed.</p>
          <div className="mt-4 flex gap-3">
            <button className="btn-primary flex-1" disabled={busy} onClick={() => act(() => tasksApi.accept(task.id))}>
              <Icon name="check" className="h-4 w-4" /> Approve &amp; complete
            </button>
            <button className="btn-ghost" disabled={busy} onClick={() => act(() => tasksApi.dispute(task.id))}>
              <Icon name="alert-triangle" className="h-4 w-4" /> Raise dispute
            </button>
          </div>
        </div>
      )}

      {isCustomer && ["quoted", "paid", "assigned"].includes(task.status) && (
        <button className="btn-ghost w-full" disabled={busy} onClick={() => act(() => tasksApi.cancel(task.id))}>
          Cancel booking
        </button>
      )}

      {isCustomer && task.status === "completed" && (
        <div className="card p-6">
          <h2 className="font-bold">Rate your crew</h2>
          <div className="mt-3 flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setRating(n)} className={n <= rating ? "text-gold-500" : "text-slate-300"} aria-label={`${n} stars`}>
                <Icon name="star" filled className="h-7 w-7" />
              </button>
            ))}
          </div>
          <textarea className="input mt-3" rows={2} placeholder="Leave a comment…" value={comment} onChange={(e) => setComment(e.target.value)} />
          <button className="btn-primary mt-3 w-full" disabled={busy} onClick={() => act(() => tasksApi.review(task.id, { rating, comment }))}>
            Submit review
          </button>
        </div>
      )}
    </div>
  );
}
