"use client";

/**
 * Social sign-in buttons (Google, Facebook, GitHub, Microsoft, …).
 *
 * Every provider is shown. Ones this deployment has no credentials for are
 * marked unavailable and say so when tapped, rather than bouncing the customer
 * to a provider error page. Sign-in runs in a popup and the token comes back by
 * postMessage — that matters on the booking screen, where sending someone away
 * to a login page would throw away the errand they had already filled in. If
 * the browser blocks popups we fall back to a full-page redirect.
 */

import { useEffect, useRef, useState } from "react";
import { authApi, oauthStartUrl, type AuthProvider, type SvcUser } from "./client";
import { useServicesAuth } from "./ServicesAuthProvider";

/** Message the /services/auth/callback page posts back to this window. */
interface OAuthMessage {
  source: "dyzah-oauth";
  token?: string;
  error?: string;
}

const MARKS: Record<string, React.ReactNode> = {
  google: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z" />
      <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7H1.4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.7l4 3.1C6.3 7 8.9 4.8 12 4.8Z" />
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="#1877F2"
        d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.3l-.5 3.5h-2.8v8.4A12 12 0 0 0 24 12Z"
      />
    </svg>
  ),
  github: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="#24292F"
        d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.9 1.2 1.9 1.2 1.1 1.9 2.9 1.3 3.6 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.4 4.8 18.4 5 18.4 5c.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3Z"
      />
    </svg>
  ),
  microsoft: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#F25022" d="M2 2h9.5v9.5H2Z" />
      <path fill="#7FBA00" d="M12.5 2H22v9.5h-9.5Z" />
      <path fill="#00A4EF" d="M2 12.5h9.5V22H2Z" />
      <path fill="#FFB900" d="M12.5 12.5H22V22h-9.5Z" />
    </svg>
  ),
};

export default function SocialAuth({
  next,
  onSignedIn,
  label = "Or continue with",
}: {
  /** Where a full-page fallback should land (also echoed back after login). */
  next: string;
  /** Called after the popup hands back a token and the user is loaded. */
  onSignedIn?: (user: SvcUser) => void;
  label?: string;
}) {
  const { adoptToken } = useServicesAuth();
  const [providers, setProviders] = useState<AuthProvider[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");
  const popupRef = useRef<Window | null>(null);
  const watchRef = useRef<ReturnType<typeof setInterval>>();

  // Callers pass inline handlers, so these live in refs: the message listener
  // below must be installed once and survive re-renders, or the popup watcher
  // it owns gets torn down mid-sign-in.
  const signedInRef = useRef(onSignedIn);
  const adoptRef = useRef(adoptToken);
  useEffect(() => {
    signedInRef.current = onSignedIn;
    adoptRef.current = adoptToken;
  });

  useEffect(() => {
    authApi.providers().then(setProviders).catch(() => setProviders([]));
  }, []);

  useEffect(() => {
    const onMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as OAuthMessage | undefined;
      if (!data || data.source !== "dyzah-oauth") return;

      clearInterval(watchRef.current);
      popupRef.current?.close();
      popupRef.current = null;
      setPending(null);

      if (data.error || !data.token) {
        setError(data.error || "Sign-in did not complete.");
        return;
      }
      try {
        const user = await adoptRef.current(data.token);
        signedInRef.current?.(user);
      } catch {
        setError("Signed in, but the session could not be loaded. Please try again.");
      }
    };
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      clearInterval(watchRef.current);
    };
  }, []);

  const start = (p: AuthProvider) => {
    setError("");
    if (!p.configured) {
      setError(
        `${p.label} sign-in isn't switched on yet — use your email and password, or another provider.`
      );
      return;
    }
    const key = p.key;
    setPending(key);
    const popup = window.open(
      oauthStartUrl(key, next, true),
      "dyzah-oauth",
      "width=520,height=650,menubar=no,toolbar=no"
    );
    if (!popup) {
      // Popups blocked — do it in this tab instead; the callback page will
      // send the browser on to `next`.
      window.location.href = oauthStartUrl(key, next, false);
      return;
    }
    popupRef.current = popup;
    // If they close the window themselves, stop showing a spinner forever.
    clearInterval(watchRef.current);
    watchRef.current = setInterval(() => {
      if (popup.closed) {
        clearInterval(watchRef.current);
        setPending((p) => (p === key ? null : p));
      }
    }, 700);
  };

  if (providers.length === 0) return null;

  return (
    <div className="mt-5">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-slate-200" />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      {error && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{error}</p>}

      <div className={`mt-3 grid gap-2 ${providers.length > 1 ? "sm:grid-cols-2" : ""}`}>
        {providers.map((p) => (
          <button
            key={p.key}
            type="button"
            disabled={pending !== null}
            onClick={() => start(p)}
            aria-disabled={!p.configured}
            title={p.configured ? `Continue with ${p.label}` : `${p.label} sign-in is not switched on yet`}
            className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition disabled:opacity-60 ${
              p.configured
                ? "border-slate-300 bg-white text-ink hover:border-slate-400 hover:bg-slate-50"
                : "border-dashed border-slate-300 bg-slate-50 text-slate-500 hover:bg-slate-100"
            }`}
          >
            {pending === p.key ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-brand-500" />
            ) : (
              <span className={p.configured ? "" : "opacity-50 grayscale"}>
                {MARKS[p.key] ?? <span className="block h-4 w-4 rounded-full" style={{ background: p.brand }} />}
              </span>
            )}
            {pending === p.key ? "Waiting…" : p.label}
            {!p.configured && (
              <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
                Soon
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
