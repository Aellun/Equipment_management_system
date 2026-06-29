"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { tasksApi, KES, type Task } from "../client";
import { Empty, Spinner, StatusBadge } from "../ui";

function TaskCard({ task, basePath }: { task: Task; basePath: string }) {
  return (
    <Link href={`${basePath}/tasks/${task.id}`} className="card block p-6 transition hover:shadow-md hover:no-underline">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-400">{task.reference}</p>
          <p className="font-semibold text-ink">{task.service_name}</p>
          <p className="text-sm text-slate-500">{task.category}</p>
        </div>
        <StatusBadge status={task.status} />
      </div>
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-slate-500">{task.runner ? `Crew: ${task.runner.full_name}` : "Awaiting crew"}</span>
        <span className="font-bold text-brand-600">{KES(task.total_price)}</span>
      </div>
    </Link>
  );
}

export default function DashboardPage({ basePath, label }: { basePath: string; label: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tasksApi
      .mine()
      .then(setTasks)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const active = tasks.filter((t) => !["completed", "cancelled"].includes(t.status));
  const past = tasks.filter((t) => ["completed", "cancelled"].includes(t.status));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold">My {label.toLowerCase()}</h1>
        <Link href={`${basePath}/browse`} className="btn-primary">+ New booking</Link>
      </div>

      {tasks.length === 0 && <Empty title="No bookings yet">Book your first service and we'll handle it end to end.</Empty>}

      {active.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold">Active</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {active.map((t) => (
              <TaskCard key={t.id} task={t} basePath={basePath} />
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold">History</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {past.map((t) => (
              <TaskCard key={t.id} task={t} basePath={basePath} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
