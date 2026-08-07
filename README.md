# Event Equipment Tracking System

A comprehensive equipment management and tracking system designed for event operations. Track equipment checkout/checkin, monitor equipment status, manage clients, and maintain detailed audit logs.

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Key Features](#key-features)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Contributing Guidelines](#contributing-guidelines)

## 🎯 Overview

This system provides a centralized platform for managing event equipment throughout its lifecycle:
- **Equipment Catalog**: Maintain an organized inventory of equipment by category
- **Client Management**: Track clients and their rental history
- **Checkout/Checkin Workflows**: Streamlined processes with quality control checks
- **Activity Logging**: Complete audit trail of all system actions
- **User Management**: Role-based access control for operational staff

## 🛠 Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **ORM**: SQLAlchemy 2.0 (async)
- **Database**: PostgreSQL
- **Migrations**: Alembic
- **Validation**: Pydantic v2

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Package Manager**: npm

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Web Server**: Nginx

## 📁 Project Structure

```
event-equipment-tracking/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── routes/           # API endpoints
│   │   │   └── deps.py           # Dependencies & middleware
│   │   ├── crud/                 # Database operations
│   │   ├── models/               # SQLAlchemy models
│   │   ├── schemas/              # Pydantic schemas
│   │   ├── main.py               # FastAPI app initialization
│   │   ├── config.py             # Configuration
│   │   └── database.py           # Database setup
│   ├── alembic/                  # Database migrations
│   ├── requirements.txt
│   ├── Dockerfile
│   └── entrypoint.sh
├── frontend/
│   ├── app/
│   │   ├── components/           # Reusable React components
│   │   ├── equipment/            # Equipment management pages
│   │   ├── transactions/         # Checkout/Checkin pages
│   │   ├── clients/              # Client management pages
│   │   ├── categories/           # Category management pages
│   │   ├── users/                # User management pages
│   │   ├── audit/                # Activity log pages
│   │   ├── layout.tsx
│   │   └── page.tsx              # Home page
│   ├── types/                    # TypeScript types
│   ├── package.json
│   ├── Dockerfile
│   └── next.config.mjs
├── nginx/
│   └── default.conf.template     # envsubst'd at container start (GATEWAY_SECRET)
├── tools/
│   └── graphify.py               # code-graph builder + query CLI
├── .graph/                       # generated code graph (GRAPH.md, MODULES.md, graph.json)
├── docker-compose.yml
├── .env.example                  # copy to .env and fill in
├── CLAUDE.md                     # Project rules & guidelines
└── README.md                     # This file
```

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose installed
- Git
- Node.js 18+ (for local frontend development)
- Python 3.11+ (for local backend development)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Event_management_system
   ```

2. **Start the application**

   **Production mode (default — fast, mirrors deployment):**
   ```bash
   docker compose up --build -d
   ```
   The frontend is built and served with `next start` (standalone output); the
   backend runs uvicorn with 2 workers. Pages serve in ~150–250 ms.

   **Development mode (hot-reload while coding):**
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml up
   ```
   This swaps in `next dev` + uvicorn `--reload` with source bind-mounts so code
   changes appear live. It is noticeably slower per page (~1.5 s) — that's the dev
   compiler, not the app, and does not reflect production performance.

3. **Access the application**
   - App (everything via nginx): `http://localhost`
   - Storefront: `http://localhost/store`
   - Admin: `http://localhost/` (login `admin@fabent.com` / `Admin2024`)
   - In **dev mode only**, the backend is also exposed directly at
     `http://localhost:8002/docs` (Swagger UI).

### Database migrations

Migrations run automatically on backend startup (via `entrypoint.sh`). To run them
manually:

```bash
docker compose exec backend alembic upgrade head
```

## 💻 Development Workflow

### Backend Development

1. **Install dependencies** (for local development)
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Run tests**
   ```bash
   docker compose exec backend pytest
   ```

3. **Format code**
   ```bash
   docker compose exec backend black .
   ```

4. **Create database migration**
   ```bash
   docker compose exec backend alembic revision --autogenerate -m "Description"
   docker compose exec backend alembic upgrade head
   ```

### Frontend Development

1. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Start development server**
   ```bash
   npm run dev
   ```
   Access at `http://localhost:3000`

3. **Run linting**
   ```bash
   npm run lint
   ```

4. **Build for production**
   ```bash
   npm run build
   npm start
   ```

## ✨ Key Features

### 1. Equipment Management
- Add, edit, and delete equipment
- Organize by categories
- Track equipment status (`Available`, `Out`, `Maintenance`)
- View equipment details and history

### 2. Checkout Workflow
- Select equipment and client
- Validate equipment availability (must be `Available`)
- Create transaction record
- Atomically update equipment status to `Out`

### 3. Checkin & Quality Control
- Mandatory inspection checklist on return
- Assess equipment condition (`Good`, `Damaged`, `Needs Repair`)
- Automatic status transition:
  - `Good` → `Available`
  - `Damaged`/`Needs Repair` → `Maintenance`
- Record damage notes

### 4. Audit Trail
- Complete activity logs of all operations
- Track user actions and timestamps
- Review transaction history by client or equipment

### 5. User & Client Management
- Manage operational staff with roles
- Track client information and contact details
- View client rental history

## 📡 API Documentation

The backend API is fully documented with interactive Swagger UI available at:
```
http://localhost:8000/docs
```

### Key Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/equipment/` | List all equipment |
| `POST` | `/equipment/` | Create new equipment |
| `GET` | `/transactions/` | List all transactions |
| `POST` | `/transactions/checkout` | Checkout equipment |
| `POST` | `/transactions/checkin/{id}` | Checkin equipment with inspection |
| `GET` | `/clients/` | List all clients |
| `POST` | `/clients/` | Create new client |
| `GET` | `/activity-logs/` | View activity audit trail |

## 🗄 Database Schema

### Core Tables
- **equipment**: Equipment catalog with status and category
- **clients**: Client information
- **transactions**: Checkout/checkin records
- **users**: Operational staff accounts
- **categories**: Equipment categories
- **activity_logs**: Complete audit trail
- **audit_logs**: System-level audit events

### Equipment State Machine
```
Available ──checkout──> Out
    ↑                    │
    │      ┌─────────────┤
    │      │              │
    └─ checkin (Good)    checkin (Damaged/Repair)
             │              │
             └──────────> Maintenance
```

## 🤝 Contributing Guidelines

### Code Style
- **Python**: Follow PEP 8, use `black` for formatting
- **TypeScript/React**: Use `prettier` and `eslint` rules
- **Naming**: Clear, descriptive names for variables and functions

### Commit Messages
- Use descriptive, actionable messages
- Reference issues when applicable
- Format: `[type] brief description`
  - Example: `[feat] Add equipment damage assessment form`

### Pull Request Process
1. Create a feature branch: `git checkout -b feature/description`
2. Make your changes with clear commits
3. Ensure tests pass: `docker compose exec backend pytest`
4. Format code: `black .` (backend) and `npm run lint` (frontend)
5. Submit PR with description of changes

### Important Rules (from CLAUDE.md)

#### Equipment Checkout Validation
- Equipment must be in `Available` status
- Validate before creating transaction
- Use database transactions for atomicity

#### Equipment Checkin Workflow
- Mandatory inspection checklist required
- Quality control assessment determines final status
- Automatic transition to `Maintenance` if damaged

## 📝 Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql+asyncpg://user:password@db:5432/equipment_db
SECRET_KEY=your-secret-key
DEBUG=False
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 🐛 Troubleshooting

### Containers won't start
```bash
docker compose down -v  # Remove volumes
docker compose up --build
```

### Database migration issues
```bash
docker compose exec backend alembic upgrade head
```

### Frontend won't connect to backend
Check `NEXT_PUBLIC_API_URL` in frontend `.env.local` matches your backend URL

## 📄 License

[Add your license here]

## 👥 Team

[Add team information here]

---

For detailed project rules and development guidelines, see [CLAUDE.md](./CLAUDE.md)
