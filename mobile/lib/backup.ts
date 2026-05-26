import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { getDb, resetDatabase } from "./db";

const BACKUP_FORMAT = "equipment-tracker-backup";
const BACKUP_VERSION = 2;
const AUTO_DIR = FileSystem.documentDirectory + "backups/";
const LAST_AUTO_KEY = "last_auto_backup_date";

interface BackupPayload {
  format: string;
  version: number;
  created_at: string;
  data: {
    categories: any[];
    clients: any[];
    equipment: any[];
    checkouts: any[];
    checkout_lines: any[];
  };
}

async function collectData(): Promise<BackupPayload> {
  const db = await getDb();
  const [categories, clients, equipment, checkouts, checkout_lines] = await Promise.all([
    db.getAllAsync("SELECT * FROM categories"),
    db.getAllAsync("SELECT * FROM clients"),
    db.getAllAsync("SELECT * FROM equipment"),
    db.getAllAsync("SELECT * FROM checkouts"),
    db.getAllAsync("SELECT * FROM checkout_lines"),
  ]);
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    created_at: new Date().toISOString(),
    data: { categories, clients, equipment, checkouts, checkout_lines },
  };
}

// Write a backup file and open the share sheet so the user can save it anywhere.
export async function exportBackup(): Promise<void> {
  const payload = await collectData();
  const stamp = new Date().toISOString().slice(0, 10);
  const path = `${FileSystem.cacheDirectory}equipment-backup-${stamp}.json`;
  await FileSystem.writeAsStringAsync(path, JSON.stringify(payload, null, 2));
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, {
      mimeType: "application/json",
      dialogTitle: "Save Equipment Tracker backup",
    });
  } else {
    throw new Error(`Backup saved to ${path}`);
  }
}

// Restore from a backup file's contents. Replaces ALL current data.
export async function restoreBackup(jsonText: string): Promise<void> {
  let parsed: BackupPayload;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("That file is not valid JSON.");
  }
  if (parsed.format !== BACKUP_FORMAT) {
    throw new Error("This file is not an Equipment Tracker backup.");
  }
  const d = parsed.data;
  if (!d || !Array.isArray(d.equipment) || !Array.isArray(d.categories)) {
    throw new Error("Backup file is missing expected data.");
  }

  await resetDatabase();
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const c of d.categories) {
      await db.runAsync(
        "INSERT INTO categories (id, name, description, created_at) VALUES (?, ?, ?, ?)",
        c.id, c.name, c.description ?? null, c.created_at
      );
    }
    for (const c of d.clients) {
      await db.runAsync(
        "INSERT INTO clients (id, name, email, phone, id_proof_ref, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        c.id, c.name, c.email ?? null, c.phone ?? null, c.id_proof_ref ?? null, c.created_at
      );
    }
    for (const e of d.equipment) {
      await db.runAsync(
        "INSERT INTO equipment (id, name, category, quantity, in_maintenance, last_inspected, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        e.id, e.name, e.category, e.quantity ?? 1, e.in_maintenance ?? 0,
        e.last_inspected ?? null, e.created_at
      );
    }
    for (const c of d.checkouts ?? []) {
      await db.runAsync(
        "INSERT INTO checkouts (id, client_id, out_timestamp, due_date, notes) VALUES (?, ?, ?, ?, ?)",
        c.id, c.client_id, c.out_timestamp, c.due_date, c.notes ?? null
      );
    }
    for (const l of d.checkout_lines ?? []) {
      await db.runAsync(
        "INSERT INTO checkout_lines (id, checkout_id, equipment_id, quantity, returned_good, returned_damaged) VALUES (?, ?, ?, ?, ?, ?)",
        l.id, l.checkout_id, l.equipment_id, l.quantity,
        l.returned_good ?? 0, l.returned_damaged ?? 0
      );
    }
  });
}

// ---------- Daily automatic backup (silent, into app storage) ----------
export async function runDailyAutoBackup(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const db = await getDb();
  // Re-use a tiny key/value table for the last-run marker.
  await db.execAsync(
    "CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT)"
  );
  const last = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_meta WHERE key = ?",
    LAST_AUTO_KEY
  );
  if (last?.value === today) return; // already backed up today

  const dir = await FileSystem.getInfoAsync(AUTO_DIR);
  if (!dir.exists) await FileSystem.makeDirectoryAsync(AUTO_DIR, { intermediates: true });

  const payload = await collectData();
  await FileSystem.writeAsStringAsync(
    `${AUTO_DIR}auto-${today}.json`,
    JSON.stringify(payload)
  );
  await pruneAutoBackups();

  await db.runAsync(
    "INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)",
    LAST_AUTO_KEY, today
  );
}

// Keep only the 7 most recent automatic backups.
async function pruneAutoBackups(): Promise<void> {
  const dir = await FileSystem.getInfoAsync(AUTO_DIR);
  if (!dir.exists) return;
  const files = (await FileSystem.readDirectoryAsync(AUTO_DIR))
    .filter((f) => f.startsWith("auto-") && f.endsWith(".json"))
    .sort()
    .reverse();
  for (const stale of files.slice(7)) {
    await FileSystem.deleteAsync(AUTO_DIR + stale, { idempotent: true });
  }
}

export interface AutoBackupInfo {
  name: string;
  date: string;
  path: string;
}

export async function listAutoBackups(): Promise<AutoBackupInfo[]> {
  const dir = await FileSystem.getInfoAsync(AUTO_DIR);
  if (!dir.exists) return [];
  const files = (await FileSystem.readDirectoryAsync(AUTO_DIR))
    .filter((f) => f.startsWith("auto-") && f.endsWith(".json"))
    .sort()
    .reverse();
  return files.map((f) => ({
    name: f,
    date: f.replace("auto-", "").replace(".json", ""),
    path: AUTO_DIR + f,
  }));
}

export async function readBackupFile(path: string): Promise<string> {
  return FileSystem.readAsStringAsync(path);
}
