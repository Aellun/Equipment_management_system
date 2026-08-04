"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/app/components/services/Icon";
import { eventsApi, KES, type QuoteReceipt } from "./client";

const STEPS = ["New", "Quoted", "Confirmed", "Completed"];

/** Reference lookup. Returns progress only — never the customer's details. */
export default function EventsTrack() {
  const [reference, setReference] = useState("");
  const [result, setResult] = useState<QuoteReceipt | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const lookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResult(null);
    setBusy(true);
    try {
      setResult(await eventsApi.quoteStatus(reference.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not find that reference.");
    } finally {
      setBusy(false);
    }
  };

  const stepIndex = result ? STEPS.indexOf(result.status) : -1;

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-bold">Track a hire request</h1>
      <p className="mt-1 text-sm text-muted">Enter the reference we sent you, e.g. EV-1A2B3C.</p>

      <form onSubmit={lookup} className="mt-4 flex">
        <input
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="EV-XXXXXX"
          className="h-11 min-w-0 flex-1 rounded-l border border-r-0 border-slate-300 px-3 uppercase outline-none focus:border-brand-500"
        />
        <button className="rounded-r bg-brand-500 px-5 font-semibold text-white hover:bg-brand-600" disabled={busy}>
          {busy ? "…" : "Track"}
        </button>
      </form>

      {error && (
        <p className="mt-4 flex items-start gap-2 rounded bg-red-50 p-3 text-sm text-red-700">
          <Icon name="alert-triangle" className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      {result && (
        <div className="mt-5 rounded border border-line bg-white p-5">
          <div className="flex items-baseline justify-between">
            <span className="font-bold">{result.reference}</span>
            <span className="rounded bg-brand-50 px-2 py-0.5 text-sm font-semibold text-brand-700">
              {result.status}
            </span>
          </div>

          {result.status === "Cancelled" ? (
            <p className="mt-4 text-sm text-muted">This request was cancelled.</p>
          ) : (
            <ol className="mt-5 space-y-3">
              {STEPS.map((s, i) => {
                const done = i <= stepIndex;
                return (
                  <li key={s} className="flex items-center gap-3">
                    <span
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${
                        done ? "bg-brand-500 text-white" : "bg-canvas text-muted"
                      }`}
                    >
                      {done ? <Icon name="check" className="h-3.5 w-3.5" /> : i + 1}
                    </span>
                    <span className={done ? "font-medium text-ink" : "text-muted"}>{s}</span>
                  </li>
                );
              })}
            </ol>
          )}

          {result.estimated_total > 0 && (
            <p className="mt-5 border-t border-line pt-4 text-sm">
              <span className="text-muted">
                {result.status === "New" ? "Estimate" : "Quoted"}
              </span>{" "}
              <span className="text-lg font-extrabold">{KES(result.estimated_total)}</span>
            </p>
          )}
        </div>
      )}

      <p className="mt-6 text-center text-sm text-muted">
        Need something else?{" "}
        <Link href="/events/hire" className="link">
          Browse equipment
        </Link>
      </p>
    </div>
  );
}
