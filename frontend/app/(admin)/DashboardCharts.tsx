"use client";

export type DayActivity = { label: string; checkouts: number; returns: number };
export type CategoryRow = { name: string; available: number; out: number; maintenance: number };
export type ClientRow = { name: string; count: number };

/* ---- 14-day activity: grouped bars ---- */
export function ActivityChart({ data }: { data: DayActivity[] }) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.checkouts, d.returns)));
  const H = 120;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
          Activity — last 14 days
        </p>
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" /> Checkouts</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Returns</span>
        </div>
      </div>
      <div className="flex items-end gap-1.5 sm:gap-2.5" style={{ height: H }}>
        {data.map((d) => (
          <div key={d.label} className="flex-1 flex items-end justify-center gap-0.5 h-full group relative">
            <div
              className="w-1/2 max-w-[14px] bg-indigo-500 rounded-t group-hover:bg-indigo-400 transition-colors"
              style={{ height: `${(d.checkouts / max) * 100}%`, minHeight: d.checkouts ? 3 : 0 }}
            />
            <div
              className="w-1/2 max-w-[14px] bg-emerald-500 rounded-t group-hover:bg-emerald-400 transition-colors"
              style={{ height: `${(d.returns / max) * 100}%`, minHeight: d.returns ? 3 : 0 }}
            />
            <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
              {d.label}: {d.checkouts} out · {d.returns} in
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 sm:gap-2.5 mt-2">
        {data.map((d, i) => (
          <p key={d.label} className="flex-1 text-center text-[9px] text-slate-400 truncate">
            {i % 2 === 0 ? d.label : ""}
          </p>
        ))}
      </div>
    </div>
  );
}

/* ---- Category breakdown: stacked horizontal bars ---- */
export function CategoryBreakdown({ data }: { data: CategoryRow[] }) {
  const max = Math.max(1, ...data.map((d) => d.available + d.out + d.maintenance));

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">
        Inventory by Category
      </p>
      {data.length === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center">No equipment yet</p>
      ) : (
        <div className="space-y-3">
          {data.map((c) => {
            const total = c.available + c.out + c.maintenance;
            return (
              <div key={c.name}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[13px] font-medium text-slate-700 dark:text-slate-300 truncate">{c.name}</p>
                  <p className="text-xs text-slate-400 shrink-0 ml-2">{total} item{total !== 1 ? "s" : ""}</p>
                </div>
                <div className="flex h-2 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800" style={{ width: `${(total / max) * 100}%`, minWidth: "15%" }}>
                  {c.available > 0 && <div className="bg-emerald-500" style={{ width: `${(c.available / total) * 100}%` }} title={`Available: ${c.available}`} />}
                  {c.out > 0 && <div className="bg-amber-500" style={{ width: `${(c.out / total) * 100}%` }} title={`Out: ${c.out}`} />}
                  {c.maintenance > 0 && <div className="bg-red-500" style={{ width: `${(c.maintenance / total) * 100}%` }} title={`Maintenance: ${c.maintenance}`} />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---- Top clients ---- */
export function TopClients({ data }: { data: ClientRow[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">
        Most Active Clients
      </p>
      {data.length === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center">No loans recorded yet</p>
      ) : (
        <div className="space-y-3">
          {data.map((c, i) => (
            <div key={c.name} className="flex items-center gap-3">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${i === 0 ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"}`}>
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-slate-700 dark:text-slate-300 truncate">{c.name}</p>
                <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 mt-1 overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(c.count / max) * 100}%` }} />
                </div>
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">{c.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
