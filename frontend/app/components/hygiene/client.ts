"use client";

/**
 * Dyzah Hygiene B2B supply enquiries.
 *
 * Cleaning services reuse the shared services client; only the hygiene
 * product / sanitary pad supply pillar has its own endpoints, because
 * institutional supply is quoted per tender rather than sold at a public
 * unit price.
 *
 * The submit response deliberately carries a reference and status only — the
 * API never echoes contact details back over an unauthenticated request.
 */

const API = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export interface EnquiryPayload {
  organisation: string;
  sector: string;
  county: string;
  contact_name: string;
  contact_email?: string | null;
  contact_phone: string;
  products: string;
  estimated_quantity: string;
  frequency: string;
  notes: string;
}

export interface EnquiryReceipt {
  reference: string;
  status: string;
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
  submitEnquiry: (payload: EnquiryPayload) =>
    request<EnquiryReceipt>("/errands/hygiene/enquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  enquiryStatus: (reference: string) =>
    request<EnquiryReceipt>(`/errands/hygiene/enquiries/${encodeURIComponent(reference)}/status`),
};
