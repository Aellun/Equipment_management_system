# Social login (Google, Facebook, GitHub, Microsoft)

Customers can sign in to the Dyzah services accounts (`/services`, `/hygiene`)
with a social provider instead of an email and password. Buttons appear on
`/services/login`, `/services/register` (customer tab) and the booking sign-in
modal.

Nothing is required to run the stack. Every provider is always shown; one whose
credentials are missing renders greyed out with a **Soon** chip and says
"<provider> sign-in isn't switched on yet" when tapped, instead of bouncing the
customer to a provider error page. `/errands/auth/providers` reports which are
live:

```bash
curl http://localhost/api/errands/auth/providers
# [{"key":"google","label":"Google","brand":"#ea4335","configured":false}, …]
```

`/oauth/{provider}/start` still 404s for an unconfigured provider — the UI state
is a courtesy, not the security boundary.

## How it works

```
Browser ──▶ /api/errands/auth/oauth/{provider}/start   (302 to the provider)
Provider ─▶ /api/errands/auth/oauth/{provider}/callback?code&state
Backend  ─▶ /services/auth/callback#token=…&next=…     (302 back to the app)
```

* **`state`** is a signed, 15-minute JWT holding the provider, a nonce and the
  post-login destination — the callback rejects anything it did not mint.
* The session token comes back in the URL **fragment**, which browsers never
  send to a server, so it stays out of nginx and provider logs. The landing
  page strips it from the address bar immediately.
* Sign-in runs in a **popup** and posts the token back to the page that opened
  it. That is what lets the booking screen keep a half-filled errand while the
  customer signs in. Popup blocked? It falls back to a full-page redirect and
  returns to `next`.

## Account matching

1. Known `(provider, provider_account_id)` → that account (`errand_oauth_accounts`).
2. Otherwise a services account with the same email → the social identity is
   linked to it, so password and social sign-in reach the same account.
3. Otherwise a new **customer** account is created with no password. Runner and
   crew accounts still go through the sign-up form, which captures the vetting
   details (suburb, skills, ID) social profiles don't carry.

Social-only accounts have an empty `hashed_password`; `verify_password` treats
that as "no password will ever match", so they cannot be logged into by guess.
Those customers have no phone number on file until they enter one at checkout.

## Configuration

Set these in `.env` next to `docker-compose.yml` (all optional):

| Variable | Notes |
| --- | --- |
| `OAUTH_PUBLIC_BASE_URL` | Public origin, e.g. `https://dyzah.co.ke`. Blank = derive from the request (fine behind nginx locally). |
| `OAUTH_GOOGLE_CLIENT_ID` / `..._SECRET` | Google Cloud Console → Credentials → OAuth client (Web). |
| `OAUTH_FACEBOOK_CLIENT_ID` / `..._SECRET` | Meta for Developers → app → Facebook Login. |
| `OAUTH_GITHUB_CLIENT_ID` / `..._SECRET` | GitHub → Settings → Developer settings → OAuth Apps. |
| `OAUTH_MICROSOFT_CLIENT_ID` / `..._SECRET` | Entra ID → App registrations (multitenant). |

**Redirect URI to register with every provider:**

```
{OAUTH_PUBLIC_BASE_URL}/api/errands/auth/oauth/{provider}/callback
```

e.g. `http://localhost/api/errands/auth/oauth/google/callback` for local Docker,
`https://dyzah.co.ke/api/errands/auth/oauth/facebook/callback` in production.
Facebook and Google require HTTPS for anything but localhost.

Then `docker compose up -d --build backend` and the buttons appear.

## Adding another provider

Add one `Provider(...)` entry to `PROVIDERS` in
[`backend/app/errands/core/oauth.py`](backend/app/errands/core/oauth.py) with a
parser mapping its profile JSON to `Profile(subject, email, full_name)`, then add
the matching `OAUTH_<KEY>_CLIENT_ID` / `_SECRET` settings to
`app/errands/core/config.py` and `docker-compose.yml`. The frontend picks it up
automatically from `/errands/auth/providers`; add a brand mark to `MARKS` in
`frontend/app/components/services/SocialAuth.tsx` for a proper logo, or it falls
back to a coloured dot.

Apple and LinkedIn need a signed-JWT client secret and a different token call
respectively — both fit the same registry but need their own secret builder.
