"use client";

/**
 * Landing spot after a social sign-in.
 *
 * The backend redirects here with the result in the URL *fragment*
 * (`#token=…&next=…`), which never reaches a server or a proxy log. In popup
 * mode we hand the token to the window that opened us and close; otherwise we
 * adopt it here and continue to wherever the user was heading.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useServicesAuth } from "@/app/components/services/ServicesAuthProvider";

export default function OAuthCallbackPage() {
  const { adoptToken } = useServicesAuth();
  const router = useRouter();
  const [message, setMessage] = useState("Finishing sign-in…");
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const token = hash.get("token") ?? "";
    const error = hash.get("error") ?? "";
    const next = hash.get("next") || "/services";
    const isPopup = hash.get("popup") === "1";

    // Don't leave credentials sitting in the address bar.
    window.history.replaceState(null, "", window.location.pathname);

    if (isPopup && window.opener) {
      window.opener.postMessage(
        { source: "dyzah-oauth", token: token || undefined, error: error || undefined },
        window.location.origin
      );
      setMessage("You can close this window.");
      window.close();
      return;
    }

    if (error || !token) {
      setMessage(error || "Sign-in did not complete.");
      const dest = `/services/login?error=${encodeURIComponent(error || "Sign-in did not complete.")}`;
      setTimeout(() => router.replace(dest), 1200);
      return;
    }

    adoptToken(token)
      .then(() => router.replace(next))
      .catch(() => {
        setMessage("Could not load your account. Please sign in again.");
        setTimeout(() => router.replace("/services/login"), 1200);
      });
  }, [adoptToken, router]);

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-3 py-24 text-center">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-brand-500" />
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}
