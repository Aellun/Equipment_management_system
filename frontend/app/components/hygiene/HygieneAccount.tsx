"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { tasksApi, mediaUrl, type Task } from "@/app/components/services/client";
import { useServicesAuth } from "@/app/components/services/ServicesAuthProvider";
import { Icon } from "@/app/components/services/Icon";
import { StatusBadge, Spinner } from "@/app/components/services/ui";
import { FREQUENCY_OPTIONS, KES } from "./client";

/**
 * The cleaning customer's account.
 *
 * A cleaning relationship is a standing arrangement, not a list of past
 * purchases: the questions are "when are they coming next", "who is coming",
 * and "was the last visit done properly". So the next visit leads the page,
 * the plan sits beside it, and history is where you approve work and rate the
 * crew — quite unlike the errands dashboard, which is a receipt list.
 */
type Tab = "upcoming" | "history" | "places";

const OPEN_STATES = ["quoted", "paid", "assigned", "in_progress", "proof_submitted"];

export default function HygieneAccount() {
  const { user, loading: authLoading } = useServicesAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("upcoming");
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(() => {
    return tasksApi
      .mine()
      .then((all) => setTasks(all.filter((t) => t.vertical === "hygiene")))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/hygiene/login?from=/hygiene/account");
      return;
    }
    load();
  }, [user, authLoading, load, router]);

  if (authLoading || loading) return <Spinner />;
  if (!user) return null;

  const upcoming = tasks
    .filter((t) => OPEN_STATES.includes(t.status))
    .sort((a, b) => (a.scheduled_date ?? "").localeCompare(b.scheduled_date ?? ""));
  const history = tasks.filter((t) => !OPEN_STATES.includes(t.status));
  const next = upcoming[0];
  const plan = tasks.find((t) => t.frequency && t.frequency !== "one_off");

  const places = Array.from(new Set(tasks.map((t) => t.service_address).filter(Boolean)));

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
            {upcoming.length ? `${upcoming.length} visit${upcoming.length === 1 ? "" : "s"} booked` : "No visits booked"}
          </p>
        </div>
        <Link href="/hygiene/services?for=home" className="btn-primary rounded">
          Book a clean
        </Link>
      </div>

      {/* Next visit + plan */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr),320px]">
        {next ? (
          <section className="overflow-hidden rounded border border-line bg-white">
            <div className="flex items-center justify-between border-b border-line bg-hygiene-navy px-5 py-2.5 text-white">
              <span className="text-sm font-semibold">Next visit</span>
              <StatusBadge status={next.status} />
            </div>
            <div className="p-5">
              <p className="text-2xl font-extrabold">{formatDate(next.scheduled_date)}</p>
              <p className="text-slate-600">
                {next.arrival_window || "Time to be confirmed"} · {next.service_name}
              </p>

              <dl className="mt-4 grid gap-3 border-t border-line pt-4 text-sm sm:grid-cols-2">
                {next.service_address && <Detail label="Address" value={next.service_address} />}
                <Detail label="Reference" value={next.reference} />
                <Detail
                  label="Crew"
                  value={next.runner ? next.runner.full_name : "Assigned closer to the date"}
                />
                <Detail label="Price" value={KES(next.total_price)} />
              </dl>

              <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
                <Link href={`/hygiene/tasks/${next.id}`} className="btn-ghost rounded">
                  View details
                </Link>
                {next.status === "proof_submitted" && (
                  <button
                    className="btn-primary rounded"
                    disabled={busyId === next.id}
                    onClick={() => act(next.id, () => tasksApi.accept(next.id))}
                  >
                    Approve this clean
                  </button>
                )}
                {["quoted", "paid", "assigned"].includes(next.status) && (
                  <button
                    className="btn-ghost rounded"
                    disabled={busyId === next.id}
                    onClick={() => act(next.id, () => tasksApi.cancel(next.id))}
                  >
                    Cancel visit
                  </button>
                )}
              </div>
              <p className="mt-3 text-xs text-muted">
                Need a different day? Cancel and rebook free up to 24 hours before.
              </p>
            </div>
          </section>
        ) : (
          <section className="rounded border border-line bg-white p-8 text-center">
            <Icon name="sparkles" className="mx-auto h-8 w-8 text-muted" />
            <p className="mt-3 font-semibold">No visits booked</p>
            <p className="mt-1 text-sm text-muted">Book a clean and it will show up here.</p>
            <Link href="/hygiene/services?for=home" className="btn-primary mt-4 rounded">
              Get a price
            </Link>
          </section>
        )}

        <section className="rounded border border-line bg-white">
          <p className="border-b border-line px-4 py-3 font-bold">Your plan</p>
          {plan ? (
            <div className="p-4">
              <p className="text-lg font-bold">
                {FREQUENCY_OPTIONS.find((f) => f.value === plan.frequency)?.label}
              </p>
              <p className="text-sm text-muted">{plan.service_name}</p>
              <p className="mt-3 text-2xl font-extrabold">{KES(plan.total_price)}</p>
              <p className="text-xs text-muted">per visit</p>
              {!!plan.frequency_discount && (
                <p className="mt-2 inline-block rounded bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700">
                  Saving {KES(plan.frequency_discount)} a visit
                </p>
              )}
            </div>
          ) : (
            <div className="p-4 text-sm text-muted">
              <p>You&apos;re booking one-off cleans.</p>
              <p className="mt-2">A regular plan saves up to 15% per visit.</p>
              <Link href="/hygiene/services?for=home" className="link mt-2 inline-block">
                See plans →
              </Link>
            </div>
          )}
        </section>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-line">
        {(
          [
            ["upcoming", `Upcoming (${upcoming.length})`],
            ["history", `Past visits (${history.length})`],
            ["places", `Addresses (${places.length})`],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium ${
              tab === key ? "border-brand-500 text-brand-700" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "upcoming" && <VisitList visits={upcoming} empty="Nothing booked yet." />}
      {tab === "history" && <VisitList visits={history} empty="No past visits yet." showProof />}
      {tab === "places" && (
        <div className="rounded border border-line bg-white">
          {places.length === 0 ? (
            <p className="p-6 text-sm text-muted">No addresses saved yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {places.map((p) => (
                <li key={p} className="flex items-center gap-3 px-5 py-3.5">
                  <Icon name="map-pin" className="h-4 w-4 shrink-0 text-hygiene-navy" />
                  <span className="flex-1 text-sm">{p}</span>
                  <span className="text-xs text-muted">
                    {tasks.filter((t) => t.service_address === p).length} visit(s)
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function VisitList({
  visits,
  empty,
  showProof,
}: {
  visits: Task[];
  empty: string;
  showProof?: boolean;
}) {
  if (visits.length === 0)
    return <p className="rounded border border-line bg-white p-6 text-sm text-muted">{empty}</p>;

  return (
    <ul className="divide-y divide-line rounded border border-line bg-white">
      {visits.map((t) => (
        <li key={t.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
          {showProof && t.proof_photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaUrl(t.proof_photo_url)}
              alt=""
              className="h-12 w-12 shrink-0 rounded object-cover"
            />
          ) : (
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded bg-canvas">
              <Icon name="sparkles" className="h-5 w-5 text-muted" />
            </span>
          )}

          <div className="min-w-0 flex-1">
            <p className="font-semibold">{t.service_name}</p>
            <p className="text-sm text-muted">
              {formatDate(t.scheduled_date) || new Date(t.created_at).toLocaleDateString("en-KE")}
              {t.arrival_window && ` · ${t.arrival_window}`}
              {t.service_address && ` · ${t.service_address}`}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <span className="font-bold">{KES(t.total_price)}</span>
            <StatusBadge status={t.status} />
            <Link href={`/hygiene/tasks/${t.id}`} className="text-sm font-semibold text-brand-600 hover:underline">
              Details
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-KE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
