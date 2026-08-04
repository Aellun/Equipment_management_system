import { StatCardSkeleton, TableSkeleton } from "@/app/components/PageSkeleton";

export default function DashboardLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="h-8 bg-slate-200 rounded-lg animate-pulse2 w-48" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0,1,2,3].map(i => <StatCardSkeleton key={i} />)}
      </div>
      <TableSkeleton rows={5} cols={4} />
    </div>
  );
}
