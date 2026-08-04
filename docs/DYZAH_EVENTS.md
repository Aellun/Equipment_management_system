# Dyzah Events

Event equipment hire — the original equipment-tracking system, now a full
business in the umbrella with a customer storefront as well as an operations
console.

Design and feature set were researched against the established platforms in
this space: [Rentman](https://rentman.io), [Current RMS](https://current-rms.com),
[Goodshuffle Pro](https://pro.goodshuffle.com) and [Booqable](https://booqable.com).

---

## 1. Why hire works the way it does

Two findings shaped the build.

**Soft availability, not checkout.** Every serious platform in event hire lets
a customer pick dates, build a list and *request* — a human then confirms
stock, transport and site access before money moves. Nobody takes card payment
for a three-day marquee hire without a conversation. So the storefront has no
checkout; it produces a reference and an estimate.

**Utilisation is the metric.** Stock sitting in the store earns nothing, and
the industry benchmark for a healthy hire fleet is roughly 60–80% utilisation.
Below that, capital is idle; above it, work is being turned away. That is why
the admin dashboard leads with utilisation rather than a wall of counts, and
why the next two figures are overdue returns and kit stuck in repair — the two
things that go wrong daily.

---

## 2. Stock model

Equipment is stored **one row per physical unit**, each with its own serial
number, because check-out, check-in and maintenance all operate on individual
units. But nobody hires "serial CH-0043" — they hire "80 chairs for Saturday".

So the storefront **groups units by name**. The group's hire rate and listing
copy live on the units themselves and are set identically across a group (the
`PATCH /equipment/group` endpoint does this in one call). Specific units are
allocated at dispatch.

### Storefront fields on `equipment`

| Field | Purpose |
| --- | --- |
| `daily_rate` | Hire rate per day, per unit |
| `description` | One line of listing copy |
| `image_url` | Optional listing image |
| `is_public` | **Defaults to false** — nothing appears publicly until published |

### Availability

Computed from reservations that overlap the requested range, minus anything
`Maintenance` or `Retired`:

```
available(name, start, end)
  = units(name) not in {Maintenance, Retired}
  − reservations(name) where start <= res.end AND end >= res.start
```

The overlap test is the standard interval comparison, so a booking that merely
abuts another does not count as a clash.

---

## 3. Routes

### Public storefront

| Path | Purpose |
| --- | --- |
| `/events` | Landing — dates first, then priced rails |
| `/events/hire` | Catalog, filtered by category, availability for chosen dates |
| `/events/request` | Hire list + quote request |
| `/events/track` | Status by reference |

### Staff

| Path | Purpose |
| --- | --- |
| `/admin` | Operations dashboard — utilisation, overdue, movements |
| `/events-ops` | Hire request pipeline: price and advance quotes |
| `/equipment`, `/reservations`, `/transactions`, `/maintenance` | Existing stock management |

### API

| Method | Endpoint | Auth |
| --- | --- | --- |
| `GET` | `/api/events/catalog` | public |
| `GET` | `/api/events/categories` | public |
| `POST` | `/api/events/availability` | public |
| `POST` | `/api/events/quotes` | public |
| `GET` | `/api/events/quotes/{ref}/status` | public |
| `GET` | `/api/events/admin/quotes` | **staff** |
| `PATCH` | `/api/events/admin/quotes/{id}` | **staff** |
| `GET` | `/api/events/admin/stats` | **staff** |

---

## 4. Handling customer information

A hire request carries the customer's name, phone, email and the **venue
address** — where valuable equipment will be sitting overnight. Same rules as
the rest of the platform:

- **Two response shapes.** `QuoteReceipt` (reference, status, price) is what
  unauthenticated callers get on both submit and status lookup. `QuoteOut` —
  which includes contact details and the venue — comes only from the
  staff-authenticated routes.
- **No cached PII.** nginx sets `Cache-Control: no-store` on `/admin` and
  `/ops`; `/events-ops` sits under the admin group and is covered by the same
  auth guard.
- **Nothing public by default.** `is_public` defaults to false on equipment, so
  stock cannot leak onto the storefront by accident.

---

## 5. Key files

```
backend/
├── app/api/routes/events.py         # catalog, availability, quotes, stats
├── app/schemas/events.py            # QuoteReceipt (public) vs QuoteOut (staff)
├── app/models/rental_quote.py       # RentalQuote + RentalQuoteItem
├── app/seed_events.py               # 29 hire groups, idempotent
└── alembic/versions/010_events_storefront.py

frontend/app/
├── (events)/events/**               # the storefront
├── components/events/
│   ├── client.ts                    # API client + hire-day maths
│   ├── EventsCart.tsx               # dates + lines, persisted
│   ├── EventsShell.tsx              # navy/green chrome
│   ├── EventsCatalog.tsx            # availability-aware catalog
│   ├── QuoteRequest.tsx             # hire list → request
│   └── EventsPipeline.tsx           # staff quote board
├── (admin)/admin/page.tsx           # operations dashboard
└── (admin)/events-ops/page.tsx
```

### Seeding stock

```bash
docker compose exec backend python -m app.seed_events
```

Idempotent: units are keyed by serial number, so re-running tops a group up to
its target count rather than duplicating it, and refreshes rates and copy
across the group.

---

## 6. Known gaps

- **Equipment admin screens are unchanged.** The dashboard and quote console
  are new, but Equipment, Reservations, Transactions and Maintenance are still
  the original screens and have not been restyled to match.
- **Quotes do not yet create reservations.** Confirming a quote sets its status;
  allocating specific units and writing reservation rows is still manual.
- **Delivery and setup are not priced.** The estimate covers equipment only;
  transport is quoted by staff on confirmation.
