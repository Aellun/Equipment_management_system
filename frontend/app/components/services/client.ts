"use client";

// Lightweight fetch client for the shared services engine, used by both
// Dyzah Errands (/services) and Dyzah Hygiene (/hygiene).
// All endpoints are namespaced under /errands on the backend; the browser
// reaches them through nginx at /api/errands/*. Proof photos live at
// /errands-media/* and are also reached through /api.

const API = process.env.NEXT_PUBLIC_API_URL ?? "/api";
const TOKEN_KEY = "dyzah_svc_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function mediaUrl(path?: string | null): string {
  return path ? `${API}${path}` : "";
}

interface ReqOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
  form?: FormData;
}

async function request<T>(path: string, opts: ReqOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.auth) {
    const t = getToken();
    if (t) headers["Authorization"] = `Bearer ${t}`;
  }
  let body: BodyInit | undefined;
  if (opts.form) {
    body = opts.form;
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  const res = await fetch(`${API}${path}`, { method: opts.method ?? "GET", headers, body });
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      detail = data.detail ?? detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ── Types ────────────────────────────────────────────────────────
export interface Service {
  id: number;
  slug: string;
  name: string;
  vertical: string;
  category: string;
  description: string;
  icon: string;
  base_price: number;
  price_unit: string;
  est_minutes: number;
  goods_paid_separately: boolean;
  is_active: boolean;
}

export interface Quote {
  base_price: number;
  distance_fee: number;
  urgency_fee: number;
  service_fee: number;
  total_price: number;
  goods_paid_separately: boolean;
  currency: string;
}

export interface Task {
  id: number;
  reference: string;
  service_name: string;
  vertical?: string;
  category: string;
  status: string;
  pickup_location: string;
  dropoff_location: string;
  contact_phone?: string | null;
  distance_km: number;
  urgency: string;
  notes: string;
  base_price: number;
  distance_fee: number;
  urgency_fee: number;
  service_fee: number;
  total_price: number;
  proof_photo_url?: string | null;
  proof_note: string;
  runner?: { id: number; full_name: string; suburb?: string; rating_avg?: number; rating_count?: number } | null;
  customer?: { full_name: string; phone?: string } | null;
  payment_status?: string | null;
  created_at: string;
}

export interface SvcUser {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  role: "customer" | "runner" | "admin";
}

// ── Auth ─────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    request<{ access_token: string; user: SvcUser }>("/errands/auth/login", { method: "POST", body: { email, password } }),
  register: (data: Record<string, unknown>) =>
    request<{ access_token: string; user: SvcUser }>("/errands/auth/register", { method: "POST", body: data }),
  me: () => request<SvcUser>("/errands/auth/me", { auth: true }),
};

// ── Services ─────────────────────────────────────────────────────
export const servicesApi = {
  list: (vertical?: string) =>
    request<Service[]>(`/errands/services${vertical ? `?vertical=${vertical}` : ""}`),
  quote: (data: { service_type_id: number; distance_km: number; urgency: string }) =>
    request<Quote>("/errands/services/quote", { method: "POST", body: data }),
};

// ── Tasks ────────────────────────────────────────────────────────
export const tasksApi = {
  create: (data: Record<string, unknown>) => request<Task>("/errands/tasks", { method: "POST", body: data, auth: true }),
  mine: () => request<Task[]>("/errands/tasks/mine", { auth: true }),
  get: (id: number | string) => request<Task>(`/errands/tasks/${id}`, { auth: true }),
  track: (ref: string) => request<Task>(`/errands/tasks/ref/${ref}`),
  start: (id: number) => request<Task>(`/errands/tasks/${id}/start`, { method: "POST", auth: true }),
  accept: (id: number) => request<Task>(`/errands/tasks/${id}/accept`, { method: "POST", auth: true }),
  dispute: (id: number) => request<Task>(`/errands/tasks/${id}/dispute`, { method: "POST", auth: true }),
  cancel: (id: number) => request<Task>(`/errands/tasks/${id}/cancel`, { method: "POST", auth: true }),
  review: (id: number, data: { rating: number; comment: string }) =>
    request<Task>(`/errands/tasks/${id}/review`, { method: "POST", body: data, auth: true }),
};

// ── Payments (direct M-Pesa STK push; mock-simulatable) ──────────
export const paymentsApi = {
  pay: (taskId: number) =>
    request<{ checkout_request_id: string; customer_message: string; mock: boolean; task_id: number }>(
      `/errands/payments/tasks/${taskId}/pay`,
      { method: "POST", auth: true }
    ),
  simulate: (checkoutId: string, success = true) =>
    request<Task>(`/errands/payments/mpesa/simulate?checkout_request_id=${checkoutId}&success=${success}`, {
      method: "POST",
      auth: true,
    }),
};

// ── Runner ───────────────────────────────────────────────────────
export const runnerApi = {
  profile: () => request<Record<string, unknown>>("/errands/runners/me/profile", { auth: true }),
  setAvailability: (available: boolean) =>
    request<{ is_available: boolean }>(`/errands/runners/me/availability?available=${available}`, { method: "POST", auth: true }),
  availableTasks: () => request<Task[]>("/errands/runners/available-tasks", { auth: true }),
  claim: (taskId: number) => request<Task>(`/errands/runners/tasks/${taskId}/claim`, { method: "POST", auth: true }),
  submitProof: (taskId: number, form: FormData) =>
    request<Task>(`/errands/runners/tasks/${taskId}/proof`, { method: "POST", form, auth: true }),
};

// ── Admin ────────────────────────────────────────────────────────
export const adminApi = {
  stats: () => request<Record<string, unknown>>("/errands/admin/stats", { auth: true }),
  tasks: (status?: string) => request<Task[]>(`/errands/admin/tasks${status ? `?status=${status}` : ""}`, { auth: true }),
  runners: () => request<Record<string, unknown>[]>("/errands/admin/runners", { auth: true }),
  verify: (id: number, approve: boolean) =>
    request<unknown>(`/errands/admin/runners/${id}/verify?approve=${approve}`, { method: "POST", auth: true }),
  settings: () => request<{ auto_assign: boolean }>("/errands/admin/settings", { auth: true }),
  setAutoAssign: (enabled: boolean) =>
    request<unknown>(`/errands/admin/settings/auto-assign?enabled=${enabled}`, { method: "POST", auth: true }),
  availableRunners: () => request<Record<string, unknown>[]>("/errands/admin/runners/available", { auth: true }),
  assign: (taskId: number, runnerId: number) =>
    request<unknown>(`/errands/admin/tasks/${taskId}/assign?runner_id=${runnerId}`, { method: "POST", auth: true }),
};

export const KES = (n: number | undefined | null) =>
  `KSh ${Number(n || 0).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
