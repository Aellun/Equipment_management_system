# Changelog

All notable changes to this project will be documented in this file.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Added — Dyzah Events: customer storefront + rental operations

Researched against Rentman, Current RMS, Goodshuffle Pro and Booqable. The
consistent pattern in event hire is **soft availability + quote request** —
customers pick dates and build a list; a human confirms stock, transport and
access before money moves — with **utilisation** as the headline operating
metric.

- **Public storefront at `/events`**: dates first (they decide availability),
  catalog grouped by item with live "8 free of 8 on your dates", hire list
  persisted across visits, quote request, and reference tracking.
- **New API**: `/events/catalog`, `/events/availability` (proper interval-overlap
  logic), `/events/quotes` + staff pipeline, and `/events/admin/stats`.
- **Hire inventory seeded**: 29 groups (~1,700 units) across seating, tables,
  tents, audio, lighting, power, catering and decor, with day rates.
- **Equipment gains storefront fields** — `daily_rate`, `description`,
  `image_url`, `is_public`. Nothing appears publicly until deliberately
  published (`is_public` defaults to false).
- **Admin dashboard rebuilt** around rental KPIs: fleet utilisation against the
  60–80% industry benchmark, overdue returns, today's movements, repair
  backlog and pipeline value — replacing a generic count wall.
- **`/events-ops`**: quote board where staff price and advance requests.

### Added — purpose-built operations consoles per business

The single generic services console was built around errands and fitted
neither of the other businesses.

- **`/ops/hygiene`** is a cleaning day sheet: Today (visits, unassigned crew,
  overdue, awaiting sign-off) → Schedule by day → Crew vetting → Leads (site
  surveys and product supply in one pipeline) → Pricing showing each service's
  booking path.
- **`/ops/services`** is a live errands dispatch board: unassigned queue first,
  then who is on the road, with auto/manual assignment.

### Added — customer accounts shaped to each business

- **`/hygiene/account`**: next visit leads, plan and per-visit saving beside
  it, then upcoming / past visits (with photo proof) / saved addresses.
- **`/services/account`**: a progress rail for live errands
  (paid → assigned → on the way → proof → done), unpaid quotes surfaced first,
  receipts below.

### Changed

- `/home` presents four businesses; Events joins the cross-business switchers.
- Admin nav groups by business, each linking to its own storefront.
- Events uses the Dyzah Hygiene navy/green via `.theme-events`, kept as its own
  class so it can diverge later.

### Privacy

Event quote requests carry customer contact details and venue addresses.
Public routes return a reference, status and price only; the full record is
staff-only. Verified end to end.

---

## [Previous unreleased] — Dyzah Hygiene

### Added — Dyzah Hygiene as a separate business

- **Its own branded site at `/hygiene`**: landing, About (who we are, our story,
  vision, mission, core values), cleaning catalog, booking, tracking and account
  surfaces. Copy and positioning come from the client's company profile.
- **Client brand colours**: navy `#032657` and green `#59A740`, sampled from the
  company logo. The Dyzah palette is now CSS-variable driven, so the single
  `.theme-hygiene` class on the hygiene shell re-themes every shared services
  component without touching them.
- **B2B supply enquiries** for the hygiene product / sanitary pad pillar, which
  is quoted per tender rather than sold at a public price:
  `POST /api/errands/hygiene/enquiries` (public) and admin list/status routes.
  Public responses return a reference and status only — contact details are
  returned exclusively from admin-authenticated routes.
- **Separate operations console** at `/ops/hygiene`, including an Enquiries tab.
  `/ops/services` is now Dyzah Errands only; both filter by vertical.
- Documentation: `docs/DYZAH_HYGIENE.md`.

### Changed

- **Hygiene catalog re-cut** to the profile's service lines (commercial,
  residential, institutional, healthcare, industrial, hospitality cleaning, plus
  sanitation/washroom hygiene, waste & pest control and laundry). Hygiene rows
  are now upserted by slug and retired rows deactivated rather than deleted.
- **`/services` is Dyzah Errands only** — it no longer lists hygiene services.
- `/home` presents three customer-facing businesses; the Hygiene card carries
  its own logo and colours.
- nginx sets `Cache-Control: no-store` on `/ops` as well as `/admin`, since the
  hygiene console renders prospective-client contact details.

---

## [0.2.1] - 2026-05-14

### Fixed
- **Backend container permission denied**: `ENTRYPOINT` changed from `["./entrypoint.sh"]` to `["/bin/bash", "entrypoint.sh"]` so that the host bind-mount (`./backend:/app`) no longer silently strips the execute bit set during the Docker build.

### Changed
- **Next.js upgraded 14.2.3 → 15.x**: resolves flagged security vulnerabilities; `eslint-config-next` bumped to match. No code changes required — no dynamic route params or other 15.x breaking-change APIs are used.

---

## [0.2.0] - 2026-05-14

### Added — Phase 3: Condition Monitoring & UI Polish

#### Frontend
- **Dashboard visualisations**: SVG utilisation progress ring showing % of gear currently out; colour-coded stacked inventory distribution bar (Available / Out / Maintenance)
- **Maintenance Watchlist**: dedicated table on the dashboard listing all items currently in `Maintenance` status with red accent border
- **Recent Returns**: dashboard section showing the last 5 returned transactions with condition badges
- **Equipment search & filter**: live text search (name, serial, category) + status filter pills (All / Available / Out / Maintenance) on the Equipment page
- **Client search**: live text search (name, email, phone) on the Clients page
- **Transaction tabs + search**: All / Active / Returned tab switcher with active-count badge, plus free-text search (equipment name, client name, staff) on the Transactions page
- `TransactionList` Client Component: consolidates checkout form + checkin modals + tabs + search into one interactive component, receiving data from the Server Component page
- `EquipmentList` Client Component: search + filter wrapper for equipment table
- `ClientList` Client Component: search wrapper for clients table

#### Infrastructure
- Fixed frontend `Dockerfile`: switched from `npm ci` (requires lock file) to `npm install`

---

## [0.1.0] - 2026-05-14

### Added — Phase 1 & 2: Foundation + Transaction Logic

#### Infrastructure
- `docker-compose.yml`: PostgreSQL 16, FastAPI backend, Next.js frontend services with healthcheck dependency chain
- Backend `Dockerfile` + `entrypoint.sh`: runs Alembic migrations on container startup before serving
- Frontend `Dockerfile`: Node 20 Alpine for lean image size
- `INTERNAL_API_URL` / `NEXT_PUBLIC_API_URL` split to support Server Component vs. Client Component fetching

#### Backend — FastAPI + PostgreSQL
- Modular project structure: `app/api/`, `app/models/`, `app/schemas/`, `app/crud/`
- SQLAlchemy 2.0 async engine (`asyncpg` driver) with `async_sessionmaker`
- Pydantic v2 schemas with `from_attributes = True` for ORM serialisation
- Alembic migration setup with `psycopg2-binary` sync driver for migration runs
- **Initial migration** `001_initial`: creates `equipment`, `clients`, `transactions`, `audit_logs` tables with PostgreSQL enums
- `GET/POST/PATCH/DELETE /equipment` — full CRUD for inventory items
- `GET/POST/PATCH/DELETE /clients` — full CRUD for clients
- `GET /clients/{id}/history` — per-client transaction history
- `POST /transactions/checkout` — validates `Available` status, atomically sets status to `Out`
- `PATCH /transactions/checkin/{id}` — mandatory inspection payload; routes `Damaged`/`Needs Repair` to `Maintenance`, `Good` back to `Available`
- CORS middleware configured for `http://localhost:3000`
- `/health` endpoint

#### Frontend — Next.js 14 + Tailwind CSS
- App Router (`app/` directory) with dark-themed sidebar navigation
- **Dashboard** (Server Component): inventory stats (Available / Out / Maintenance counts) + active transactions table
- **Equipment page** (Server Component list + Client Component form): inventory table with colour-coded status badges, add-equipment modal
- **Clients page** (Server Component list + Client Component form): client list, add-client form
- **Transactions page** (Server Component list + Client Component forms): full transaction history, checkout form, inline check-in modal with condition selector
- TypeScript types (`types/index.ts`) mirroring all API response shapes
