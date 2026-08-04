"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Icon } from "@/app/components/services/Icon";
import { hygieneApi } from "./client";

/**
 * Free site survey request — the business path.
 *
 * A hospital, factory or school cannot be priced from a form, so this asks
 * only what we need to send the right surveyor and nothing more. Short forms
 * convert; every extra field is a reason to leave.
 */
const SITE_TYPES = [
  "Office / corporate",
  "Retail, mall or showroom",
  "Bank or financial branch",
  "School / college / university",
  "Place of worship or community centre",
  "Government or public office",
  "Hospital, clinic or dental practice",
  "Laboratory or pharmacy",
  "Warehouse or distribution centre",
  "Manufacturing or production plant",
  "Hotel, restaurant or lodge",
  "Other",
];

const SIZES = ["Under 200 m²", "200 – 500 m²", "500 – 1,500 m²", "1,500 – 5,000 m²", "Over 5,000 m²", "Not sure"];

const FREQUENCIES = ["Daily", "Several times a week", "Weekly", "Fortnightly", "Monthly", "One-off"];

export default function SurveyRequest() {
  const params = useSearchParams();
  const [form, setForm] = useState({
    organisation: "",
    site_type: "",
    site_size: "",
    locations: "1",
    frequency: "",
    county: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    notes: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.contact_email && !form.contact_phone) {
      setError("Add an email address or a phone number so we can arrange the visit.");
      return;
    }
    setBusy(true);
    try {
      const res = await hygieneApi.submitEnquiry({
        kind: "survey",
        organisation: form.organisation,
        sector: form.site_type,
        county: form.county,
        contact_name: form.contact_name,
        contact_email: form.contact_email || null,
        contact_phone: form.contact_phone,
        site_type: form.site_type,
        site_size: form.site_size,
        locations: form.locations,
        frequency: form.frequency,
        // Carry the service they clicked from, so the surveyor has context.
        products: params.get("service") ?? "",
        notes: form.notes,
      });
      setReference(res.reference);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your request. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (reference) {
    return (
      <div className="mx-auto max-w-lg rounded border border-line bg-white p-8 text-center">
        <Icon name="check-circle" className="mx-auto h-12 w-12 text-brand-500" />
        <h1 className="mt-4 text-2xl font-bold">Survey requested</h1>
        <p className="mt-2 text-slate-600">We&apos;ll call to agree a time, visit the site, then send a fixed quote.</p>
        <p className="mt-6 text-xs uppercase tracking-wide text-muted">Your reference</p>
        <p className="text-2xl font-extrabold tracking-wider text-brand-600">{reference}</p>
        <Link href="/hygiene" className="btn-ghost mt-8 rounded">
          Back to Dyzah Hygiene
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded bg-hygiene-navy px-6 py-7 text-white">
        <h1 className="text-2xl font-extrabold md:text-3xl">Book a free site survey</h1>
        <p className="mt-1.5 text-white/75">
          We visit, measure the work, and send a fixed quote. No charge, no obligation.
        </p>
        <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-1.5 text-sm text-white/70">
          {["Visit within 48 hours", "Fixed written quote", "Schedule built around you"].map((t) => (
            <li key={t} className="flex items-center gap-1.5">
              <Icon name="check" className="h-4 w-4 text-hygiene-green" />
              {t}
            </li>
          ))}
        </ul>
      </div>

      <form onSubmit={submit} className="mt-5 space-y-4">
        <Section title="The site">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Organisation" required>
              <input
                className="input"
                required
                minLength={2}
                value={form.organisation}
                onChange={(e) => set("organisation")(e.target.value)}
              />
            </Field>
            <Field label="Type of site" required>
              <select
                className="input"
                required
                value={form.site_type}
                onChange={(e) => set("site_type")(e.target.value)}
              >
                <option value="">Select…</option>
                {SITE_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Approximate size">
              <select className="input" value={form.site_size} onChange={(e) => set("site_size")(e.target.value)}>
                <option value="">Select…</option>
                {SIZES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Number of locations">
              <input
                className="input"
                type="number"
                min={1}
                max={999}
                value={form.locations}
                onChange={(e) => set("locations")(e.target.value)}
              />
            </Field>
            <Field label="How often you need cleaning">
              <select className="input" value={form.frequency} onChange={(e) => set("frequency")(e.target.value)}>
                <option value="">Select…</option>
                {FREQUENCIES.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </Field>
            <Field label="Town / county">
              <input className="input" value={form.county} onChange={(e) => set("county")(e.target.value)} />
            </Field>
          </div>
        </Section>

        <Section title="Who we should speak to">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Name" required>
              <input
                className="input"
                required
                minLength={2}
                value={form.contact_name}
                onChange={(e) => set("contact_name")(e.target.value)}
              />
            </Field>
            <Field label="Phone">
              <input
                className="input"
                type="tel"
                value={form.contact_phone}
                onChange={(e) => set("contact_phone")(e.target.value)}
                placeholder="07…"
              />
            </Field>
            <Field label="Email">
              <input
                className="input"
                type="email"
                value={form.contact_email}
                onChange={(e) => set("contact_email")(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Anything else (optional)">
            <textarea
              className="input"
              rows={2}
              value={form.notes}
              onChange={(e) => set("notes")(e.target.value)}
              placeholder="Access hours, current provider, tender deadline…"
            />
          </Field>
          <p className="flex items-start gap-1.5 text-xs text-muted">
            <Icon name="shield-check" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
            Used only to arrange your survey and quote. Never published or shared.
          </p>
        </Section>

        {error && (
          <p className="flex items-start gap-2 rounded bg-red-50 p-3 text-sm text-red-700">
            <Icon name="alert-triangle" className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button type="submit" className="btn-primary rounded" disabled={busy}>
            {busy ? "Sending…" : "Request my free survey"}
          </button>
          <span className="text-sm text-muted">Takes under a minute</span>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded border border-line bg-white">
      <h2 className="border-b border-line px-5 py-3 font-bold">{title}</h2>
      <div className="space-y-4 p-5">{children}</div>
    </section>
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
