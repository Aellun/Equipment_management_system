# Event Equipment Tracking System - Project Plan

## 1. Project Overview
A robust system designed to track equipment inventory, manage check-out/check-in transactions, and monitor item condition over time.

## 2. Tech Stack
* **Frontend:** Next.js (React) - For a responsive, modern UI and efficient routing.
* **Backend:** FastAPI (Python) - High-performance API for business logic and database management.
* **Database:** PostgreSQL (Relational) - Ideal for tracking many-to-many relationships between equipment, clients, and transactions.
* **Deployment:** Docker - To containerize the services for consistent environments.

---

## 3. System Architecture

### Database Schema
[Image of Entity Relationship Diagram for equipment tracking system]

1.  **Equipment Table**: `id`, `name`, `serial_number`, `category`, `status` (Available, Out, Maintenance), `last_inspected`.
2.  **Clients Table**: `id`, `name`, `email`, `phone`, `id_proof_ref`.
3.  **Transactions Table**: `id`, `equipment_id`, `client_id`, `out_timestamp`, `due_date`, `staff_out_id`.
4.  **Audit Logs Table**: `id`, `transaction_id`, `return_timestamp`, `condition_on_return` (Good, Damaged, Needs Repair), `notes`.

---

## 4. Key Workflows

### A. Equipment Check-out
* **Scan/Select**: Staff selects equipment (via search or QR scan).
* **Validation**: System checks if `status == 'Available'`.
* **Assignment**: Link equipment to a client and set a due date.
* **State Change**: Update equipment status to `Out`.

### B. Equipment Check-in & Quality Control
* **Identification**: Scan returned item to pull up the active transaction.
* **Inspection Checklist**: Mandatory form verifying physical condition, functionality, and missing parts.
* **Status Update**: 
    * If **Good**: Set status to `Available`.
    * If **Damaged**: Set status to `Maintenance` and trigger an alert/invoice for repairs.

---

## 5. Development Phases

### Phase 1: Foundation (MVP)
* Setup FastAPI environment and PostgreSQL connection.
* Create CRUD endpoints for Equipment and Clients.
* Build basic Next.js Dashboard to view inventory.

### Phase 2: Transaction Logic
* Implement `/checkout` and `/checkin` endpoints.
* Logic for status toggling and transaction history logging.
* Frontend forms for equipment assignment.

### Phase 3: Condition Monitoring & UI Polish
* Implement the "Condition Check" modal during check-in.
* Dashboard visualizations (e.g., % of gear currently out, damaged items list).
* Search and Filter functionality.

### Phase 4: Extras (Optional)
* **QR Code Generation**: Auto-generate codes for new equipment.
* **Email Notifications**: Send receipts to clients when gear is checked out/returned.

---

## 6. API Endpoint Preview (FastAPI)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/equipment` | List all inventory |
| `POST` | `/transactions/checkout` | Create a new loan record |
| `PATCH` | `/transactions/checkin/{id}` | Finalize return and log condition |
| `GET` | `/clients/{id}/history` | View a client's past rentals |

---

## 7. Success Criteria
* Elimination of manual/paper tracking.
* Real-time visibility of equipment locations.
* Accurate historical logs of equipment damage and maintenance costs.