import { getDb } from "./db";
import type {
  CartItem,
  Category,
  Checkout,
  CheckoutLine,
  Client,
  Equipment,
} from "./types";

// ---------- Categories ----------
export async function listCategories(): Promise<Category[]> {
  const db = await getDb();
  return db.getAllAsync<Category>("SELECT * FROM categories ORDER BY name");
}

export async function addCategory(name: string, description: string | null) {
  const db = await getDb();
  await db.runAsync(
    "INSERT INTO categories (name, description) VALUES (?, ?)",
    name.trim(),
    description?.trim() || null
  );
}

export async function deleteCategory(id: number) {
  const db = await getDb();
  await db.runAsync("DELETE FROM categories WHERE id = ?", id);
}

// ---------- Clients ----------
export async function listClients(): Promise<Client[]> {
  const db = await getDb();
  return db.getAllAsync<Client>("SELECT * FROM clients ORDER BY name");
}

export async function addClient(
  name: string,
  phone: string | null,
  email: string | null,
  idProof: string | null
) {
  const db = await getDb();
  await db.runAsync(
    "INSERT INTO clients (name, phone, email, id_proof_ref) VALUES (?, ?, ?, ?)",
    name.trim(),
    phone?.trim() || null,
    email?.trim() || null,
    idProof?.trim() || null
  );
}

export async function updateClient(
  id: number,
  name: string,
  phone: string | null,
  email: string | null,
  idProof: string | null
) {
  const db = await getDb();
  await db.runAsync(
    "UPDATE clients SET name = ?, phone = ?, email = ?, id_proof_ref = ? WHERE id = ?",
    name.trim(),
    phone?.trim() || null,
    email?.trim() || null,
    idProof?.trim() || null,
    id
  );
}

export async function deleteClient(id: number) {
  const db = await getDb();
  await db.runAsync("DELETE FROM clients WHERE id = ?", id);
}

// ---------- Equipment ----------
// Each row carries derived `out` and `available` counts.
const EQUIPMENT_SELECT = `
  SELECT
    e.*,
    COALESCE((
      SELECT SUM(cl.quantity - cl.returned_good - cl.returned_damaged)
      FROM checkout_lines cl WHERE cl.equipment_id = e.id
    ), 0) AS out
  FROM equipment e
`;

function withAvailable(e: Equipment): Equipment {
  const out = e.out ?? 0;
  return { ...e, out, available: e.quantity - out - e.in_maintenance };
}

export async function listEquipment(): Promise<Equipment[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Equipment>(
    `${EQUIPMENT_SELECT} ORDER BY e.name`
  );
  return rows.map(withAvailable);
}

export async function listAvailableEquipment(): Promise<Equipment[]> {
  const all = await listEquipment();
  return all.filter((e) => (e.available ?? 0) > 0);
}

export async function getEquipment(id: number): Promise<Equipment | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Equipment>(
    `${EQUIPMENT_SELECT} WHERE e.id = ?`,
    id
  );
  return row ? withAvailable(row) : null;
}

export async function addEquipment(
  name: string,
  category: string,
  quantity: number
) {
  const db = await getDb();
  await db.runAsync(
    "INSERT INTO equipment (name, category, quantity) VALUES (?, ?, ?)",
    name.trim(),
    category,
    Math.max(1, Math.floor(quantity))
  );
}

export async function updateEquipment(
  id: number,
  name: string,
  category: string,
  quantity: number
) {
  const db = await getDb();
  const eq = await getEquipment(id);
  if (!eq) throw new Error("Equipment not found");
  const committed = (eq.out ?? 0) + eq.in_maintenance;
  if (quantity < committed) {
    throw new Error(
      `Quantity can't be below ${committed} — that many units are checked out or in maintenance.`
    );
  }
  await db.runAsync(
    "UPDATE equipment SET name = ?, category = ?, quantity = ? WHERE id = ?",
    name.trim(),
    category,
    Math.floor(quantity),
    id
  );
}

export async function deleteEquipment(id: number) {
  const db = await getDb();
  await db.runAsync("DELETE FROM equipment WHERE id = ?", id);
}

// Return units from maintenance back to the available pool.
export async function clearMaintenance(id: number, units: number) {
  const db = await getDb();
  const eq = await getEquipment(id);
  if (!eq) throw new Error("Equipment not found");
  const n = Math.min(Math.max(1, Math.floor(units)), eq.in_maintenance);
  await db.runAsync(
    "UPDATE equipment SET in_maintenance = in_maintenance - ?, last_inspected = datetime('now') WHERE id = ?",
    n,
    id
  );
}

// ---------- Checkout (cart-style, multi-item) ----------
export async function checkoutCart(
  clientId: number,
  dueDate: string,
  notes: string | null,
  cart: CartItem[]
): Promise<number> {
  if (cart.length === 0) throw new Error("Cart is empty");
  const db = await getDb();
  let checkoutId = 0;
  await db.withTransactionAsync(async () => {
    // Re-validate availability inside the transaction.
    for (const item of cart) {
      const eq = await getEquipment(item.equipment.id);
      if (!eq) throw new Error(`${item.equipment.name} no longer exists`);
      if (item.quantity < 1) continue;
      if (item.quantity > (eq.available ?? 0)) {
        throw new Error(
          `Only ${eq.available ?? 0} of ${eq.name} available (you picked ${item.quantity}).`
        );
      }
    }
    const res = await db.runAsync(
      "INSERT INTO checkouts (client_id, due_date, notes) VALUES (?, ?, ?)",
      clientId,
      dueDate,
      notes?.trim() || null
    );
    checkoutId = res.lastInsertRowId as number;
    for (const item of cart) {
      if (item.quantity < 1) continue;
      await db.runAsync(
        "INSERT INTO checkout_lines (checkout_id, equipment_id, quantity) VALUES (?, ?, ?)",
        checkoutId,
        item.equipment.id,
        item.quantity
      );
    }
  });
  return checkoutId;
}

// ---------- Check-in (per-line Good/Damaged split) ----------
export interface CheckinLine {
  line_id: number;
  equipment_id: number;
  good: number;
  damaged: number;
}

export async function checkinLines(lines: CheckinLine[]) {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const ln of lines) {
      if (ln.good === 0 && ln.damaged === 0) continue;
      const row = await db.getFirstAsync<CheckoutLine>(
        "SELECT * FROM checkout_lines WHERE id = ?",
        ln.line_id
      );
      if (!row) throw new Error("Checkout line not found");
      const outstanding =
        row.quantity - row.returned_good - row.returned_damaged;
      if (ln.good + ln.damaged > outstanding) {
        throw new Error(
          `Can't return ${ln.good + ln.damaged} — only ${outstanding} still out.`
        );
      }
      await db.runAsync(
        "UPDATE checkout_lines SET returned_good = returned_good + ?, returned_damaged = returned_damaged + ? WHERE id = ?",
        ln.good,
        ln.damaged,
        ln.line_id
      );
      // Damaged units move into the maintenance pool.
      if (ln.damaged > 0) {
        await db.runAsync(
          "UPDATE equipment SET in_maintenance = in_maintenance + ?, last_inspected = datetime('now') WHERE id = ?",
          ln.damaged,
          ln.equipment_id
        );
      }
      if (ln.good > 0) {
        await db.runAsync(
          "UPDATE equipment SET last_inspected = datetime('now') WHERE id = ?",
          ln.equipment_id
        );
      }
    }
  });
}

// ---------- Checkout queries ----------
const CHECKOUT_SELECT = `
  SELECT
    c.*,
    cl_client.name AS client_name,
    cl_client.phone AS client_phone,
    (SELECT COUNT(*) FROM checkout_lines l WHERE l.checkout_id = c.id) AS line_count,
    COALESCE((SELECT SUM(l.quantity) FROM checkout_lines l WHERE l.checkout_id = c.id), 0) AS total_units,
    COALESCE((SELECT SUM(l.returned_good + l.returned_damaged) FROM checkout_lines l WHERE l.checkout_id = c.id), 0) AS returned_units
  FROM checkouts c
  JOIN clients cl_client ON cl_client.id = c.client_id
`;

function withOpenUnits(c: Checkout): Checkout {
  return { ...c, open_units: (c.total_units ?? 0) - (c.returned_units ?? 0) };
}

export async function listOpenCheckouts(): Promise<Checkout[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Checkout>(
    `${CHECKOUT_SELECT} ORDER BY c.due_date ASC`
  );
  return rows.map(withOpenUnits).filter((c) => (c.open_units ?? 0) > 0);
}

export async function listAllCheckouts(): Promise<Checkout[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Checkout>(
    `${CHECKOUT_SELECT} ORDER BY c.out_timestamp DESC`
  );
  return rows.map(withOpenUnits);
}

export async function getCheckoutLines(
  checkoutId: number
): Promise<CheckoutLine[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<CheckoutLine>(
    `SELECT cl.*, e.name AS equipment_name, e.category
     FROM checkout_lines cl
     JOIN equipment e ON e.id = cl.equipment_id
     WHERE cl.checkout_id = ?
     ORDER BY e.name`,
    checkoutId
  );
  return rows.map((r) => ({
    ...r,
    outstanding: r.quantity - r.returned_good - r.returned_damaged,
  }));
}

export async function getCheckout(id: number): Promise<Checkout | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Checkout>(
    `${CHECKOUT_SELECT} WHERE c.id = ?`,
    id
  );
  return row ? withOpenUnits(row) : null;
}

// ---------- Overdue ----------
export async function listOverdueCheckouts(): Promise<Checkout[]> {
  const today = new Date().toISOString().slice(0, 10);
  const open = await listOpenCheckouts();
  return open.filter((c) => c.due_date < today);
}

// ---------- Dashboard ----------
export interface DashboardStats {
  totalUnits: number;
  available: number;
  out: number;
  maintenance: number;
  overdueCheckouts: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const equipment = await listEquipment();
  const overdue = await listOverdueCheckouts();
  const stats: DashboardStats = {
    totalUnits: 0,
    available: 0,
    out: 0,
    maintenance: 0,
    overdueCheckouts: overdue.length,
  };
  for (const e of equipment) {
    stats.totalUnits += e.quantity;
    stats.out += e.out ?? 0;
    stats.maintenance += e.in_maintenance;
    stats.available += e.available ?? 0;
  }
  return stats;
}
