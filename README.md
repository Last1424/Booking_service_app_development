# Court Booking System

A full-stack court booking prototype for **Tennis · Badminton · Pickleball**.

- **Backend:** Python Flask + SQLAlchemy + JWT, MySQL 8
- **Frontend:** React 18 (built with Vite), plain CSS, hash-based routing (no React Router)
- **Architecture:** REST API (Flask) + React SPA, talks via `fetch`
- A vanilla HTML/JS version is preserved in `frontend-vanilla/` for reference.

## Features

**User**
- Sign up / log in (JWT auth)
- Pick sport → court → date → 1-hour slot
- Optional equipment add-ons (stock-aware, sport-matched)
- Live total price calculation
- View booking history & cancel upcoming bookings

**Admin**
- Dashboard stats (users, courts, bookings)
- View / cancel any booking
- View all users
- Add / edit / toggle courts (open ↔ closed for maintenance) & pricing
- Add / edit / delete equipment, manage stock & pricing
- View mock email/SMS notification log

## Prerequisites

- **Python 3.10+** — for the Flask backend
- **Node.js 18+ and npm** — for the React frontend
- **MySQL Server 8** — running locally (default port 3306)

## Setup

### 1. Database (MySQL)

```sql
-- In MySQL Workbench (or `mysql -u root -p`):
CREATE DATABASE IF NOT EXISTS court_booking
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Backend

```bash
cd backend
copy .env.example .env       # Windows  (or `cp` on macOS/Linux)
# Edit .env and set DB_PASSWORD to your MySQL root password

python -m pip install -r requirements.txt
python seed.py               # creates tables + seeds admin, courts, equipment
python run.py                # starts http://localhost:5000
```

Smoke test: open `http://localhost:5000/api/health` — should return `{"status":"ok"}`.

### 3. Frontend (React + Vite)

```bash
cd frontend
npm install                  # one-time, installs react + vite
npm run dev                  # starts http://localhost:5173
```

Vite will open the browser automatically. If not, visit `http://localhost:5173` manually.

**You need TWO terminals running:** one for Flask (backend, port 5000) and one for Vite (frontend, port 5173).

To build a production bundle: `npm run build` (outputs to `frontend/dist/`).

## Demo accounts (from `seed.py`)

| Role  | Email                  | Password   |
|-------|------------------------|------------|
| Admin | admin@court.local      | admin123   |
| User  | player@court.local     | player123  |

## Project structure

```
backend/
├── app/
│   ├── __init__.py          Flask factory + blueprint registration
│   ├── models.py            SQLAlchemy models
│   ├── auth.py              /api/auth (signup, login, /me)
│   ├── routes_courts.py     /api/courts (list, availability)
│   ├── routes_bookings.py   /api/bookings (create, mine, cancel)
│   ├── routes_equipment.py  /api/equipment
│   ├── routes_admin.py      /api/admin/*
│   ├── notifications.py     mock email/SMS
│   └── utils.py             JWT helpers
├── config.py                env-driven config
├── seed.py                  initial data
├── schema.sql               DB creation script
├── requirements.txt
├── .env.example
└── run.py                   entrypoint
frontend/                    React 18 + Vite
├── index.html               Vite entry (loads /src/main.jsx)
├── package.json             react, react-dom, vite
├── vite.config.js
└── src/
    ├── main.jsx             renders <App />
    ├── App.jsx              hash-route switcher + auth guards
    ├── pages/
    │   ├── Login.jsx
    │   ├── Signup.jsx
    │   ├── Booking.jsx      sport/court/date picker + slot grid + booking modal
    │   ├── Dashboard.jsx    "my bookings" + cancel
    │   └── Admin.jsx        tabs: bookings, users, courts, equipment, notifications
    ├── components/
    │   ├── Navbar.jsx
    │   └── Alert.jsx
    ├── lib/
    │   ├── api.js           fetch wrapper
    │   ├── AuthContext.jsx  useAuth() hook (token + user in localStorage)
    │   ├── router.js        useHashRoute() + navigate()  (tiny custom router, no react-router)
    │   └── helpers.js       date/time formatters
    └── styles/styles.css

frontend-vanilla/            Original plain HTML/CSS/JS version (kept as backup)
```

## API surface

| Method | Path | Auth |
|---|---|---|
| POST | /api/auth/signup | — |
| POST | /api/auth/login | — |
| GET  | /api/auth/me | user |
| GET  | /api/courts?sport=… | — |
| GET  | /api/courts/sports | — |
| GET  | /api/courts/{id}/availability?date=YYYY-MM-DD | — |
| GET  | /api/equipment?sport=… | — |
| POST | /api/bookings | user |
| GET  | /api/bookings/mine | user |
| POST | /api/bookings/{id}/cancel | user/admin |
| GET  | /api/admin/stats | admin |
| GET  | /api/admin/bookings?scope=all\|upcoming\|active | admin |
| GET  | /api/admin/users | admin |
| POST | /api/admin/courts | admin |
| PATCH| /api/admin/courts/{id} | admin |
| POST | /api/admin/equipment | admin |
| PATCH| /api/admin/equipment/{id} | admin |
| DELETE| /api/admin/equipment/{id} | admin |
| GET  | /api/admin/notifications | admin |

## Operating hours

Courts run **08:00 – 22:00** (14 one-hour slots per day). Adjust in
`backend/app/routes_courts.py` if needed.

## Constraints (per spec)

- Single-session prototype scope (no multi-tenant, no payments)
- Static pricing (per-court hourly rate, per-equipment hourly rate)
- Mock notifications: logged to console + DB only, no real email/SMS
- "Book" button writes directly to MySQL — no payment gateway
