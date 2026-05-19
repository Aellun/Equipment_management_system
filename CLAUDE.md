# Claude Project Rules: Event Equipment Tracking System

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
