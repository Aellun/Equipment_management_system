"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/app/components/services/Icon";
import { hygieneApi, type EnquiryPayload } from "./client";
import { ENQUIRY_FREQUENCIES, ENQUIRY_SECTORS, HYGIENE } from "./brand";

const EMPTY: EnquiryPayload = {
  kind: "supply",
  organisation: "",
  sector: "",
  county: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  products: "",
  estimated_quantity: "",
  frequency: "",
  notes: "",
};

const PRODUCT_OPTIONS = [
  "Sanitary pads",
  "Menstrual hygiene kits",
  "Washroom consumables (soap, tissue, liners)",
  "Hand sanitiser & dispensers",
  "Cleaning chemicals & supplies",
  "Other — described below",
];

export default function EnquiryForm() {
  const [form, setForm] = useState<EnquiryPayload>(EMPTY);
  const [products, setProducts] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");

  const set = (k: keyof EnquiryPayload) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const toggleProduct = (p: string) =>
    setProducts((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.contact_email && !form.contact_phone) {
      setError("Add an email address or a phone number so we can send your quote.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await hygieneApi.submitEnquiry({
        ...form,
        products: products.join(", "),
        // Send null rather than "" so the API's email validation is skipped
        // when the organisation would rather be reached by phone.
        contact_email: form.contact_email || null,
      });
      setReference(res.reference);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your enquiry. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (reference) {
    return (
      <div className="card mx-auto max-w-xl p-8 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-600">
          <Icon name="check-circle" className="h-7 w-7" />
        </span>
        <h1 className="mt-4 text-2xl font-bold">Enquiry received</h1>
        <p className="mt-2 text-slate-600">
          Thank you. Our team will review your requirement and get back to you with a quote.
        </p>
        <p className="mt-6 text-sm text-muted">Your reference</p>
        <p className="text-2xl font-extrabold tracking-wider text-brand-600">{reference}</p>
        <p className="mt-2 text-xs text-muted">
          Keep this reference — quote it when following up. We will not publish your details anywhere.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href={`${HYGIENE.basePath}/supply`} className="btn-ghost">
            Back to hygiene products
          </Link>
          <Link href={`${HYGIENE.basePath}/services`} className="btn-primary">
            Browse cleaning services
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-extrabold tracking-tight">Request a supply quote</h1>
      <p className="mt-2 text-slate-600">
        Tell us what your organisation needs and we will prepare a quote. Institutional supply is priced per
        specification and volume, so there is nothing to pay here.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-8">
        {/* ── Organisation ─────────────────────────────────── */}
        <fieldset className="card p-6">
          <legend className="px-2 text-sm font-bold uppercase tracking-wide text-muted">Your organisation</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Organisation name" required>
              <input
                className="input"
                required
                minLength={2}
                maxLength={160}
                value={form.organisation}
                onChange={(e) => set("organisation")(e.target.value)}
                placeholder="e.g. Riverside Secondary School"
              />
            </Field>
            <Field label="Sector">
              <select className="input" value={form.sector} onChange={(e) => set("sector")(e.target.value)}>
                <option value="">Select a sector</option>
                {ENQUIRY_SECTORS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="County / delivery location">
              <input
                className="input"
                maxLength={60}
                value={form.county}
                onChange={(e) => set("county")(e.target.value)}
                placeholder="e.g. Nairobi"
              />
            </Field>
          </div>
        </fieldset>

        {/* ── Requirement ──────────────────────────────────── */}
        <fieldset className="card p-6">
          <legend className="px-2 text-sm font-bold uppercase tracking-wide text-muted">What you need</legend>
          <p className="mb-3 text-sm text-muted">Select everything that applies.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {PRODUCT_OPTIONS.map((p) => {
              const checked = products.includes(p);
              return (
                <label
                  key={p}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition ${
                    checked ? "border-brand-500 bg-brand-50 text-ink" : "border-line bg-white text-slate-600"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-brand-500"
                    checked={checked}
                    onChange={() => toggleProduct(p)}
                  />
                  {p}
                </label>
              );
            })}
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Estimated quantity">
              <input
                className="input"
                maxLength={80}
                value={form.estimated_quantity}
                onChange={(e) => set("estimated_quantity")(e.target.value)}
                placeholder="e.g. 400 packs"
              />
            </Field>
            <Field label="How often">
              <select className="input" value={form.frequency} onChange={(e) => set("frequency")(e.target.value)}>
                <option value="">Select frequency</option>
                {ENQUIRY_FREQUENCIES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="mt-4">
            <Field label="Anything else we should know">
              <textarea
                className="input min-h-[100px]"
                maxLength={2000}
                value={form.notes}
                onChange={(e) => set("notes")(e.target.value)}
                placeholder="Delivery deadlines, tender reference, programme details…"
              />
            </Field>
          </div>
        </fieldset>

        {/* ── Contact ──────────────────────────────────────── */}
        <fieldset className="card p-6">
          <legend className="px-2 text-sm font-bold uppercase tracking-wide text-muted">How to reach you</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Contact person" required>
              <input
                className="input"
                required
                minLength={2}
                maxLength={120}
                value={form.contact_name}
                onChange={(e) => set("contact_name")(e.target.value)}
              />
            </Field>
            <Field label="Email address">
              <input
                className="input"
                type="email"
                maxLength={160}
                value={form.contact_email ?? ""}
                onChange={(e) => set("contact_email")(e.target.value)}
              />
            </Field>
            <Field label="Phone number">
              <input
                className="input"
                type="tel"
                maxLength={30}
                value={form.contact_phone}
                onChange={(e) => set("contact_phone")(e.target.value)}
                placeholder="07…"
              />
            </Field>
          </div>
          <p className="mt-4 flex items-start gap-2 text-xs text-muted">
            <Icon name="shield-check" className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
            Give us at least one of email or phone. Your details are used only to prepare and follow up on this quote —
            they are never published on this site or shared with other clients.
          </p>
        </fieldset>

        {error && (
          <p className="flex items-start gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200">
            <Icon name="alert-triangle" className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? "Sending…" : "Send enquiry"}
            {!submitting && <Icon name="arrow-right" className="h-4 w-4" />}
          </button>
          <Link href={`${HYGIENE.basePath}/supply`} className="btn-ghost">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="label">
        {label}
        {required && <span className="text-brand-600"> *</span>}
      </span>
      {children}
    </label>
  );
}
