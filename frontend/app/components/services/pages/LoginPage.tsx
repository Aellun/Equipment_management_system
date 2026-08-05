"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useServicesAuth } from "../ServicesAuthProvider";
import SocialAuth from "../SocialAuth";

const DEMOS: [string, string, string][] = [
  ["Customer", "customer@demo.co.ke", "demo1234"],
  ["Runner", "runner@demo.co.ke", "demo1234"],
];

export default function LoginPage({ basePath }: { basePath: string }) {
  const { login } = useServicesAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [form, setForm] = useState({ email: "", password: "" });
  // A failed social sign-in bounces back here with its reason in ?error=.
  const [error, setError] = useState(params.get("error") ?? "");
  const [busy, setBusy] = useState(false);

  const dest = (role: string) => (role === "runner" ? `${basePath}/runner` : `${basePath}/dashboard`);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const user = await login(form.email, form.password);
      router.push(params.get("from") || dest(user.role));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <div className="card p-6">
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-500">Log in to manage your bookings.</p>

        {error && <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <button className="btn-primary w-full" disabled={busy}>{busy ? "Logging in…" : "Log in"}</button>
        </form>

        <SocialAuth
          next={params.get("from") || `${basePath}/account`}
          onSignedIn={(user) => router.push(params.get("from") || dest(user.role))}
        />

        <p className="mt-4 text-center text-sm text-slate-500">
          New here? <Link href={`${basePath}/register`} className="font-semibold text-brand-600">Create an account</Link>
        </p>

        <div className="mt-6 border-t border-slate-200 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Quick demo logins</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {DEMOS.map(([lbl, email, password]) => (
              <button key={lbl} type="button" onClick={() => setForm({ email, password })} className="rounded-lg bg-slate-100 px-2 py-2 text-xs font-medium hover:bg-slate-200">
                {lbl}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
