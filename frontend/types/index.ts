export type EquipmentStatus = "Available" | "Out" | "Maintenance";
export type ConditionOnReturn = "Good" | "Damaged" | "Needs Repair";

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface Category {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Equipment {
  id: number;
  name: string;
  serial_number: string;
  category: string;
  status: EquipmentStatus;
  last_inspected: string | null;
  created_at: string;
}

export interface Client {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  id_proof_ref: string | null;
  created_at: string;
}

export interface AuditLog {
  id: number;
  transaction_id: number;
  return_timestamp: string;
  condition_on_return: ConditionOnReturn;
  notes: string | null;
}

export interface Transaction {
  id: number;
  equipment_id: number;
  client_id: number;
  out_timestamp: string;
  due_date: string;
  staff_out_id: string;
  equipment: Equipment | null;
  client: Client | null;
  audit_log: AuditLog | null;
}
