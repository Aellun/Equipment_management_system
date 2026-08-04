"use client";

/**
 * Dyzah Events API client.
 *
 * Event hire is quote-led: a customer picks dates, builds a list, and we
 * confirm before money moves. So there is no checkout here — the storefront
 * submits a request and gets back a reference.
 */

const API = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export interface CatalogItem {
  name: string;
  category: string;
  total_units: number;
  available: number;
  daily_rate: number;
  description: string;
  image_url: string;
}

export interface AvailabilityResult {
  name: string;
  available: number;
}

export interface QuoteItemIn {
  equipment_name: string;
  category: string;
  quantity: number;
  daily_rate: number;
}

export interface QuotePayload {
  contact_name: string;
  contact_phone: string;
  contact_email?: string | null;
  organisation?: string;
  event_type?: string;
  start_date: string;
  end_date: string;
  guest_count?: number;
  fulfilment: "Delivery" | "Collection";
  venue?: string;
  notes?: string;
  items: QuoteItemIn[];
}

export interface QuoteReceipt {
  reference: string;
  status: string;
  estimated_total: number;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, init);
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (typeof data.detail === "string") detail = data.detail;
      else if (Array.isArray(data.detail) && data.detail[0]?.msg) detail = data.detail[0].msg;
    } catch {
      /* keep the generic message */
    }
    throw new Error(detail);
  }
  return (await res.json()) as T;
}

const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const eventsApi = {
  catalog: (params: { category?: string; q?: string; start?: string; end?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.category) qs.set("category", params.category);
    if (params.q) qs.set("q", params.q);
    // Dates are only meaningful as a pair — a half-range would silently
    // return unfiltered availability and mislead the customer.
    if (params.start && params.end) {
      qs.set("start_date", params.start);
      qs.set("end_date", params.end);
    }
    return request<CatalogItem[]>(`/events/catalog${qs.toString() ? `?${qs}` : ""}`);
  },
  categories: () => request<string[]>("/events/categories"),
  availability: (names: string[], start: string, end: string) =>
    request<AvailabilityResult[]>(
      "/events/availability",
      json({ names, start_date: start, end_date: end })
    ),
  requestQuote: (payload: QuotePayload) => request<QuoteReceipt>("/events/quotes", json(payload)),
  quoteStatus: (reference: string) =>
    request<QuoteReceipt>(`/events/quotes/${encodeURIComponent(reference)}/status`),
};

export const KES = (n: number | undefined | null) =>
  `KSh ${Number(n || 0).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;

/** Inclusive hire length — a Saturday-only booking is one day, not zero. */
export function hireDays(start: string, end: string): number {
  if (!start || !end) return 1;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.round(ms / 86_400_000) + 1);
}

export const EVENT_TYPES = [
  "Wedding",
  "Corporate event",
  "Conference",
  "Birthday / private party",
  "Church or community event",
  "Concert / festival",
  "Exhibition",
  "Other",
];
