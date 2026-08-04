"use client";

import Link from "next/link";
import { Icon } from "../Icon";

export interface LandingContent {
  label: string;
  basePath: string;
  eyebrow: string;
  headline: string;
  headlineAccent: string;
  intro: string;
  categories: [string, string, string][]; // icon, title, body
}

const DIFFERENTIATORS: [string, string, string][] = [
  ["shield-check", "Direct M-Pesa payment", "Pay securely with one STK push straight from your phone — no cards, no hassle."],
  ["tag", "Transparent pricing", "See the full, itemised price before you book — no surprise charges, ever."],
  ["camera", "Photo proof", "Every job is completed with a photo and note for you to review."],
  ["badge-check", "Verified crew", "Every runner/crew is ID-verified and rated by real customers."],
];

const STEPS: [string, string][] = [
  ["Pick a service", "Choose what you need from the catalog."],
  ["Get an instant quote", "Transparent price shown before you commit."],
  ["Pay via M-Pesa", "One STK push to your phone — enter your PIN and you\u2019re done."],
  ["Crew completes + proof", "Review the photo proof and approve the job."],
];

export default function LandingPage({ content }: { content: LandingContent }) {
  const { label, basePath } = content;
  return (
    <div className="space-y-20">
      <section className="grid items-center gap-10 md:grid-cols-2">
        <div>
          <span className="badge bg-gold-50 text-gold-700 ring-1 ring-gold-300">
            <Icon name="star" filled className="h-3.5 w-3.5" />
            {content.eyebrow}
          </span>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
            {content.headline} <span className="text-brand-600">{content.headlineAccent}</span>
          </h1>
          <p className="mt-4 text-lg text-slate-600">{content.intro}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={`${basePath}/browse`} className="btn-primary">
              Book now <Icon name="arrow-right" className="h-4 w-4" />
            </Link>
            <Link href={`${basePath}/track`} className="btn-ghost">Track a booking</Link>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-squid to-navy p-6 text-white">
          <p className="text-sm text-brand-400">Why we're different</p>
          <h3 className="mt-1 text-xl font-bold">The Dyzah {label} promise — payment protection built in.</h3>
          <ul className="mt-6 space-y-4">
            {DIFFERENTIATORS.map(([icon, title, body]) => (
              <li key={title} className="flex gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-brand-400">
                  <Icon name={icon} className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="text-sm text-slate-300">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold">What we can do for you</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {content.categories.map(([icon, title, body]) => (
            <Link href={`${basePath}/browse`} key={title} className="card p-6 transition hover:-translate-y-1 hover:shadow-md hover:no-underline">
              <span className="icon-chip h-12 w-12">
                <Icon name={icon} className="h-6 w-6" />
              </span>
              <p className="mt-3 font-semibold text-ink">{title}</p>
              <p className="mt-1 text-sm text-slate-500">{body}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-2xl font-bold">How it works</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-4">
          {STEPS.map(([title, body], i) => (
            <div key={title}>
              <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-50 font-bold text-brand-600">{i + 1}</div>
              <p className="mt-3 font-semibold">{title}</p>
              <p className="mt-1 text-sm text-slate-500">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
