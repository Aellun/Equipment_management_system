"use client";

/**
 * Dyzah Hygiene API client.
 *
 * Cleaning bookings reuse the shared services engine; this module adds the
 * pieces the cleaning business needs on top — the extras catalog, quotes that
 * price from property size, and the enquiry pipeline that handles both
 * site-survey requests and hygiene-product supply.
 *
 * Enquiry submissions return a reference and status only — the API never
 * echoes contact details back over an unauthenticated request.
 */

const API = process.env.NEXT_PUBLIC_API_URL ?? "/api";

/** How a service is priced, which decides the customer's booking path. */
export type QuoteMode = "rooms" | "unit" | "survey" | "distance";

export type Frequency = "one_off" | "weekly" | "fortnightly" | "monthly";

export interface Extra {
  slug: string;
  label: string;
  price: number;
}

export interface CleaningQuote {
  base_price: number;
  size_fee: number;
  extras_fee: number;
  frequency_discount: number;
  service_fee: number;
  total_price: number;
  currency: string;
}

export interface QuoteInput {
  service_type_id: number;
  bedrooms?: number;
  bathrooms?: number;
  quantity?: number;
  frequency?: Frequency;
  extras?: string[];
}

export type EnquiryKind = "supply" | "survey";

export interface EnquiryPayload {
  kind: EnquiryKind;
  organisation: string;
  sector?: string;
  county?: string;
  contact_name: string;
  contact_email?: string | null;
  contact_phone: string;
  /** supply leads */
  products?: string;
  estimated_quantity?: string;
  /** survey leads */
  site_type?: string;
  site_size?: string;
  locations?: string;
  frequency?: string;
  notes?: string;
}

export interface EnquiryReceipt {
  reference: string;
  status: string;
  kind: EnquiryKind;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, init);
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      // FastAPI returns either a string detail or a validation-error array.
      if (typeof data.detail === "string") detail = data.detail;
      else if (Array.isArray(data.detail) && data.detail[0]?.msg) detail = data.detail[0].msg;
    } catch {
      /* keep the generic message */
    }
    throw new Error(detail);
  }
  return (await res.json()) as T;
}

export const hygieneApi = {
  extras: () => request<Extra[]>("/errands/services/extras"),

  quote: (input: QuoteInput) =>
    request<CleaningQuote>("/errands/services/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),

  submitEnquiry: (payload: EnquiryPayload) =>
    request<EnquiryReceipt>("/errands/hygiene/enquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  enquiryStatus: (reference: string) =>
    request<EnquiryReceipt>(`/errands/hygiene/enquiries/${encodeURIComponent(reference)}/status`),
};

/** Per-visit saving shown against each plan option — the main reason a
 *  customer commits to a recurring clean rather than a one-off. */
export const FREQUENCY_OPTIONS: { value: Frequency; label: string; save: string }[] = [
  { value: "weekly", label: "Weekly", save: "Save 15%" },
  { value: "fortnightly", label: "Every 2 weeks", save: "Save 10%" },
  { value: "monthly", label: "Monthly", save: "Save 5%" },
  { value: "one_off", label: "One-off", save: "" },
];

export const ARRIVAL_WINDOWS = ["08:00 – 10:00", "10:00 – 12:00", "12:00 – 14:00", "14:00 – 16:00"];

export const KES = (n: number | undefined | null) =>
  `KSh ${Number(n || 0).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
