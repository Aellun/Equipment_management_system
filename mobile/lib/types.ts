export type ConditionOnReturn = "Good" | "Damaged" | "Needs Repair";

export interface Category {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
}

// Quantity-based equipment: one row per item type.
export interface Equipment {
  id: number;
  name: string;
  category: string;
  quantity: number; // total units owned
  in_maintenance: number; // units currently out of service
  last_inspected: string | null;
  created_at: string;
  // Derived at query time:
  out?: number; // units currently checked out
  available?: number; // quantity - out - in_maintenance
}

export interface Client {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  id_proof_ref: string | null;
  created_at: string;
}

// A checkout groups one or more equipment lines (cart-style).
export interface Checkout {
  id: number;
  client_id: number;
  out_timestamp: string;
  due_date: string;
  notes: string | null;
  // Derived:
  client_name?: string;
  client_phone?: string | null;
  line_count?: number;
  total_units?: number;
  returned_units?: number;
  open_units?: number; // total - returned
}

// One equipment line within a checkout.
export interface CheckoutLine {
  id: number;
  checkout_id: number;
  equipment_id: number;
  quantity: number; // units taken in this line
  returned_good: number; // units returned in good condition
  returned_damaged: number; // units returned damaged / needs repair
  // Derived:
  equipment_name?: string;
  category?: string;
  outstanding?: number; // quantity - returned_good - returned_damaged
}

export interface CartItem {
  equipment: Equipment;
  quantity: number;
}
