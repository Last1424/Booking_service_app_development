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

### 3. Frontend

Open `frontend/index.html` in your browser. (Any static file server also works:
`cd frontend && python -m http.server 5500` then visit `http://localhost:5500`.)

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
frontend/
├── index.html               login
├── signup.html
├── booking.html             calendar + slot picker
├── dashboard.html           my bookings
├── admin.html               admin (tabs)
├── css/styles.css
└── js/
    ├── api.js               fetch wrapper, auth, navbar, helpers
    ├── booking.js
    ├── dashboard.js
    └── admin.js
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
