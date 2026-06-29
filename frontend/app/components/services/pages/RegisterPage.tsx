"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useServicesAuth } from "../ServicesAuthProvider";
import { Icon } from "../Icon";

export default function RegisterPage({ basePath, label }: { basePath: string; label: string }) {
  const { register } = useServicesAuth();
  const router = useRouter();
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", password: "", role: "customer", suburb: "", skills: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const user = await register(form);
      router.push(user.role === "runner" ? `${basePath}/runner` : `${basePath}/dashboard`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <div className="card p-6">
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="mt-1 text-sm text-slate-500">One Dyzah account works across Errands &amp; Hygiene.</p>

        {error && <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="mt-4 grid grid-cols-2 gap-2">
          {([
            ["customer", "user", "I need services"],
            ["runner", "bike", "I'm a runner/crew"],
          ] as const).map(([r, icon, lbl]) => (
            <button key={r} type="button" onClick={() => setForm({ ...form, role: r })} className={`flex items-center gap-2 rounded-xl border p-3 text-sm font-semibold ${form.role === r ? "border-brand-500 bg-brand-50 text-brand-700" : "border-stone-200"}`}>
              <Icon name={icon} className="h-5 w-5" />
              {lbl}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="label">Full name</label>
            <input className="input" required value={form.full_name} onChange={set("full_name")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" required value={form.email} onChange={set("email")} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" placeholder="07XX…" required value={form.phone} onChange={set("phone")} />
            </div>
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" required minLength={6} value={form.password} onChange={set("password")} />
          </div>

          {form.role === "runner" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Suburb</label>
                <input className="input" placeholder="Westlands" value={form.suburb} onChange={set("suburb")} />
              </div>
              <div>
                <label className="label">Skills</label>
                <input className="input" placeholder="delivery, laundry" value={form.skills} onChange={set("skills")} />
              </div>
            </div>
          )}

          <button className="btn-primary w-full" disabled={busy}>{busy ? "Creating…" : "Create account"}</button>
        </form>

        {form.role === "runner" && (
          <p className="mt-3 text-xs text-slate-500">Runner/crew accounts are ID-verified by our team before being assigned tasks.</p>
        )}

        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account? <Link href={`${basePath}/login`} className="font-semibold text-brand-600">Log in</Link>
        </p>
      </div>
    </div>
  );
}
