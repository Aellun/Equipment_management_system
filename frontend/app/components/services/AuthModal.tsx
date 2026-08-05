"use client";

/**
 * Sign in (or sign up) without leaving the page you're on.
 *
 * Mid-booking, sending someone to /services/login throws away the errand they
 * just filled in — pickup, drop-off, urgency, the lot. This does the same job
 * in place: password login, a quick customer sign-up, or a social provider,
 * and then hands the signed-in user straight back to the caller so the booking
 * can carry on.
 */

import { useEffect, useState } from "react";
import { useServicesAuth } from "./ServicesAuthProvider";
import SocialAuth from "./SocialAuth";
import { Icon } from "./Icon";
import type { SvcUser } from "./client";

type Mode = "login" | "register";

export default function AuthModal({
  open,
  onClose,
  onSignedIn,
  next,
  title = "Sign in to continue",
  subtitle = "Your details are kept — you'll come straight back here.",
  initialMode = "login",
}: {
  open: boolean;
  onClose: () => void;
  onSignedIn: (user: SvcUser) => void;
  /** Where a popup-blocked, full-page social sign-in should return to. */
  next: string;
  title?: string;
  subtitle?: string;
  initialMode?: Mode;
}) {
  const { login, register } = useServicesAuth();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setError("");
    }
  }, [open, initialMode]);

  // Escape closes, and the page behind must not scroll under the dialog.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const user =
        mode === "login"
          ? await login(form.email, form.password)
          : await register({
              full_name: form.full_name,
              email: form.email,
              phone: form.phone,
              password: form.password,
              role: "customer",
            });
      onSignedIn(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-ink">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-ink"
          >
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 text-sm font-semibold">
          {(["login", "register"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError("");
              }}
              className={`rounded-lg py-2 transition ${mode === m ? "bg-white text-ink shadow-sm" : "text-slate-500"}`}
            >
              {m === "login" ? "Log in" : "Create account"}
            </button>
          ))}
        </div>

        {error && <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={submit} className="mt-4 space-y-3">
          {mode === "register" && (
            <div>
              <label className="label">Full name</label>
              <input className="input" required minLength={2} value={form.full_name} onChange={set("full_name")} />
            </div>
          )}
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" required value={form.email} onChange={set("email")} />
          </div>
          {mode === "register" && (
            <div>
              <label className="label">Phone (M-Pesa)</label>
              <input
                className="input"
                inputMode="tel"
                required
                minLength={9}
                placeholder="07XX XXX XXX"
                value={form.phone}
                onChange={set("phone")}
              />
            </div>
          )}
          <div>
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              required
              minLength={mode === "register" ? 6 : undefined}
              value={form.password}
              onChange={set("password")}
            />
          </div>
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? "Please wait…" : mode === "login" ? "Log in & continue" : "Create account & continue"}
          </button>
        </form>

        <SocialAuth next={next} onSignedIn={onSignedIn} />
      </div>
    </div>
  );
}
