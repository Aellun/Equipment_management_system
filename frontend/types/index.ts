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

// ============ E-commerce ============

export interface ShopCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
}

export interface ProductVariant {
  id: number;
  product_id: number;
  sku: string;
  variant_name: string;
  price: string; // Decimal serialized as string
  stock_qty: number;
  attributes: Record<string, string> | null;
  is_active: boolean;
  image_id: number | null;
}

export interface ProductImage {
  id: number;
  product_id: number;
  url: string;
  sort_order: number;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  usage_guide: string | null;
  brand: string | null;
  department_id: number | null;
  shop_category_id: number | null;
  base_price: string;
  is_active: boolean;
  is_genuine_guaranteed: boolean;
  created_at: string;
  variants: ProductVariant[];
  images: ProductImage[];
  avg_rating: number | null;
  review_count: number;
}

export interface Department {
  id: number;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  attribute_labels: string[] | null;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface Review {
  id: number;
  review_type: "Product" | "Store";
  product_id: number | null;
  rating: number;
  title: string | null;
  body: string | null;
  reviewer_name: string;
  verified_purchase: boolean;
  created_at: string;
}

export interface ReviewSummary {
  avg_rating: number | null;
  review_count: number;
  breakdown: Record<number, number>;
}

export interface DeliveryZone {
  id: number;
  name: string;
  description: string | null;
  door_fee: string;
  pickup_fee: string;
  eta_days_min: number;
  eta_days_max: number;
  free_over: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface TrackingEvent {
  id: number;
  status: string;
  note: string | null;
  created_at: string;
}

export type ReturnStatus = "Requested" | "Approved" | "Rejected" | "Refunded";

export interface ReturnRequest {
  id: number;
  order_id: number;
  order_number: string | null;
  reason: string;
  details: string | null;
  contact_email: string;
  status: ReturnStatus;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  shipping_address: string | null;
  created_at: string;
}

export interface CartItem {
  id: number;
  variant_id: number;
  quantity: number;
  variant: ProductVariant | null;
  product_name: string | null;
  product_slug: string | null;
  image_url: string | null;
  line_total: string | null;
}

export interface Cart {
  id: number;
  session_token: string;
  customer_id: number | null;
  items: CartItem[];
  subtotal: string;
}

export type OrderStatus =
  | "Pending"
  | "Confirmed"
  | "Processing"
  | "Shipped"
  | "Delivered"
  | "Cancelled";

export type PaymentStatus = "Unpaid" | "Paid" | "Refunded";

export interface OrderItem {
  id: number;
  variant_id: number | null;
  product_name: string;
  variant_name: string;
  unit_price: string;
  quantity: number;
  line_total: string;
}

export interface Order {
  id: number;
  order_number: string;
  customer_id: number | null;
  status: OrderStatus;
  payment_status: PaymentStatus;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  shipping_address: string;
  delivery_zone_name: string | null;
  delivery_method: string;
  delivery_fee: string;
  subtotal: string;
  total: string;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  tracking_events: TrackingEvent[];
}

export interface OrderTracking {
  order_number: string;
  status: OrderStatus;
  delivery_method: string;
  delivery_zone_name: string | null;
  contact_name: string;
  created_at: string;
  items: OrderItem[];
  tracking_events: TrackingEvent[];
}
