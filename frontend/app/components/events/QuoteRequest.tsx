"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/app/components/services/Icon";
import DateBar from "./DateBar";
import { useEventsCart } from "./EventsCart";
import { eventsApi, EVENT_TYPES, KES } from "./client";

/**
 * The hire list and the request that comes off it.
 *
 * No payment step: event hire is confirmed by a human who checks the stock,
 * the access at the venue and the transport before anyone is charged. The
 * customer leaves with a reference and a realistic estimate.
 */
export default function QuoteRequest() {
  const { start, end, days, lines, subtotal, setQuantity, remove, clear } = useEventsCart();
  const [form, setForm] = useState({
    contact_name: "",
    contact_phone: "",
    contact_email: "",
    organisation: "",
    event_type: "",
    guest_count: "",
    fulfilment: "Delivery" as "Delivery" | "Collection",
    venue: "",
    notes: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<{ reference: string; estimated_total: number } | null>(null);

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (lines.length === 0) {
      setError("Add at least one item to your hire list.");
      return;
    }
    if (!form.contact_email && !form.contact_phone) {
      setError("Add an email address or a phone number so we can send your quote.");
      return;
    }
    setBusy(true);
    try {
      const res = await eventsApi.requestQuote({
        contact_name: form.contact_name,
        contact_phone: form.contact_phone,
        contact_email: form.contact_email || null,
        organisation: form.organisation,
        event_type: form.event_type,
        start_date: start,
        end_date: end,
        guest_count: Number(form.guest_count) || 0,
        fulfilment: form.fulfilment,
        venue: form.venue,
        notes: form.notes,
        items: lines.map((l) => ({
          equipment_name: l.name,
          category: l.category,
          quantity: l.quantity,
          daily_rate: l.daily_rate,
        })),
      });
      setReceipt(res);
      clear();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your request. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (receipt) {
    return (
      <div className="mx-auto max-w-lg rounded border border-line bg-white p-8 text-center">
        <Icon name="check-circle" className="mx-auto h-12 w-12 text-brand-500" />
        <h1 className="mt-4 text-2xl font-bold">Request received</h1>
        <p className="mt-2 text-slate-600">
          We&apos;ll confirm stock and transport, then send your quote.
        </p>
        <p className="mt-6 text-xs uppercase tracking-wide text-muted">Your reference</p>
        <p className="text-2xl font-extrabold tracking-wider text-brand-600">{receipt.reference}</p>
        <p className="mt-4 text-sm text-muted">
          Estimate <span className="font-bold text-ink">{KES(receipt.estimated_total)}</span> — confirmed
          on quote.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/events/hire" className="btn-ghost rounded">
            Keep browsing
          </Link>
          <Link href="/events/track" className="btn-primary rounded">
            Track this request
          </Link>
        </div>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-lg rounded border border-line bg-white p-10 text-center">
        <Icon name="shopping-cart" className="mx-auto h-10 w-10 text-muted" />
        <p className="mt-3 font-semibold">Your hire list is empty</p>
        <p className="mt-1 text-sm text-muted">Pick your dates, then add the kit you need.</p>
        <Link href="/events/hire" className="btn-primary mt-5 rounded">
          Browse equipment
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Your hire list</h1>
      <DateBar compact />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr),340px]">
        <div className="space-y-4">
          {/* Lines */}
          <section className="overflow-hidden rounded border border-line bg-white">
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <h2 className="font-bold">
                {lines.length} item{lines.length === 1 ? "" : "s"}
              </h2>
              <button onClick={clear} className="text-sm text-muted hover:text-red-600">
                Clear list
              </button>
            </div>
            <ul className="divide-y divide-line">
              {lines.map((l) => (
                <li key={l.name} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{l.name}</p>
                    <p className="text-xs text-muted">
                      {KES(l.daily_rate)}/day · {l.category}
                    </p>
                  </div>
                  <div className="flex items-center rounded border border-slate-300">
                    <button
                      onClick={() => setQuantity(l.name, l.quantity - 1)}
                      className="grid h-8 w-8 place-items-center font-bold text-slate-600 hover:bg-canvas"
                      aria-label={`Fewer ${l.name}`}
                    >
                      −
                    </button>
                    <span className="w-10 text-center text-sm font-bold">{l.quantity}</span>
                    <button
                      onClick={() => setQuantity(l.name, l.quantity + 1)}
                      className="grid h-8 w-8 place-items-center font-bold text-slate-600 hover:bg-canvas"
                      aria-label={`More ${l.name}`}
                    >
                      +
                    </button>
                  </div>
                  <span className="w-24 text-right font-bold">
                    {KES(l.daily_rate * l.quantity * days)}
                  </span>
                  <button
                    onClick={() => remove(l.name)}
                    className="text-muted hover:text-red-600"
                    aria-label={`Remove ${l.name}`}
                  >
                    <Icon name="trash" className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {/* Event details */}
          <form onSubmit={submit} id="quote-form" className="space-y-4">
            <section className="rounded border border-line bg-white">
              <h2 className="border-b border-line px-5 py-3 font-bold">About the event</h2>
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <Field label="Type of event">
                  <select className="input" value={form.event_type} onChange={(e) => set("event_type")(e.target.value)}>
                    <option value="">Select…</option>
                    {EVENT_TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Expected guests">
                  <input
                    className="input"
                    type="number"
                    min={0}
                    value={form.guest_count}
                    onChange={(e) => set("guest_count")(e.target.value)}
                  />
                </Field>
                <Field label="Delivery or collection">
                  <div className="grid grid-cols-2 gap-2">
                    {(["Delivery", "Collection"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, fulfilment: m }))}
                        className={`rounded border py-2 text-sm font-semibold transition ${
                          form.fulfilment === m
                            ? "border-brand-500 bg-brand-50 text-brand-700"
                            : "border-slate-200 text-slate-600 hover:border-slate-400"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label={form.fulfilment === "Delivery" ? "Venue address" : "Venue / area"}>
                  <input className="input" value={form.venue} onChange={(e) => set("venue")(e.target.value)} />
                </Field>
              </div>
            </section>

            <section className="rounded border border-line bg-white">
              <h2 className="border-b border-line px-5 py-3 font-bold">Your details</h2>
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <Field label="Name" required>
                  <input
                    className="input"
                    required
                    minLength={2}
                    value={form.contact_name}
                    onChange={(e) => set("contact_name")(e.target.value)}
                  />
                </Field>
                <Field label="Company / organisation">
                  <input
                    className="input"
                    value={form.organisation}
                    onChange={(e) => set("organisation")(e.target.value)}
                  />
                </Field>
                <Field label="Phone">
                  <input
                    className="input"
                    type="tel"
                    placeholder="07…"
                    value={form.contact_phone}
                    onChange={(e) => set("contact_phone")(e.target.value)}
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
                <div className="sm:col-span-2">
                  <Field label="Anything else (optional)">
                    <textarea
                      className="input"
                      rows={2}
                      value={form.notes}
                      onChange={(e) => set("notes")(e.target.value)}
                      placeholder="Setup time, access, floor level, colour preferences…"
                    />
                  </Field>
                </div>
              </div>
              <p className="flex items-start gap-1.5 px-5 pb-5 text-xs text-muted">
                <Icon name="shield-check" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
                Used only to prepare and deliver your hire. Never published or shared.
              </p>
            </section>
          </form>
        </div>

        {/* Summary */}
        <aside className="lg:sticky lg:top-44 lg:self-start">
          <div className="rounded border border-line bg-white">
            <p className="border-b border-line px-4 py-3 font-bold">Estimate</p>
            <dl className="space-y-2 px-4 py-4 text-sm">
              <Row label="Hire length" value={`${days} day${days === 1 ? "" : "s"}`} />
              <Row label="Items" value={String(lines.reduce((n, l) => n + l.quantity, 0))} />
              <Row label="Equipment" value={KES(subtotal)} />
              <Row label="Delivery & setup" value="Quoted on confirmation" />
            </dl>
            <div className="flex items-end justify-between border-t border-line px-4 py-3">
              <span className="font-semibold">Estimate</span>
              <span className="text-2xl font-extrabold">{KES(subtotal)}</span>
            </div>

            {error && <p className="mx-4 mb-3 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

            <div className="border-t border-line p-4">
              <button type="submit" form="quote-form" className="btn-primary w-full rounded" disabled={busy}>
                {busy ? "Sending…" : "Request a quote"}
              </button>
              <p className="mt-2 text-center text-xs text-muted">
                No payment now. We confirm stock and transport first.
              </p>
            </div>
          </div>
        </aside>
      </div>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
