# Security model — admin vs customer

This document describes the authentication and edge-hardening added under the
"foundation first" plan. The goal is real protection of customer PII, orders,
inventory and pricing — not security-through-obscurity.

## Authentication (the real control)

- **Staff/admin auth is JWT, cookie-based.** `POST /api/auth/login` validates
  the password (bcrypt) and sets two httpOnly cookies:
  - `dyzah_access` — short-lived **15-minute** access token (just-in-time session).
  - `dyzah_refresh` — **7-day** refresh token.
- `POST /api/auth/refresh` rotates the access token from the refresh cookie.
  `GET /api/auth/me` returns the current user. `POST /api/auth/logout` clears cookies.
- The frontend never reads tokens (cookies are httpOnly). The admin
  `AuthProvider` confirms the session on mount via `/auth/me` → `/auth/refresh`
  and refreshes every 10 min while open. **The old hardcoded client-side admin
  bypass has been removed.**
- Seeded admin (from migration `003`): `admin@fabent.com` / `Admin2024`
  — change this in production.

## Server-side authorization (FastAPI)

Enforced with dependencies in `backend/app/api/deps.py`:

- `require_staff` — any authenticated staff member.
- `require_admin` — Administrator only.

| Scope | Routers / endpoints |
|---|---|
| `require_admin` (whole router) | `users`, `activity-logs` |
| `require_staff` (whole router) | `equipment`, `clients`, `transactions`, `categories`, `maintenance`, `reservations`, `shop-categories`, `departments`, `delivery-zones`, `customers`, `uploads` |
| `require_staff` (admin endpoints only) | `products` (writes), `orders` (list + update), `reviews` (list-all + delete), `returns` (list + update) |
| **Public** (customer storefront) | all `/shop/*`, `cart`, `orders` checkout/track, `reviews` create + product/store reads, `returns` create, product GETs |

CORS is locked to `CORS_ORIGINS` with credentials enabled (no more `*`).

## Edge hardening (nginx, defence in depth)

- **Honeypot:** scanner probes (`/wp-admin`, `/wp-login.php`, `/xmlrpc.php`,
  `/phpmyadmin`, `/.env`, `/.git`, `/administrator`) get a blank `200`.
  `/admin` is **not** honeypotted — it is the real authenticated console.
- **Rate limiting:** staff login `5/min`, customer login `20/min` (HTTP 429).
- **Gateway secret:** nginx injects `X-Gateway-Secret` on every proxied request
  (overwriting any client-supplied copy). The backend `gateway_guard`
  middleware rejects **mutations** (POST/PUT/PATCH/DELETE) that lack it
  (`GATEWAY_ENFORCE=true`). GETs are exempt so SSR can read directly. SSR
  *writes* (server actions) present the secret themselves via `serverApi`.
- **No-store** cache headers on `/api/` and `/admin`.

## SSR + cookies

Admin pages are server components. `frontend/app/lib/serverApi.ts` forwards the
caller's auth cookie to the backend so SSR fetches run *as the logged-in staff
member*; unauthenticated visitors get 401s (empty pages) and the AuthGuard shows
the login screen.

## Production checklist

- Change `SECRET_KEY`, `GATEWAY_SECRET`, and the seeded admin password. Set both
  secrets in `.env` (gitignored) — nginx picks `GATEWAY_SECRET` up through
  `nginx/default.conf.template`, which is envsubst'd at container start, so the
  gateway header and the backend's expectation stay in step automatically.
- Set `COOKIE_SECURE=true` behind HTTPS.
- Set `CORS_ORIGINS` to your real domain(s).

## Deliberately NOT done (from the original 14 suggestions)

These are obscurity/enterprise items with low ROI once real auth exists; skipped
to avoid brittleness and breaking SEO/UX:

- Secret/obfuscated admin path + dynamic per-session routes.
- Splitting the frontend into separate customer/admin services (Next route
  groups already isolate the bundles).
- Device fingerprinting + geo-validation (privacy/infra heavy).
- TOTP MFA — a good next step; not yet implemented (`pyotp` would slot into
  `/auth/login`).
