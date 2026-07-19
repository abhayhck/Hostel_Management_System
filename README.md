# Hostel Management System

A full-stack hostel management web application built with **FastAPI** (backend) and plain **HTML / CSS / JavaScript** (frontend). It helps hostel admins manage students, rooms, allocations, fees, complaints, and documents, while students can log in to view their own profile, room assignment, fee status, and submit complaints.

---

## Features

### Authentication
- Login with mobile number (username) and password
- JWT Bearer tokens stored in the browser (`localStorage`)
- Role-based portals: **admin** and **student**
- Automatic redirect after login based on role

### Admin Portal (`/admin`)
- **Students** — create, view, update, and delete student records (phone becomes the login username)
- **Rooms** — manage room number, type, capacity, and occupancy
- **Allocations** — assign students to rooms and release allocations
- **Complaints** — view and update complaint status
- **Fees** — create and update fee records (amount, due date, paid/pending)

### Student Portal (`/student`)
- View personal profile and room allocation history
- View uploaded documents
- Submit complaints and track their status
- View fee details and payment status (**read-only** — only admins can update fees)

### Shared
- Interactive API docs at `/docs` (Swagger UI) and `/redoc`
- Static frontend served by the same FastAPI app

---

## Tech Stack

| Layer | Technology |
|--------|------------|
| Backend | Python, FastAPI, SQLAlchemy |
| Auth | JWT (`python-jose`), password hashing (`passlib` + bcrypt) |
| Database | PostgreSQL (via `psycopg2`) |
| Frontend | HTML, CSS, vanilla JavaScript |
| Server | Uvicorn |
| Config | `.env` + `python-dotenv` |

---

## Project Structure

```
HostelManagment/
├── main.py                 # FastAPI app entry, routers, static pages
├── auth.py                 # Login, JWT, current user helpers
├── config.py               # Loads db_url, secret_key from .env
├── database.py             # SQLAlchemy engine & session
├── database_models.py      # ORM table definitions
├── models.py               # Pydantic request/response schemas
├── requirements.txt
├── README.md
├── .env                    # Secrets (not committed)
├── .gitignore
├── routers/
│   ├── students.py
│   ├── admins.py
│   ├── rooms.py
│   ├── room_allocations.py
│   ├── complaints.py
│   ├── fees.py
│   └── document.py
└── static/
    ├── index.html          # Login page
    ├── admin.html          # Admin dashboard
    ├── student.html        # Student portal
    ├── styles.css
    ├── api.js              # Shared fetch / token helpers
    ├── login.js
    ├── admin.js
    └── student.js
```

---

## Database Schema (Overview)

| Table | Purpose |
|--------|---------|
| `users` | Login accounts (`username`, `password_hash`, `role`) |
| `students` | Student profile linked to `users.user_id` |
| `admins` | Admin profile linked to `users.user_id` |
| `rooms` | Room inventory (number, type, capacity, occupied) |
| `room_allocation` | Student ↔ room assignments |
| `complaints` | Student complaints and status |
| `fees` | Fee amount, due date, and status per student |
| `documents` | Document metadata for students |
| `notices` | Notices model exists (API/UI not wired yet) |

When a student or admin is created, the app first inserts a row into `users`, then creates the matching profile using that `user_id` as the foreign key / primary key.

---

## Setup

### 1. Prerequisites
- Python 3.10+ recommended
- A running **PostgreSQL** database

### 2. Clone and create a virtual environment

```bash
cd HostelManagment
python3 -m venv myvenv
source myvenv/bin/activate   # Windows: myvenv\Scripts\activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure environment

Create a `.env` file in the project root (see `.gitignore` — this file must not be committed):

```env
db_url=postgresql://USERNAME:PASSWORD@HOST:5432/DATABASE_NAME
secret_key=your-long-random-secret-key
```

- `db_url` — SQLAlchemy connection string for PostgreSQL  
- `secret_key` — used to sign JWT access tokens  

### 5. Run the server

```bash
uvicorn main:app --reload --port 8001
```

Then open:
- App login: [http://127.0.0.1:8001/](http://127.0.0.1:8001/)
- API docs: [http://127.0.0.1:8001/docs](http://127.0.0.1:8001/docs)

Tables are created automatically on startup via SQLAlchemy `create_all`.

---

## How Authentication Works

1. User submits mobile number + password on `/`.
2. Backend verifies credentials (`POST /token`) and returns a JWT access token (default expiry: **30 minutes**).
3. Frontend stores the token and sends it as `Authorization: Bearer <token>` on API calls.
4. After login, `/users/me` is used to read the role:
   - `admin` → redirect to `/admin`
   - `student` → redirect to `/student`
5. Protected pages also call `requireRole(...)` so the wrong role is sent back to login.

**Note:** A student’s login username is their **phone number**, set when the admin creates the student.

---

## Main Pages

| URL | Description |
|-----|-------------|
| `/` | Login only |
| `/admin` | Admin dashboard (CRUD for hostel data) |
| `/student` | Student self-service portal |
| `/static/...` | CSS and JavaScript assets |
| `/docs` | Interactive Swagger API documentation |

---

## API Overview

All business endpoints expect a valid JWT unless noted otherwise.

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/token` | Login (form: `username`, `password`) |
| GET | `/users/me` | Current authenticated user |
| POST | `/logout` | Client-side logout hint |

### Students
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/students/me` | Logged-in student’s profile |
| GET | `/students` | List all students |
| POST | `/students` | Create student + user account |
| PUT | `/students/{id}` | Update student |
| DELETE | `/students/{id}` | Delete student |

### Rooms & allocations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/rooms` | List / create rooms |
| PUT/DELETE | `/rooms/{id}` | Update / delete room |
| GET/POST | `/room_allocations` | List / allocate |
| PUT | `/room_allocations/{id}/release` | Release a room |

### Complaints, fees, documents
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/complaints` | List / create (students see only their own) |
| PUT/DELETE | `/complaints/{id}` | Update / delete |
| GET/POST | `/fees` | List / create (students see only their own) |
| PUT/DELETE | `/fees/{id}` | Update / delete fee |
| GET/POST | `/documents` | List / create (students see only their own) |
| PUT/DELETE | `/documents/{id}` | Update / delete |

### Admins
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admins` | List admins |
| GET | `/admins/{id}` | Get one admin |
| POST | `/admins` | Create admin + user account |
| PUT | `/admins` | Update admin |
| DELETE | `/admins/{id}` | Delete admin |

---

## Frontend Behavior (Summary)

- **`static/api.js`** — shared helpers: token storage, `apiRequest`, login, role guard, date/status formatting.
- **`static/login.js`** — login form + redirect by role.
- **`static/admin.js`** — tabbed dashboard; click a table row to load it into the form for update/delete.
- **`static/student.js`** — loads profile, allocations, documents, complaints, and fees; allows submitting complaints only.

---

## Typical Workflows

1. **Onboard a student (admin)**  
   Create student → user account is created with phone as username → assign a room → optionally add fee records.

2. **Student daily use**  
   Login → check profile and room → view fee status → submit a complaint if needed.

3. **Admin operations**  
   Update complaint status, mark fees paid, release rooms when students leave.

---

## Configuration Reference

| Variable / setting | Source | Purpose |
|--------------------|--------|---------|
| `db_url` | `.env` | PostgreSQL connection URL |
| `secret_key` | `.env` | JWT signing secret |
| `algorithm` | `config.py` | `HS256` |
| `access_token_expire_minutes` | `config.py` | Token lifetime (30) |

---

## Development Notes

- Keep `.env` and `myvenv/` out of version control (already listed in `.gitignore`).
- Prefer using Swagger at `/docs` while exploring or testing endpoints.
- Restart Uvicorn (or use `--reload`) after backend changes.
- After frontend JS/CSS edits, hard-refresh the browser if you see stale behavior.

---


