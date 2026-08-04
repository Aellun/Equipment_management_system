"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { servicesApi, tasksApi, paymentsApi, type Service, type Task } from "@/app/components/services/client";
import { useServicesAuth } from "@/app/components/services/ServicesAuthProvider";
import { Icon } from "@/app/components/services/Icon";
import { Spinner } from "@/app/components/services/ui";
import {
  ARRIVAL_WINDOWS,
  FREQUENCY_OPTIONS,
  hygieneApi,
  KES,
  type CleaningQuote,
  type Extra,
  type Frequency,
} from "./client";

/**
 * Booking a clean.
 *
 * Nothing about an errand's pickup → drop-off → distance → urgency flow
 * applies here. A clean is: how big is the place, how often, what else do you
 * want done, when should we come, where. The price recalculates on every
 * change and stays pinned in view, because that is the question the customer
 * is actually asking.
 *
 * Survey-quoted services never reach this component — the catalog sends them
 * to /hygiene/survey instead.
 */
const MAX_BEDROOMS = 8;
const MAX_BATHROOMS = 6;

/** Next 21 days, excluding today (crews are scheduled a day ahead). */
function upcomingDays(count = 21) {
  const out: Date[] = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  for (let i = 1; i <= count; i++) {
    const day = new Date(d);
    day.setDate(d.getDate() + i);
    out.push(day);
  }
  return out;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

export default function CleaningBooking({ serviceId }: { serviceId: string }) {
  const { user } = useServicesAuth();
  const router = useRouter();
  const params = useSearchParams();

  const [service, setService] = useState<Service | null>(null);
  const [extrasCatalog, setExtrasCatalog] = useState<Extra[]>([]);
  const [loading, setLoading] = useState(true);

  // Prefilled from the hero widget so nothing is asked twice.
  const [bedrooms, setBedrooms] = useState(Number(params.get("bedrooms")) || 3);
  const [bathrooms, setBathrooms] = useState(Number(params.get("bathrooms")) || 2);
  const [quantity, setQuantity] = useState(1);
  const [frequency, setFrequency] = useState<Frequency>(
    (params.get("frequency") as Frequency) || "fortnightly"
  );
  const [chosenExtras, setChosenExtras] = useState<string[]>([]);
  const [date, setDate] = useState("");
  const [window_, setWindow] = useState(ARRIVAL_WINDOWS[0]);
  const [address, setAddress] = useState("");
  const [accessNotes, setAccessNotes] = useState("");
  const [phone, setPhone] = useState("");

  const [quote, setQuote] = useState<CleaningQuote | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const days = useMemo(() => upcomingDays(), []);

  useEffect(() => {
    Promise.all([servicesApi.list("hygiene"), hygieneApi.extras()])
      .then(([list, ex]) => {
        setService(list.find((s) => String(s.id) === String(serviceId)) ?? null);
        setExtrasCatalog(ex);
      })
      .finally(() => setLoading(false));
  }, [serviceId]);

  useEffect(() => {
    if (user?.phone) setPhone(user.phone);
  }, [user]);

  useEffect(() => {
    if (!date && days.length) setDate(iso(days[0]));
  }, [days, date]);

  // Live price. Every input above feeds this.
  useEffect(() => {
    if (!service) return;
    let cancelled = false;
    hygieneApi
      .quote({
        service_type_id: service.id,
        bedrooms,
        bathrooms,
        quantity,
        frequency,
        extras: chosenExtras,
      })
      .then((q) => !cancelled && setQuote(q))
      .catch(() => !cancelled && setQuote(null));
    return () => {
      cancelled = true;
    };
  }, [service, bedrooms, bathrooms, quantity, frequency, chosenExtras]);

  if (loading) return <Spinner />;
  if (!service) return <p className="text-muted">Service not found.</p>;

  if (service.quote_mode === "survey") {
    return (
      <div className="mx-auto max-w-lg rounded border border-line bg-white p-6 text-center">
        <p className="font-semibold">{service.name} is quoted after a free site visit.</p>
        <Link href={`/hygiene/survey?service=${service.slug}`} className="btn-primary mt-4 rounded">
          Book a free site survey
        </Link>
      </div>
    );
  }

  const byRooms = service.quote_mode === "rooms";
  const toggleExtra = (slug: string) =>
    setChosenExtras((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));

  const book = async () => {
    setError("");
    if (!user) {
      router.push(`/hygiene/login?from=${encodeURIComponent(`/hygiene/book/${serviceId}`)}`);
      return;
    }
    if (user.role !== "customer") {
      setError("Only customer accounts can book a clean.");
      return;
    }
    if (!address.trim()) {
      setError("Add the address we're cleaning.");
      return;
    }
    if (!phone.trim()) {
      setError("Add an M-Pesa number for payment.");
      return;
    }
    setBusy(true);
    try {
      const created = await tasksApi.create({
        service_type_id: service.id,
        service_address: address.trim(),
        scheduled_date: date,
        arrival_window: window_,
        frequency,
        bedrooms: byRooms ? bedrooms : 0,
        bathrooms: byRooms ? bathrooms : 0,
        quantity: byRooms ? 1 : quantity,
        extras: chosenExtras,
        access_notes: accessNotes.trim(),
        phone: phone.trim(),
      });
      setTask(created);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the booking.");
    } finally {
      setBusy(false);
    }
  };

  const pay = async () => {
    if (!task) return;
    setBusy(true);
    setError("");
    try {
      const data = await paymentsApi.pay(task.id);
      setCheckoutId(data.checkout_request_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment could not be started.");
    } finally {
      setBusy(false);
    }
  };

  const confirmMock = async (success: boolean) => {
    if (!checkoutId || !task) return;
    setBusy(true);
    try {
      await paymentsApi.simulate(checkoutId, success);
      router.push(`/hygiene/account`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not confirm payment.");
    } finally {
      setBusy(false);
    }
  };

  // ── Payment step ──────────────────────────────────────────
  if (task) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <div className="rounded border border-line bg-white p-6">
          <div className="flex items-center gap-3">
            <Icon name="check-circle" className="h-8 w-8 text-brand-500" />
            <div>
              <p className="font-bold">Booking {task.reference} held</p>
              <p className="text-sm text-muted">Pay to confirm your slot.</p>
            </div>
          </div>

          <dl className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
            <Row label="Service" value={service.name} />
            <Row label="When" value={`${formatDay(date)}, ${window_}`} />
            <Row label="Where" value={address} />
            <Row label="Plan" value={FREQUENCY_OPTIONS.find((f) => f.value === frequency)?.label ?? ""} />
          </dl>

          <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
            <span className="font-semibold">Total</span>
            <span className="text-2xl font-extrabold">{KES(quote?.total_price)}</span>
          </div>

          {error && <p className="mt-3 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

          {!checkoutId ? (
            <button className="btn-primary mt-4 w-full rounded" disabled={busy} onClick={pay}>
              {busy ? "Sending M-Pesa prompt…" : "Pay with M-Pesa"}
            </button>
          ) : (
            <div className="mt-4 space-y-3">
              <p className="flex gap-2 rounded bg-gold-50 p-3 text-sm text-gold-700">
                <Icon name="smartphone" className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Check <strong>{phone}</strong> and enter your M-Pesa PIN.
                  <span className="mt-1 block text-xs">Demo mode — confirm the result below.</span>
                </span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button className="btn-primary rounded" disabled={busy} onClick={() => confirmMock(true)}>
                  Simulate success
                </button>
                <button className="btn-ghost rounded" disabled={busy} onClick={() => confirmMock(false)}>
                  Simulate failure
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Booking form ──────────────────────────────────────────
  return (
    <div>
      <button onClick={() => router.back()} className="mb-3 flex items-center gap-1 text-sm text-muted hover:text-ink">
        <Icon name="arrow-left" className="h-4 w-4" /> Back
      </button>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr),340px]">
        <div className="space-y-4">
          <div className="rounded border border-line bg-white p-5">
            <h1 className="text-xl font-bold">{service.name}</h1>
            <p className="mt-0.5 text-sm text-muted">{service.category}</p>
          </div>

          {/* 1 — size or quantity */}
          <Panel step={1} title={byRooms ? "Your home" : "How many units"}>
            {byRooms ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Stepper label="Bedrooms" value={bedrooms} min={1} max={MAX_BEDROOMS} onChange={setBedrooms} />
                <Stepper label="Bathrooms" value={bathrooms} min={1} max={MAX_BATHROOMS} onChange={setBathrooms} />
                <p className="text-xs text-muted sm:col-span-2">
                  Price covers {service.included_bedrooms} bedroom
                  {service.included_bedrooms === 1 ? "" : "s"} and {service.included_bathrooms} bathroom
                  {service.included_bathrooms === 1 ? "" : "s"}; extra rooms are added below.
                </p>
              </div>
            ) : (
              <div className="max-w-xs">
                <Stepper
                  label={service.price_unit.replace(" (from)", "")}
                  value={quantity}
                  min={1}
                  max={100}
                  onChange={setQuantity}
                />
              </div>
            )}
          </Panel>

          {/* 2 — plan */}
          <Panel step={2} title="How often" hint="Regular visits cost less per clean">
            <div className="grid gap-2 sm:grid-cols-4">
              {FREQUENCY_OPTIONS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFrequency(f.value)}
                  className={`rounded border px-3 py-2.5 text-left transition ${
                    frequency === f.value
                      ? "border-brand-500 bg-brand-50"
                      : "border-slate-200 hover:border-slate-400"
                  }`}
                >
                  <span className="block text-sm font-semibold text-ink">{f.label}</span>
                  {f.save && <span className="text-xs font-bold text-brand-600">{f.save}</span>}
                </button>
              ))}
            </div>
          </Panel>

          {/* 3 — extras */}
          {extrasCatalog.length > 0 && (
            <Panel step={3} title="Add anything else" hint="Optional">
              <div className="grid gap-2 sm:grid-cols-2">
                {extrasCatalog.map((e) => {
                  const on = chosenExtras.includes(e.slug);
                  return (
                    <button
                      key={e.slug}
                      onClick={() => toggleExtra(e.slug)}
                      className={`flex items-center justify-between rounded border px-3 py-2.5 text-sm transition ${
                        on ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:border-slate-400"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={`grid h-4 w-4 shrink-0 place-items-center rounded-sm border ${
                            on ? "border-brand-500 bg-brand-500 text-white" : "border-slate-300"
                          }`}
                        >
                          {on && <Icon name="check" className="h-3 w-3" />}
                        </span>
                        {e.label}
                      </span>
                      <span className="font-semibold">+{KES(e.price)}</span>
                    </button>
                  );
                })}
              </div>
            </Panel>
          )}

          {/* 4 — when */}
          <Panel step={4} title="When should we come">
            <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {days.slice(0, 14).map((d) => {
                const value = iso(d);
                const on = value === date;
                return (
                  <button
                    key={value}
                    onClick={() => setDate(value)}
                    className={`w-16 shrink-0 rounded border py-2 text-center transition ${
                      on ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:border-slate-400"
                    }`}
                  >
                    <span className="block text-[11px] uppercase text-muted">
                      {d.toLocaleDateString("en-KE", { weekday: "short" })}
                    </span>
                    <span className="block text-lg font-bold leading-tight">{d.getDate()}</span>
                    <span className="block text-[11px] text-muted">
                      {d.toLocaleDateString("en-KE", { month: "short" })}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-4">
              {ARRIVAL_WINDOWS.map((w) => (
                <button
                  key={w}
                  onClick={() => setWindow(w)}
                  className={`rounded border py-2 text-sm font-medium transition ${
                    window_ === w ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:border-slate-400"
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
          </Panel>

          {/* 5 — where */}
          <Panel step={5} title="Where">
            <div className="space-y-3">
              <label className="block">
                <span className="label">Address</span>
                <input
                  className="input"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Estate / building, house or flat number, area"
                />
              </label>
              <label className="block">
                <span className="label">How the crew gets in (optional)</span>
                <textarea
                  className="input"
                  rows={2}
                  value={accessNotes}
                  onChange={(e) => setAccessNotes(e.target.value)}
                  placeholder="Gate name, watchman, parking, pets…"
                />
              </label>
              <label className="block max-w-xs">
                <span className="label">M-Pesa number</span>
                <input
                  className="input"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="07XX XXX XXX"
                />
              </label>
              <p className="flex items-start gap-1.5 text-xs text-muted">
                <Icon name="shield-check" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
                Your address and access notes are shared only with the crew assigned to this visit.
              </p>
            </div>
          </Panel>
        </div>

        {/* Sticky summary */}
        <aside className="lg:sticky lg:top-44 lg:self-start">
          <div className="rounded border border-line bg-white">
            <p className="border-b border-line px-4 py-3 font-bold">Your price</p>
            <dl className="space-y-2 px-4 py-4 text-sm">
              <Row label={byRooms ? "Base clean" : `${quantity} × unit`} value={KES(quote?.base_price)} />
              {!!quote?.size_fee && <Row label="Extra rooms" value={KES(quote.size_fee)} />}
              {!!quote?.extras_fee && <Row label="Add-ons" value={KES(quote.extras_fee)} />}
              {!!quote?.frequency_discount && (
                <Row
                  label={`${FREQUENCY_OPTIONS.find((f) => f.value === frequency)?.label} plan`}
                  value={`− ${KES(quote.frequency_discount)}`}
                  accent
                />
              )}
              <Row label="Service fee" value={KES(quote?.service_fee)} />
            </dl>
            <div className="flex items-end justify-between border-t border-line px-4 py-3">
              <span className="font-semibold">Per visit</span>
              <span className="text-2xl font-extrabold">{KES(quote?.total_price)}</span>
            </div>

            {error && <p className="mx-4 mb-3 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

            <div className="border-t border-line p-4">
              <button className="btn-primary w-full rounded" disabled={busy} onClick={book}>
                {busy ? "Please wait…" : user ? "Confirm & pay" : "Sign in to book"}
              </button>
              <p className="mt-2 text-center text-xs text-muted">
                Free cancellation up to 24 hours before.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Panel({
  step,
  title,
  hint,
  children,
}: {
  step: number;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded border border-line bg-white">
      <div className="flex items-baseline gap-2 border-b border-line px-5 py-3">
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-hygiene-navy text-[11px] font-bold text-white">
          {step}
        </span>
        <h2 className="font-bold">{title}</h2>
        {hint && <span className="ml-auto text-xs text-muted">{hint}</span>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex w-full max-w-[11rem] items-center rounded border border-slate-300">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          className="grid h-10 w-10 shrink-0 place-items-center text-lg font-bold text-slate-600 hover:bg-canvas disabled:opacity-40"
          disabled={value <= min}
          aria-label={`Fewer ${label}`}
        >
          −
        </button>
        <span className="flex-1 text-center font-bold">{value}</span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          className="grid h-10 w-10 shrink-0 place-items-center text-lg font-bold text-slate-600 hover:bg-canvas disabled:opacity-40"
          disabled={value >= max}
          aria-label={`More ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className={`text-right font-medium ${accent ? "text-brand-600" : ""}`}>{value}</dd>
    </div>
  );
}

function formatDay(value: string) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long" });
}
