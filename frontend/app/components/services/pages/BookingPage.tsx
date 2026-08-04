"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { servicesApi, tasksApi, paymentsApi, type Service, type Quote, type Task } from "../client";
import { useServicesAuth } from "../ServicesAuthProvider";
import { Icon, serviceIconName } from "../Icon";
import { PriceBreakdown, Spinner } from "../ui";
import LocationInput, { routeDistanceKm, type PlacePick } from "../LocationInput";

const URGENCIES: [string, string, string][] = [
  ["standard", "Standard", "Within the day"],
  ["sameday", "Same-day", "Guaranteed today (+15%)"],
  ["express", "Express", "~2 hours (+40%)"],
];

export default function BookingPage({ vertical, basePath, serviceId }: { vertical?: string; basePath: string; serviceId: string }) {
  const { user } = useServicesAuth();
  const router = useRouter();

  const [service, setService] = useState<Service | null>(null);
  const [form, setForm] = useState({ pickup_location: "", dropoff_location: "", urgency: "standard", notes: "", phone: "" });
  const [pickup, setPickup] = useState<PlacePick | null>(null);
  const [dropoff, setDropoff] = useState<PlacePick | null>(null);
  const [distanceKm, setDistanceKm] = useState(0);
  const [distanceAuto, setDistanceAuto] = useState(false);
  const [manualDistance, setManualDistance] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [step, setStep] = useState<"form" | "pay">("form");
  const [task, setTask] = useState<Task | null>(null);
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    servicesApi.list(vertical).then((list) => {
      setService(list.find((x) => String(x.id) === String(serviceId)) ?? null);
    });
  }, [serviceId, vertical]);

  useEffect(() => {
    if (user?.phone) setForm((f) => ({ ...f, phone: user.phone }));
  }, [user]);

  // Uber-style: once both locations are picked, the road distance between
  // them is worked out automatically and drives the quote.
  useEffect(() => {
    if (manualDistance) return;
    if (!pickup || !dropoff) {
      setDistanceAuto(false);
      return;
    }
    let cancelled = false;
    setCalculating(true);
    routeDistanceKm(pickup, dropoff)
      .then((km) => {
        if (cancelled) return;
        setDistanceKm(Math.round(km * 10) / 10);
        setDistanceAuto(true);
      })
      .finally(() => !cancelled && setCalculating(false));
    return () => {
      cancelled = true;
    };
  }, [pickup, dropoff, manualDistance]);

  useEffect(() => {
    if (!service) return;
    servicesApi
      .quote({ service_type_id: service.id, distance_km: Number(distanceKm) || 0, urgency: form.urgency })
      .then(setQuote)
      .catch(() => setQuote(null));
  }, [service, distanceKm, form.urgency]);

  if (!service) return <Spinner />;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const book = async () => {
    setError("");
    if (!user) {
      router.push(`${basePath}/login?from=${encodeURIComponent(`${basePath}/book/${serviceId}`)}`);
      return;
    }
    if (user.role !== "customer") {
      setError("Only customer accounts can book.");
      return;
    }
    setBusy(true);
    try {
      const data = await tasksApi.create({
        service_type_id: service.id,
        pickup_location: pickup?.label ?? form.pickup_location,
        dropoff_location: dropoff?.label ?? form.dropoff_location,
        distance_km: Number(distanceKm) || 0,
        urgency: form.urgency,
        notes: form.notes,
        phone: form.phone,
      });
      setTask(data);
      setStep("pay");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create booking.");
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
      setError(e instanceof Error ? e.message : "Payment could not be initiated.");
    } finally {
      setBusy(false);
    }
  };

  const confirmMock = async (success: boolean) => {
    if (!checkoutId || !task) return;
    setBusy(true);
    try {
      await paymentsApi.simulate(checkoutId, success);
      router.push(`${basePath}/tasks/${task.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not confirm payment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <button onClick={() => router.back()} className="mb-4 flex items-center gap-1 text-sm text-slate-500 hover:text-ink">
        <Icon name="arrow-left" className="h-4 w-4" /> Back
      </button>

      <div className="card p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="icon-chip h-12 w-12 sm:h-14 sm:w-14">
            <Icon name={serviceIconName(service)} className="h-6 w-6 sm:h-7 sm:w-7" />
          </span>
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">{service.name}</h1>
            <p className="text-sm text-slate-500">{service.category}</p>
          </div>
        </div>

        {error && <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {step === "form" && (
          <div className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <LocationInput
                label="Pickup location"
                placeholder="e.g. Sarit Centre, Westlands"
                value={pickup}
                onChange={(place, typed) => {
                  setPickup(place);
                  setForm((f) => ({ ...f, pickup_location: typed }));
                }}
              />
              <LocationInput
                label="Drop-off / site location"
                placeholder="e.g. Kileleshwa, Nairobi"
                value={dropoff}
                onChange={(place, typed) => {
                  setDropoff(place);
                  setForm((f) => ({ ...f, dropoff_location: typed }));
                }}
              />
            </div>

            {/* Distance: auto-calculated from the two picked locations */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <Icon name="map-pin" className="h-4 w-4 text-brand-500" />
                  {calculating ? (
                    <span className="text-slate-500">Calculating distance…</span>
                  ) : distanceAuto && !manualDistance ? (
                    <span className="font-semibold text-ink">
                      ≈ {distanceKm} km <span className="font-normal text-slate-500">· auto-calculated route</span>
                    </span>
                  ) : manualDistance ? (
                    <span className="font-semibold text-ink">{distanceKm} km <span className="font-normal text-slate-500">· manual</span></span>
                  ) : (
                    <span className="text-slate-500">Pick both locations to auto-calculate the distance</span>
                  )}
                </div>
                <button
                  type="button"
                  className="text-xs font-medium text-link hover:underline"
                  onClick={() => setManualDistance((v) => !v)}
                >
                  {manualDistance ? "Use auto distance" : "Enter manually"}
                </button>
              </div>
              {manualDistance && (
                <div className="mt-3">
                  <input
                    type="range"
                    min={0}
                    max={40}
                    step={0.5}
                    className="w-full accent-brand-500"
                    value={distanceKm}
                    onChange={(e) => setDistanceKm(Number(e.target.value))}
                  />
                </div>
              )}
              <p className="mt-1.5 text-xs text-slate-400">First 3 km included free.</p>
            </div>

            <div>
              <label className="label">Urgency</label>
              <div className="grid gap-2 sm:grid-cols-3">
                {URGENCIES.map(([val, title, hint]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setForm({ ...form, urgency: val })}
                    className={`rounded-xl border p-3 text-left text-sm ${form.urgency === val ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:border-slate-300"}`}
                  >
                    <p className="font-semibold">{title}</p>
                    <p className="text-xs text-slate-500">{hint}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Notes for the crew</label>
              <textarea className="input" rows={2} placeholder="Anything they should know…" value={form.notes} onChange={set("notes")} />
            </div>

            <div>
              <label className="label">M-Pesa phone number</label>
              <input className="input" placeholder="07XX XXX XXX" inputMode="tel" value={form.phone} onChange={set("phone")} />
            </div>

            <PriceBreakdown q={quote} />

            <button className="btn-primary w-full" disabled={busy} onClick={book}>
              {busy ? "Please wait…" : "Continue to payment"}
            </button>
          </div>
        )}

        {step === "pay" && task && (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl bg-brand-50 p-4 text-sm text-brand-800">
              Booking <strong>{task.reference}</strong> created. Payment is made directly via M-Pesa STK push — you&rsquo;ll get a
              prompt on your phone to confirm.
            </div>
            <PriceBreakdown q={quote} />

            {!checkoutId ? (
              <button className="btn-primary w-full" disabled={busy} onClick={pay}>
                {busy ? "Sending STK push…" : "Pay with M-Pesa"}
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2 rounded-xl bg-gold-50 p-4 text-sm text-gold-700">
                  <Icon name="smartphone" className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    An M-Pesa prompt was sent to <strong>{form.phone}</strong>. Enter your PIN to complete the payment.
                    <p className="mt-2 text-xs">(Demo mode: confirm the result below to simulate the M-Pesa callback.)</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button className="btn-primary" disabled={busy} onClick={() => confirmMock(true)}>
                    <Icon name="check" className="h-4 w-4" /> Simulate success
                  </button>
                  <button className="btn-ghost" disabled={busy} onClick={() => confirmMock(false)}>
                    <Icon name="x" className="h-4 w-4" /> Simulate failure
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
