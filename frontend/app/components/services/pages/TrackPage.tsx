"use client";

import { useState } from "react";
import { tasksApi, mediaUrl, KES, type Task } from "../client";
import { StatusBadge } from "../ui";
import { Icon } from "../Icon";

const TIMELINE: [string, string][] = [
  ["quoted", "Booked"],
  ["paid", "Paid (escrow held)"],
  ["assigned", "Crew assigned"],
  ["in_progress", "In progress"],
  ["proof_submitted", "Proof submitted"],
  ["completed", "Completed"],
];

export default function TrackPage({ label }: { label: string }) {
  const [ref, setRef] = useState("");
  const [task, setTask] = useState<Task | null>(null);
  const [error, setError] = useState("");

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setTask(null);
    try {
      setTask(await tasksApi.track(ref.trim()));
    } catch {
      setError("No booking found with that reference.");
    }
  };

  const currentIdx = task ? TIMELINE.findIndex(([s]) => s === task.status) : -1;

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-3xl font-extrabold">Track your {label.toLowerCase()}</h1>
      <p className="mt-1 text-slate-600">Enter your reference (e.g. MME-AB12CD).</p>

      <form onSubmit={search} className="mt-6 flex gap-2">
        <input className="input" placeholder="MME-XXXXXX" value={ref} onChange={(e) => setRef(e.target.value.toUpperCase())} />
        <button className="btn-primary">Track</button>
      </form>

      {error && <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {task && (
        <div className="card mt-6 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">{task.reference}</p>
              <h2 className="text-xl font-bold">{task.service_name}</h2>
            </div>
            <StatusBadge status={task.status} />
          </div>

          <div className="mt-6 space-y-4">
            {TIMELINE.map(([s, lab], i) => {
              const done = i <= currentIdx;
              return (
                <div key={s} className="flex items-center gap-3">
                  <span className={`grid h-6 w-6 place-items-center rounded-full text-xs ${done ? "bg-brand-500 text-white" : "bg-slate-200 text-slate-400"}`}>
                    {done ? <Icon name="check" className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <span className={done ? "font-medium" : "text-slate-400"}>{lab}</span>
                </div>
              );
            })}
          </div>

          {task.proof_photo_url && (
            <div className="mt-6">
              <p className="label">Proof of completion</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaUrl(task.proof_photo_url)} alt="proof" className="mt-1 max-h-64 rounded-xl ring-1 ring-slate-200" />
              {task.proof_note && <p className="mt-2 text-sm text-slate-600">{task.proof_note}</p>}
            </div>
          )}

          <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4 text-sm">
            <span className="text-slate-500">Total</span>
            <span className="font-bold text-brand-600">{KES(task.total_price)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
