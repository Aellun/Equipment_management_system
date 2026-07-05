import { serverApi } from "@/app/lib/serverApi";
import ActivityLog from "./ActivityLog";

const API = process.env.INTERNAL_API_URL ?? "http://localhost:8000";

interface LogEntry {
  id: number;
  timestamp: string;
  action: string;
  entity_type: string;
  entity_id: number | null;
  entity_name: string | null;
  performed_by: string | null;
  details: string | null;
}

async function getLogs(): Promise<LogEntry[]> {
  try {
    const res = await serverApi(`${API}/activity-logs/?limit=500`, { cache: "no-store" });
    return res.ok ? res.json() : [];
  } catch {
    return [];
  }
}

export default async function AuditPage() {
  const logs = await getLogs();
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Audit Log</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {logs.length} recorded action{logs.length !== 1 ? "s" : ""}
        </p>
      </div>
      <ActivityLog logs={logs} />
    </div>
  );
}
