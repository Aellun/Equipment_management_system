"use client";

import { useEffect, useState } from "react";
import { runnerApi, tasksApi, mediaUrl, KES, type Task } from "../client";
import { Empty, Spinner, StatusBadge } from "../ui";
import { Icon } from "../Icon";

interface Profile {
  full_name: string;
  suburb: string;
  verification_status: string;
  is_available: boolean;
  rating_avg: number;
  rating_count: number;
  completed_tasks: number;
}

function JobDetails({ task }: { task: Task }) {
  const rows: [string, string, string][] = [
    ["map-pin", "Pickup", task.pickup_location || "—"],
    ["home", "Drop-off", task.dropoff_location || "—"],
    ["clock", "Urgency", `${task.urgency} · ${task.distance_km} km`],
  ];
  return (
    <dl className="mt-3 space-y-2 rounded-lg border border-line bg-stone-50 p-3 text-sm">
      {task.customer && (
        <div className="flex items-start gap-2">
          <Icon name="user" className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
          <div className="flex-1">
            <p className="font-semibold text-ink">{task.customer.full_name}</p>
            {task.customer.phone && (
              <a href={`tel:${task.customer.phone}`} className="link inline-flex items-center gap-1">
                <Icon name="phone" className="h-3.5 w-3.5" />
                {task.customer.phone}
              </a>
            )}
          </div>
        </div>
      )}
      {rows.map(([icon, label, val]) => (
        <div key={label} className="flex items-start gap-2">
          <Icon name={icon} className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
          <div>
            <span className="text-muted">{label}: </span>
            <span className="font-medium capitalize">{val}</span>
          </div>
        </div>
      ))}
      {task.notes && (
        <div className="flex items-start gap-2">
          <Icon name="pen" className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
          <div>
            <span className="text-muted">Job details: </span>
            <span className="font-medium">{task.notes}</span>
          </div>
        </div>
      )}
    </dl>
  );
}

function PoolTask({ task, reload, canClaim }: { task: Task; reload: () => void; canClaim: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const claim = async () => {
    setBusy(true);
    setError("");
    try {
      await runnerApi.claim(task.id);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not claim.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="card border-dashed p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted">{task.reference}</p>
          <p className="font-semibold">{task.service_name}</p>
          <p className="text-xs text-muted">{task.category}</p>
        </div>
        <p className="font-bold">{KES(task.total_price)}</p>
      </div>
      <JobDetails task={task} />
      <p className="mt-2 text-xs text-muted">Customer contact is shared once you claim this job.</p>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <button className="btn-primary mt-3 w-full" disabled={busy || !canClaim} onClick={claim}>
        {canClaim ? "Claim this job" : "Go available to claim"}
      </button>
    </div>
  );
}

function RunnerTask({ task, reload }: { task: Task; reload: () => void }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  const start = async () => {
    setBusy(true);
    try {
      await tasksApi.start(task.id);
      reload();
    } finally {
      setBusy(false);
    }
  };

  const submitProof = async () => {
    if (!file) {
      setError("Please attach a photo.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("proof_note", note);
      fd.append("photo", file);
      await runnerApi.submitProof(task.id, fd);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted">{task.reference}</p>
          <p className="font-semibold">{task.service_name}</p>
          <p className="text-xs text-muted">{task.category}</p>
        </div>
        <div className="text-right">
          <StatusBadge status={task.status} />
          <p className="mt-1 font-bold">{KES(task.total_price)}</p>
        </div>
      </div>

      <JobDetails task={task} />

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {task.status === "assigned" && (
        <button className="btn-primary mt-4 w-full" disabled={busy} onClick={start}>
          Start this job
        </button>
      )}

      {task.status === "in_progress" && (
        <div className="mt-4 space-y-3 border-t border-line pt-4">
          <p className="text-sm font-semibold">Submit proof of completion</p>
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-sm" />
          <input className="input" placeholder="Note (e.g. left at reception)" value={note} onChange={(e) => setNote(e.target.value)} />
          <button className="btn-primary w-full" disabled={busy} onClick={submitProof}>
            {busy ? "Uploading…" : (<><Icon name="camera" className="h-4 w-4" /> Submit proof</>)}
          </button>
        </div>
      )}

      {task.status === "proof_submitted" && (
        <div className="mt-4 rounded-xl bg-purple-50 px-4 py-3 text-sm text-purple-700">
          Proof submitted. Waiting for the customer to approve and release payment.
        </div>
      )}

      {task.proof_photo_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={mediaUrl(task.proof_photo_url)} alt="proof" className="mt-3 max-h-40 rounded-lg ring-1 ring-slate-200" />
      )}
    </div>
  );
}

export default function RunnerPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [pool, setPool] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    Promise.all([runnerApi.profile(), tasksApi.mine(), runnerApi.availableTasks()]).then(([p, t, a]) => {
      setProfile(p as unknown as Profile);
      setTasks(t);
      setPool(a);
    });

  useEffect(() => {
    load().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading || !profile) return <Spinner />;

  const toggleAvail = async () => {
    await runnerApi.setAvailability(!profile.is_available);
    load();
  };

  const active = tasks.filter((t) => ["assigned", "in_progress", "proof_submitted"].includes(t.status));
  const done = tasks.filter((t) => ["completed", "cancelled", "disputed"].includes(t.status));

  return (
    <div className="space-y-8">
      <div className="card flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <h1 className="text-2xl font-extrabold">Hi, {profile.full_name.split(" ")[0]}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-600">
            <span className="flex items-center gap-1.5">
              <Icon name="star" filled className="h-4 w-4 text-gold-500" />
              {profile.rating_avg} ({profile.rating_count})
            </span>
            <span className="flex items-center gap-1.5">
              <Icon name="check-circle" className="h-4 w-4 text-leaf-500" />
              {profile.completed_tasks} done
            </span>
            <span className="flex items-center gap-1.5">
              <Icon name="map-pin" className="h-4 w-4 text-slate-400" />
              {profile.suburb}
            </span>
            <StatusBadge status={profile.verification_status === "verified" ? "completed" : "pending"} />
          </div>
        </div>
        <button onClick={toggleAvail} className={`svc-btn ${profile.is_available ? "bg-brand-500 text-white" : "bg-slate-200 text-slate-600"}`}>
          <span className={`h-2 w-2 rounded-full ${profile.is_available ? "bg-white" : "bg-slate-400"}`} />
          {profile.is_available ? "Available" : "Unavailable"}
        </button>
      </div>

      {profile.verification_status !== "verified" && (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Your account is pending verification. You won't be assigned tasks until an admin approves you.
        </div>
      )}

      {pool.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-lg font-bold">Available to claim</h2>
            <span className="badge bg-brand-100 text-brand-700">{pool.length} open</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {pool.map((t) => (
              <PoolTask key={t.id} task={t} reload={load} canClaim={profile.is_available} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-bold">Active jobs</h2>
        {active.length === 0 ? (
          <Empty title="No active jobs">New assignments will appear here.</Empty>
        ) : (
          <div className="space-y-4">
            {active.map((t) => (
              <RunnerTask key={t.id} task={t} reload={load} />
            ))}
          </div>
        )}
      </section>

      {done.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold">Completed</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {done.map((t) => (
              <div key={t.id} className="card flex items-center justify-between p-6">
                <div>
                  <p className="text-xs text-slate-400">{t.reference}</p>
                  <p className="font-semibold">{t.service_name}</p>
                </div>
                <StatusBadge status={t.status} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
