"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { tasksApi, mediaUrl, KES, type Task } from "../client";
import { useServicesAuth } from "../ServicesAuthProvider";
import { Icon } from "../Icon";
import { StatusBadge, Spinner } from "../ui";

/**
 * The errands customer's account.
 *
 * An errand is a short, live job — the question is "where is my runner right
 * now", not "when is my next visit". So this leads with whatever is in flight
 * and its progress, then keeps receipts below. Deliberately different from the
 * cleaning account, which is built around a standing schedule.
 */
const LIVE = ["paid", "assigned", "in_progress", "proof_submitted"];
const STEPS: [string, string][] = [
  ["paid", "Paid"],
  ["assigned", "Runner assigned"],
  ["in_progress", "On the way"],
  ["proof_submitted", "Proof sent"],
  ["completed", "Done"],
];

export default function ErrandsAccount({ basePath }: { basePath: string }) {
  const { user, loading: authLoading } = useServicesAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(
    () =>
      tasksApi
        .mine()
        .then((all) => setTasks(all.filter((t) => t.vertical === "errands")))
        .finally(() => setLoading(false)),
    []
  );

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push(`${basePath}/login?from=${basePath}/account`);
      return;
    }
    load();
  }, [user, authLoading, load, router, basePath]);

  if (authLoading || loading) return <Spinner />;
  if (!user) return null;

  const live = tasks.filter((t) => LIVE.includes(t.status));
  const quoted = tasks.filter((t) => t.status === "quoted");
  const past = tasks.filter((t) => ["completed", "cancelled", "disputed"].includes(t.status));
  const spent = past
    .filter((t) => t.status === "completed")
    .reduce((n, t) => n + t.total_price, 0);

  const act = async (id: number, fn: () => Promise<unknown>) => {
    setBusyId(id);
    try {
      await fn();
      await load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Hi, {user.full_name.split(" ")[0]}</h1>
          <p className="text-sm text-muted">
            {live.length ? `${live.length} errand${live.length === 1 ? "" : "s"} in progress` : "Nothing in progress"}
          </p>
        </div>
        <Link href={`${basePath}/browse`} className="btn-primary rounded">
          Book an errand
        </Link>
      </div>

      {/* Unpaid quotes block everything — surface them first. */}
      {quoted.length > 0 && (
        <section className="rounded border border-gold-300 bg-gold-50 p-4">
          <p className="font-semibold text-gold-800">
            {quoted.length} booking{quoted.length === 1 ? "" : "s"} waiting for payment
          </p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {quoted.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{t.service_name}</span>
                <span className="text-muted">{t.reference}</span>
                <Link href={`${basePath}/tasks/${t.id}`} className="link ml-auto font-semibold">
                  Pay {KES(t.total_price)} →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Live jobs, with progress */}
      {live.length > 0 ? (
        <div className="space-y-4">
          {live.map((t) => (
            <LiveCard key={t.id} task={t} basePath={basePath} busy={busyId === t.id} onAct={act} />
          ))}
        </div>
      ) : (
        quoted.length === 0 && (
          <section className="rounded border border-line bg-white p-8 text-center">
            <Icon name="bike" className="mx-auto h-8 w-8 text-muted" />
            <p className="mt-3 font-semibold">Nothing in progress</p>
            <p className="mt-1 text-sm text-muted">Book an errand and track it here.</p>
            <Link href={`${basePath}/browse`} className="btn-primary mt-4 rounded">
              See what we can do
            </Link>
          </section>
        )
      )}

      {/* History */}
      <section className="overflow-hidden rounded border border-line bg-white">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="font-bold">Past errands ({past.length})</h2>
          {spent > 0 && <span className="text-sm text-muted">{KES(spent)} spent</span>}
        </div>
        {past.length === 0 ? (
          <p className="p-5 text-sm text-muted">No completed errands yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {past.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
                {t.proof_photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaUrl(t.proof_photo_url)} alt="" className="h-11 w-11 shrink-0 rounded object-cover" />
                ) : (
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded bg-canvas">
                    <Icon name="package" className="h-5 w-5 text-muted" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{t.service_name}</p>
                  <p className="truncate text-sm text-muted">
                    {new Date(t.created_at).toLocaleDateString("en-KE")}
                    {t.dropoff_location && ` · ${t.dropoff_location}`}
                  </p>
                </div>
                <span className="font-bold">{KES(t.total_price)}</span>
                <StatusBadge status={t.status} />
                <Link href={`${basePath}/tasks/${t.id}`} className="text-sm font-semibold text-brand-600 hover:underline">
                  Receipt
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function LiveCard({
  task,
  basePath,
  busy,
  onAct,
}: {
  task: Task;
  basePath: string;
  busy: boolean;
  onAct: (id: number, fn: () => Promise<unknown>) => void;
}) {
  const stepIndex = STEPS.findIndex(([s]) => s === task.status);

  return (
    <section className="overflow-hidden rounded border border-line bg-white">
      <div className="flex items-center justify-between border-b border-line bg-squid px-5 py-2.5 text-white">
        <span className="text-sm font-semibold">{task.service_name}</span>
        <span className="text-xs text-white/70">{task.reference}</span>
      </div>

      <div className="p-5">
        {/* Progress rail */}
        <ol className="flex items-center">
          {STEPS.map(([key, label], i) => {
            const done = i <= stepIndex;
            return (
              <li key={key} className="flex flex-1 items-center last:flex-none">
                <span className="flex flex-col items-center gap-1">
                  <span
                    className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold ${
                      done ? "bg-brand-500 text-white" : "bg-canvas text-muted"
                    }`}
                  >
                    {done ? <Icon name="check" className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <span className={`whitespace-nowrap text-[11px] ${done ? "font-medium text-ink" : "text-muted"}`}>
                    {label}
                  </span>
                </span>
                {i < STEPS.length - 1 && (
                  <span className={`mx-1 mb-4 h-0.5 flex-1 ${i < stepIndex ? "bg-brand-500" : "bg-line"}`} />
                )}
              </li>
            );
          })}
        </ol>

        <dl className="mt-5 grid gap-3 border-t border-line pt-4 text-sm sm:grid-cols-3">
          <Detail label="From" value={task.pickup_location} />
          <Detail label="To" value={task.dropoff_location} />
          <Detail label="Runner" value={task.runner ? task.runner.full_name : "Being assigned"} />
        </dl>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <span className="text-lg font-extrabold">{KES(task.total_price)}</span>
          <Link href={`${basePath}/tasks/${task.id}`} className="btn-ghost ml-auto rounded">
            Details
          </Link>
          {task.status === "proof_submitted" && (
            <button
              className="btn-primary rounded"
              disabled={busy}
              onClick={() => onAct(task.id, () => tasksApi.accept(task.id))}
            >
              Approve
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
