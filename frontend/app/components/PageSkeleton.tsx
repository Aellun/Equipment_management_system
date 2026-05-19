export function SkeletonRow({ cols = 4 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse2" style={{ width: `${60 + (i * 17) % 40}%` }} />
        </td>
      ))}
    </tr>
  );
}

export function TableSkeleton({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800">
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i} className="px-4 py-3.5">
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse2 w-16" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {Array.from({ length: rows }).map((_, i) => (
              <SkeletonRow key={i} cols={cols} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse2 w-20" />
        <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse2" />
      </div>
      <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse2 w-16 mb-1" />
      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse2 w-28" />
    </div>
  );
}

export default function PageSkeleton({ title, statCards = 0, tableCols = 4, tableRows = 8 }: {
  title: string;
  statCards?: number;
  tableCols?: number;
  tableRows?: number;
}) {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{title}</h1>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse2 w-48 mt-2" />
        </div>
        <div className="h-10 w-32 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse2" />
      </div>
      {statCards > 0 && (
        <div className={`grid grid-cols-2 lg:grid-cols-${statCards} gap-4`}>
          {Array.from({ length: statCards }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
      )}
      <TableSkeleton rows={tableRows} cols={tableCols} />
    </div>
  );
}
