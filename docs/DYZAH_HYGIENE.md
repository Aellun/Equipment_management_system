# Dyzah Hygiene

Dyzah Hygiene is one of the businesses under the Dyzah umbrella. It is a
**separate entity from Dyzah Errands** — its own brand, its own site, its own
catalog and its own operations console — while sharing the underlying booking,
pricing, assignment and payment engine.

Source of truth for positioning, copy and colours: the client's company profile
document. That PDF is **deliberately not committed** (see `.gitignore`); the
material it contributed lives in code, mainly in
`frontend/app/components/hygiene/brand.ts`.

---

## 1. Brand

Colours are sampled from the company logo:

| Token | Hex | Use |
| --- | --- | --- |
| Navy | `#032657` | Wordmark, dark chrome, headers, footers |
| Green | `#59A740` | "HYGIENE" lockup, CTAs, accents, links on dark |

Positioning lines carried through the site:

- *Promoting Health. Empowering Communities.* (tagline, under the logo)
- *Creating Cleaner Spaces. Promoting Health. Empowering Communities.*
- *Clean Spaces. Healthy Lives. Empowered Communities.*
- *Serving Homes, Businesses, Institutions and Communities Across Kenya*

### How the theming works

The Dyzah palette is **CSS-variable driven**. `tailwind.config.ts` binds the
`brand`, `squid`, `navy` and `link` colours to CSS custom properties holding
space-separated RGB channels, which keeps Tailwind opacity modifiers
(`bg-brand-500/20`) working:

```ts
const rgbVar = (name: string) => `rgb(var(${name}) / <alpha-value>)`;
```

`globals.css` defines the default (Store/Errands orange) on `:root` and the
Dyzah Hygiene override on `.theme-hygiene`. `HygieneShell` puts that one class
on its root element, so **every shared services component rendered inside it
re-themes to navy + green with no component changes** — booking, tracking,
auth, price breakdowns and status badges all follow automatically.

Colours that must stay navy/green *regardless* of surface (the logo lockup, the
Hygiene card on the `/home` hub) use the fixed `hygiene-*` Tailwind colours
instead of the themable `brand-*` ramp.

---

## 2. Two pillars

The profile describes two distinct lines of business, and they need different
flows:

### Professional cleaning → catalog booking

Runs on the shared engine as `vertical="hygiene"`: instant quote → M-Pesa STK
push → crew assignment → photo proof. Categories mirror the profile's service
sections:

- Commercial Cleaning
- Residential Cleaning
- Institutional Cleaning
- Healthcare Cleaning
- Industrial Cleaning
- Hospitality Cleaning
- Sanitation & Washroom Hygiene
- Waste & Pest Control
- Laundry & Linen *(carried over from the previous hygiene catalog; not a line
  named in the profile — confirm with the client whether it stays)*

Prices are indicative "from" rates for a standard site; larger sites are
re-quoted after a visit.

### Hygiene products & sanitary pad supply → B2B enquiry

Institutional supply is quoted per tender, not sold at a public unit price, so
it deliberately **does not** appear in the catalog and has no STK-push
checkout. An organisation submits an enquiry and the team follows up
off-platform.

---

## 3. Routes

### Public

| Path | Purpose |
| --- | --- |
| `/hygiene` | Landing — two pillars, sectors, community impact |
| `/hygiene/about` | Who we are, our story, vision, mission, core values |
| `/hygiene/services` | Cleaning catalog (`vertical=hygiene`) |
| `/hygiene/book/[serviceId]` | Booking + quote + M-Pesa |
| `/hygiene/supply` | Hygiene products & sanitary pad distribution pillar |
| `/hygiene/supply/enquiry` | B2B supply quote request form |
| `/hygiene/track` | Track a booking by reference |
| `/hygiene/login`, `/register`, `/dashboard`, `/runner`, `/tasks/[id]` | Shared account surfaces |

### Admin

| Path | Purpose |
| --- | --- |
| `/ops/hygiene` | Hygiene operations — jobs, crew, pricing, **Enquiries** |
| `/ops/services` | Dyzah Errands operations (separate console) |

Tasks, disputes and pricing in each console are filtered to that business's
vertical, so the two never bleed into each other.

### API

| Method | Endpoint | Auth |
| --- | --- | --- |
| `POST` | `/api/errands/hygiene/enquiries` | public |
| `GET` | `/api/errands/hygiene/enquiries/{ref}/status` | public |
| `GET` | `/api/errands/hygiene/admin/enquiries` | **admin** |
| `POST` | `/api/errands/hygiene/admin/enquiries/{id}/status` | **admin** |

Cleaning bookings use the existing `/api/errands/services` and
`/api/errands/tasks` endpoints with `vertical=hygiene`.

---

## 4. Handling client information

Supply enquiries carry prospective-client contact details and procurement
intent. The rules the code enforces:

- **Two response shapes.** `EnquiryReceipt` (reference + status only) is what
  unauthenticated callers get, on both submit and status lookup.
  `EnquiryOut` — which includes contact fields — is returned *only* from the
  admin-authenticated routes. `test_hygiene_enquiry.py` asserts this boundary,
  including that a signed-in non-admin customer gets a 403.
- **Notifications carry references, not details.** The admin alert on a new
  enquiry contains the `DH-XXXXXX` reference and nothing else.
- **No cached PII.** nginx sets `Cache-Control: no-store` on `/ops` as well as
  `/admin`, since the hygiene console renders enquiry contact details.
- **No invented contact details.** The profile publishes no phone, email or
  address, so none are hardcoded. `HYGIENE_CONTACT` reads from
  `NEXT_PUBLIC_HYGIENE_EMAIL` / `_PHONE` / `_ADDRESS` and defaults to empty;
  the footer renders a fallback instead of a blank block when they are unset.
- **No client names anywhere public.** Sectors served are listed generically
  ("Educational institutions", "County governments"), never as a customer list,
  and there are no testimonials or logos attributed to real organisations.

### Configuring contact details

Once the client confirms what may be published, set these on the `frontend`
service in `docker-compose.yml` (they are build-time inlined by Next.js, so
rebuild the image after changing them):

```yaml
NEXT_PUBLIC_HYGIENE_EMAIL: info@example.co.ke
NEXT_PUBLIC_HYGIENE_PHONE: "+254 7XX XXX XXX"
NEXT_PUBLIC_HYGIENE_ADDRESS: "Street, Building, Nairobi"
```

---

## 5. Key files

```
backend/app/errands/
├── models/hygiene_enquiry.py     # HygieneEnquiry + EnquiryStatus
├── schemas/hygiene.py            # EnquiryCreate / Receipt / Out
├── routers/hygiene.py            # public + admin enquiry routes
├── seed.py                       # HYGIENE_CATALOG (upserted, stale rows retired)
└── tests/test_hygiene_enquiry.py # privacy boundary coverage

frontend/app/
├── (hygiene)/hygiene/**          # the Dyzah Hygiene site
├── components/hygiene/
│   ├── brand.ts                  # copy, colours, sectors, values, contact
│   ├── HygieneLogo.tsx           # navy/green wordmark lockup
│   ├── HygieneShell.tsx          # navy header/footer, applies .theme-hygiene
│   ├── EnquiryForm.tsx           # B2B supply quote request
│   └── client.ts                 # enquiry API client
├── globals.css                   # :root + .theme-hygiene brand variables
└── (admin)/ops/hygiene/          # hygiene operations console
```

### Reseeding the catalog

Hygiene rows are **upserted** by slug (unlike errands rows, which are
insert-only), because the catalog was re-cut against the company profile and
databases seeded earlier still hold the old names and categories.

The upsert refreshes the catalog *definition* only — name, category, icon,
description, unit, duration, sort order. It deliberately leaves `base_price` and
`is_active` alone, because those are editable from the ops console and the seed
runs on every container start; overwriting them would revert admin changes on
the next restart.

Hygiene services no longer in the catalog are deactivated rather than deleted,
since historical tasks still reference them.

```bash
docker compose exec backend python -m app.errands.seed
```
