import * as SQLite from "expo-sqlite";

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync("equipment_tracker.db");
  await migrate(_db);
  return _db;
}

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      id_proof_ref TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS equipment (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      in_maintenance INTEGER NOT NULL DEFAULT 0,
      last_inspected TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS checkouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      out_timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      due_date TEXT NOT NULL,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS checkout_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      checkout_id INTEGER NOT NULL REFERENCES checkouts(id) ON DELETE CASCADE,
      equipment_id INTEGER NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL,
      returned_good INTEGER NOT NULL DEFAULT 0,
      returned_damaged INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_lines_checkout ON checkout_lines(checkout_id);
    CREATE INDEX IF NOT EXISTS idx_lines_equipment ON checkout_lines(equipment_id);
  `);

  const count = await db.getFirstAsync<{ c: number }>(
    "SELECT COUNT(*) AS c FROM categories"
  );
  if (count && count.c === 0) {
    await db.execAsync(`
      INSERT INTO categories (name, description) VALUES
        ('Audio', 'Speakers, mixers, microphones'),
        ('Lighting', 'Stage and event lighting'),
        ('Staging', 'Trusses, platforms, rigging');
    `);
  }
}

// Drop everything and recreate — used by restore-from-backup.
export async function resetDatabase(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    DROP TABLE IF EXISTS checkout_lines;
    DROP TABLE IF EXISTS checkouts;
    DROP TABLE IF EXISTS equipment;
    DROP TABLE IF EXISTS clients;
    DROP TABLE IF EXISTS categories;
  `);
  await migrate(db);
}
