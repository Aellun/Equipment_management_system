# Claude Project Rules: Event Equipment Tracking System

## 0. Code Graph First (read before searching)

This repo carries a pre-built code graph in `.graph/`. **Consult it before reaching for Grep, Glob, `find`, or a search subagent.** The graph already knows every symbol, API route, page route, DB table and import edge, so orientation questions are lookups, not searches.

**Order of operations for "where is X / what uses X / what does this file do":**

1. `python3 tools/graphify.py query <term>` — symbols, routes, tables and paths matching a term, each with `file:line`.
2. `python3 tools/graphify.py file <path>` — what a file defines, what it imports, and who imports it.
3. `python3 tools/graphify.py importers <path>` — blast radius before changing shared code.
4. `python3 tools/graphify.py routes [filter]` — every API and page route.
5. Read `.graph/GRAPH.md` for the whole-system map (routes, models, most-imported modules); `.graph/MODULES.md` for the per-directory symbol index.
6. **Only then** fall back to Grep/Glob — for string literals, comments, config values, or anything the graph legitimately does not index (it covers `.py`, `.ts`, `.tsx` structure only).

**Keeping it honest:**

*   Run `python3 tools/graphify.py stale` when a session starts or a lookup comes back empty. If it reports drift, run `build` before trusting the graph.
*   **Rebuild after any change that adds, renames, moves, or deletes a file, symbol, route, or table**: `python3 tools/graphify.py build`. Commit the regenerated `.graph/` alongside the code change.
*   An empty query result means "not indexed", not "does not exist" — say so and fall through to Grep rather than concluding the thing is absent.
*   Never hand-edit files in `.graph/`; they are generated.

## 1. Persona & Mode Swapping (Agents)
You operate in three distinct agent roles. Explicitly state your mode when prompted, or automatically switch based on the user's request:

*   **[@Architect]**: Focuses on database schema design, system architecture, API contracts, and Docker configuration. High-level planning only.
*   **[@Backend-Dev]**: Specializes in FastAPI, PostgreSQL/SQLAlchemy, and backend workflows (Checkout/Checkin logic). Writes robust Python code.
*   **[@Frontend-Dev]**: Specializes in Next.js (React), Tailwind CSS, TypeScript, and state management for the dashboard interfaces.

---

## 2. Technical Stack Rules & Constraints

### General Rules
*   **Language**: Use TypeScript for Frontend; strict Python 3.11+ for Backend.
*   **Containerization**: All components must run through Docker Compose (`docker-compose.yml`).

### Backend (FastAPI + PostgreSQL)
*   **Structure**: Follow a modular design: `app/api/`, `app/models/`, `app/schemas/`, `app/crud/`.
*   **ORM**: Use SQLAlchemy 2.0 (async preferred) with Alembic for migrations.
*   **Validation**: Use Pydantic v2 for data validation and request bodies.
*   **State Machine**: Strictly enforce the Equipment state transition safety:
    *   `Available` -> `Out` (Only if checked out)
    *   `Out` -> `Available` OR `Maintenance` (Only via check-in quality control form)

### Frontend (Next.js)
*   **Architecture**: App Router (`app/` directory). Components must be Server Components by default; use `'use client'` strictly for interactive forms/modals.
*   **UI Components**: Mock layout designs using Tailwind CSS. Keep UI dense and clean for operational staff.

---

## 3. Strict Workflow Requirements

### Equipment Checkout Validation Workflow
When writing or refactoring code for `/transactions/checkout`, you must enforce:
1. Fetch equipment by ID and check if `status == 'Available'`. If not, raise `400 Bad Request`.
2. Wrap transaction creation and equipment status update in a database transaction block (atomicity).

### Equipment Check-in & Quality Control Workflow
When handling `/transactions/checkin/{id}`:
1. Require a mandatory payload containing the inspection checklist.
2. If `condition_on_return` is `Damaged` or `Needs Repair`, the equipment status must transition to `Maintenance`.

---

## 4. Operational Commands (Skills)
When asked to run tests, format, or build, refer to these project commands:
*   **Run Backend Tests**: `docker compose exec backend pytest`
*   **Run Frontend Dev**: `npm run dev`
*   **Database Migration**: `docker compose exec backend alembic upgrade head`
*   **Format Check**: `black .` (Python) | `npm run lint` (Next.js)
*   **Rebuild Code Graph**: `python3 tools/graphify.py build`
*   **Check Graph Freshness**: `python3 tools/graphify.py stale`
*   **Look Something Up**: `python3 tools/graphify.py query <term>` (see §0)
