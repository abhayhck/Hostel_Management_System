# Hostel Management System

A FastAPI, SQLAlchemy, and PostgreSQL application for hostel administrators and students, with a vanilla JavaScript frontend. Admins manage hostel records; students view their own profile, allocations, fees, and complaints. An **admin-only natural-language “ask your database” assistant** generates SQL with Gemini and displays results alongside expandable SQL and original-response panels.

## Screenshots

| Login | Admin dashboard |
|---|---|
| ![Login](docs/screenshots/login.png) | ![Admin dashboard](docs/screenshots/admin-dashboard.png) |
| AI assistant answering a question | Student portal |
| ![AI assistant answering a question](docs/screenshots/ai-assistant.png) | ![Student portal](docs/screenshots/student-portal.png) |

## Features

- **Admin portal:** student and room CRUD, room allocation/release, complaint updates, fee records, and an Ask AI tab.
- **Student portal:** own profile, allocation history, document metadata, complaints, and fees; submit complaints with server-enforced ownership and `pending` status.
- **AI assistant:** independent questions, session UI history, scalar/detail/table answers, loading/error states, and collapsed SQL/raw JSON disclosures. Answers are formatted locally, not written as prose by the LLM.
- **Shared:** phone-based login, role-directed navigation, and Swagger/ReDoc API documentation.

## Architecture

```mermaid
flowchart LR
    Browser[Browser: HTML / CSS / JavaScript] -->|Bearer JWT + JSON| API[FastAPI routers]
    API --> ORM[SQLAlchemy sessions]
    ORM --> DB[(PostgreSQL)]
    API -->|Static files| Browser
```

```mermaid
flowchart TD
    A[POST /ask: JWT + require_admin] --> B[Per-admin rate limit + question validation]
    B --> C[llm_schema.py: allowed tables, blocked columns, samples, notes]
    C --> D[llm_client.py: question + schema to Gemini]
    D --> E[sql_guard.validate_sql]
    E --> F[get_readonly_db: execute generated SQL]
    F --> G[Cap result at 200 rows + truncation flag]
    G --> H[ask_log entry via separate normal session]
    H --> I[Browser: readable result + expandable SQL / JSON]
```

The success path is shown. Model errors, unsupported questions, rejected SQL, and execution failures also attempt audit logging. Invalid questions/rate-limit rejections are not logged; logging failures are caught and do not fail the answer.

## Ask your database

The assistant lets an admin ask operational questions without manually writing joins and aggregates. The implementation is in [routers/ask.py](routers/ask.py).

1. Authenticate with `require_admin`; allow 10 questions per 60 seconds per admin, per process. Trim and validate questions to 1–500 characters.
2. Build schema text from SQLAlchemy metadata. Include six allowed tables, omit `emergency_contact`, and sample up to ten distinct values for each configured status/type/course/gender column. Cache the schema for ten minutes.
3. Send the question and schema/notes to Gemini through `llm_client.generate_sql`, requesting raw SQL or `CANNOT_ANSWER`.
4. Parse generated SQL with `sql_guard.validate_sql`: one SELECT/UNION statement, no listed write/DDL nodes or SELECT INTO, checked table names, and no schema-qualified table references.
5. Execute using `get_readonly_db`, fetch 201 rows to detect truncation, and return at most 200 with column names, SQL, and row count.
6. Record the question, generated SQL, outcome, and returned row count in `ask_log` using a separate write session.

Query-result rows are **not sent back to Gemini**. The model does receive the question and schema sample values, which are database-derived data. Each question is independent; the backend receives no chat history.

### Example questions and SQL

<details>
<summary>Give me the list of resolved complaints</summary>

```sql
SELECT c.complaint_id, s.name, c.complaint_desc, c.created_at
FROM complaints c
JOIN students s ON c.student_id = s.student_id
WHERE c.status ILIKE 'resolved'
```

</details>

<details>
<summary>list room numbers and name of students staying in them</summary>

```sql
SELECT r.room_no, s.name FROM rooms r JOIN room_allocation ra ON r.room_id = ra.room_id JOIN students s ON ra.student_id = s.student_id WHERE ra.release_date IS NULL
```

</details>

<details>
<summary>list number of female students with no room allocated</summary>

```sql
SELECT COUNT(s.student_id) FROM students s LEFT JOIN room_allocation ra ON s.student_id = ra.student_id AND ra.release_date IS NULL WHERE LOWER(s.gender) = 'female' AND ra.allocation_id IS NULL
```

</details>

<details>
<summary>List pending complaints with student names.</summary>

```sql
SELECT c.complaint_id, c.complaint_desc, s.name FROM complaints c JOIN students s ON c.student_id = s.student_id WHERE LOWER(c.status) != 'resolved'
```

</details>

<details>
<summary>Which rooms have vacancies?</summary>

```sql
SELECT r.room_no, r.room_type, r.capacity - COUNT(ra.allocation_id) AS vacancy FROM rooms r LEFT JOIN room_allocation ra ON r.room_id = ra.room_id AND ra.release_date IS NULL GROUP BY r.room_id, r.room_no, r.room_type, r.capacity HAVING r.capacity - COUNT(ra.allocation_id) > 0
```

</details>

### Safety layers and their limits

| Layer | What it does | Where |
|---|---|---|
| Admin-only access | Checks current database role, not just token claims | `auth.require_admin`, `routers/ask.py` |
| Prompt schema restrictions | Allows students, rooms, room_allocation, complaints, fees, notices; hides emergency_contact | `llm_schema.py` |
| SQL parsing | Checks a single SELECT/UNION, forbidden nodes, table names, qualified tables | `sql_guard.validate_sql` |
| Separate DB role | Setup below grants SELECT only on the six allowed tables, with restricted student columns | `database.get_readonly_db`; manual PostgreSQL setup |
| Role defaults | Setup below enables default read-only transactions and a five-second statement timeout | Manual `ALTER ROLE`; not set by Python |
| Response row cap | Returns at most 200 rows; does not bound total query work or bytes | `routers/ask.py: MAX_ROWS` |
| Rate limit | 10 questions per 60 seconds per admin; memory-local, no locking | `check_rate_limit` |
| Audit trail | Stores question, SQL, outcome, count, timestamp; best-effort writes | `log_ask`, `database_models.ask_log` |
| No result-to-model round trip | Results go directly to the browser; samples still go to Gemini | `llm_client.generate_sql`, `ask_database` |

The guard does not enforce blocked columns or forbid functions/locking, and its global CTE-name handling has scope gaps. Database privileges are configured separately in PostgreSQL.

## Tech stack

| Area | Implementation |
|---|---|
| Backend | Python, FastAPI, Pydantic, Uvicorn |
| Persistence | SQLAlchemy, PostgreSQL, psycopg2 drivers |
| Authentication | python-jose JWT; Passlib + bcrypt |
| AI / SQL parsing | google-genai (Gemini); sqlglot |
| Frontend / configuration | HTML, CSS, vanilla JavaScript; python-dotenv |

Dependencies are pinned in [requirements.txt](requirements.txt), including `google-genai` and `sqlglot`. Both `psycopg2` and `psycopg2-binary` are currently listed.

## Project structure

```text
HostelManagment/
├── main.py                  # App, routers, static files, create_all
├── auth.py                  # JWT, bcrypt, require_admin
├── config.py / database.py  # Environment settings, two engines/sessions
├── database_models.py       # 10 ORM tables, including ask_log
├── models.py                # Pydantic schemas
├── llm_client.py             # Gemini SQL generation
├── llm_schema.py             # Schema text, samples, domain notes
├── sql_guard.py              # SQL AST checks
├── test_schema.py            # Print-based guard smoke checks
├── requirements.txt
├── README.md / INTERVIEW_NOTES.md
├── .gitignore
├── .env                     # Local secrets; ignored
├── routers/
│   ├── students.py / admins.py / rooms.py
│   ├── room_allocations.py / complaints.py / fees.py
│   └── document.py / ask.py
└── static/
    ├── index.html / admin.html / student.html
    ├── api.js / login.js / admin.js / student.js
    └── styles.css
```

## Setup

Prerequisites: Python 3.10+.

```bash
cd HostelManagment
python3 -m venv myvenv
source myvenv/bin/activate  # Windows: myvenv\Scripts\activate
pip install -r requirements.txt
python -c 'import secrets; print(secrets.token_hex(32))'
```

Put the generated signing secret and your local credentials in an ignored `.env`. URL-encode special characters in URL passwords. Every credential below is a placeholder:

```dotenv
db_url=postgresql://APP_USER:APP_PASSWORD@HOST:5432/HOSTEL_DB
readonly_db_url=postgresql://hostel_readonly:READONLY_PASSWORD@HOST:5432/HOSTEL_DB
secret_key=REPLACE_WITH_GENERATED_RANDOM_SECRET
GEMINI_API_KEY=REPLACE_WITH_GEMINI_API_KEY
GEMINI_MODEL=gemini-3.1-flash-lite
```

`GEMINI_MODEL` has the shown fallback in `llm_client.py`; choose a model available to your account. Both database URLs are required to construct the engines. Keep `.env` and `myvenv/` out of Git.

### First admin and table creation

There is **no registration, seed command, or automatic default admin**. `POST /admins` requires an existing admin. Bootstrap once with a trusted local SQLAlchemy session, mirroring `routers/admins.py:add_admin`. Replace the profile placeholders; the password is prompted, not embedded. This documentation snippet creates tables and an account when **you run it**:

```bash
python - <<'PY'
from getpass import getpass
from auth import get_password_hash
from database import engine, sessionlocal
from database_models import Base, users, admins

Base.metadata.create_all(bind=engine)
phone = "FIRST_ADMIN_PHONE"
password = getpass("First admin password: ")
if not password:
    raise SystemExit("Password must not be empty")
with sessionlocal.begin() as db:
    if db.query(users).filter(users.username == phone).first():
        raise SystemExit("Username already exists")
    user = users(username=phone, password_hash=get_password_hash(password), role="admin")
    db.add(user)
    db.flush()
    db.add(admins(admin_id=user.user_id, name="FIRST_ADMIN_NAME",
                  email="FIRST_ADMIN_EMAIL", phone=phone, designation="Administrator"))
print("First admin created")
PY
```

`main.py` also calls `create_all` at import/startup; it creates missing tables, not migrations for changed existing tables.

### Read-only AI database role

After tables exist, connect with `psql` as a database administrator to `HOSTEL_DB`. Replace `HOSTEL_DB` and `READONLY_PASSWORD`. Run:

```sql
CREATE ROLE hostel_readonly LOGIN PASSWORD 'READONLY_PASSWORD'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
GRANT CONNECT ON DATABASE "HOSTEL_DB" TO hostel_readonly;
GRANT USAGE ON SCHEMA public TO hostel_readonly;
GRANT SELECT ON public.rooms, public.room_allocation, public.complaints,
  public.fees, public.notices TO hostel_readonly;
GRANT SELECT (student_id, name, email, phone, course, year, gender, address)
  ON public.students TO hostel_readonly;
ALTER ROLE hostel_readonly IN DATABASE "HOSTEL_DB"
  SET default_transaction_read_only = on;
ALTER ROLE hostel_readonly IN DATABASE "HOSTEL_DB"
  SET statement_timeout = '5s';
```

No grants here cover `users`, `admins`, `documents`, `ask_log`, student `emergency_contact`, writes, or future tables. Effective access also depends on PUBLIC grants, role memberships, and callable functions; review those separately. Do not make this role an owner or grant it privileged memberships. Role defaults are additional controls, not immutable security boundaries. See PostgreSQL's [GRANT](https://www.postgresql.org/docs/current/sql-grant.html) and [ALTER ROLE](https://www.postgresql.org/docs/current/sql-alterrole.html) references.

### Run locally

```bash
uvicorn main:app --reload --port 8001
```

Open [login](http://127.0.0.1:8001/), [Swagger](http://127.0.0.1:8001/docs), or [ReDoc](http://127.0.0.1:8001/redoc). Log in using the first admin's phone/username and prompted password; create students through the admin portal. `--reload` is for development; omit it for hosting.

## Authentication and authorization

`POST /token` verifies bcrypt credentials and issues an HS256 JWT with a 30-minute expiry. `static/api.js` stores it in `localStorage` and attaches the Bearer header. `get_current_user` validates the token and reloads the account; `require_admin` checks the current database role. Portal JavaScript redirects by role; HTML pages themselves are public.

| Access | Endpoints / behavior |
|---|---|
| Admin-only dependency | Student list/mutations, all admin routes, room/allocation mutations, complaint update/delete, `/ask` |
| Admin-only inline checks | Fee create/update/delete |
| Student own data | `/students/me`; allocation, complaint, fee, document GETs filter by caller ID |
| Student complaint creation | Body student ID/status overridden with caller ID and `pending` |
| Shared room read | Authenticated users see room inventory |
| Unfinished document authorization | Metadata POST/PUT/DELETE require login but do not enforce student ownership/admin status |

## API overview

All business endpoints require JWTs; `/token` and `/logout` do not. Authorization details are above.

| Methods | Path | Purpose |
|---|---|---|
| POST | `/token`, `/logout` | Login; client-side logout hint |
| GET | `/users/me`, `/students/me` | Account; own student profile |
| GET / POST | `/students`, `/admins`, `/rooms` | List/create records |
| PUT / DELETE | `/students/{id}`, `/rooms/{id}` | Update/delete records |
| GET / DELETE | `/admins/{id}` | Read/delete admin |
| PUT | `/admins` | Update admin using body `admin_id` |
| GET / POST | `/room_allocations` | History / allocation |
| PUT | `/room_allocations/{id}/release` | End an allocation |
| GET / POST | `/complaints`, `/fees`, `/documents` | List/create; documents are metadata only |
| PUT / DELETE | `/complaints/{id}`, `/fees/{id}`, `/documents/{id}` | Update/delete |
| POST | `/ask` | `{ "question": "Which rooms have vacancies?" }` |

`/ask` returns `{question, sql, columns, rows, row_count, truncated}` on success, or `{question, sql: null, message}` for unsupported questions. No notice or audit-log API exists. `/students/{id}` GET is commented out.

## Security measures implemented

Bcrypt password hashing; explicit admin checks; own-row filtering for student reads and enforced complaint ownership; `/users/me` excludes password hashes; profile ORM responses have no password columns. `escapeHtml` in `static/api.js` escapes API-backed HTML values and JSON data attributes in both dashboards; AI answers use `textContent`. Secrets load from ignored `.env` files. AI execution uses a separate engine/session, with restricted role grants configured manually as above.

## Design decisions and trade-offs

- **Separate database role:** limits permissions independently of model instructions, but requires operator-managed grants and function review.
- **Visible SQL/raw result:** admins can inspect what ran and what came back; disclosures keep the main answer compact.
- **Schema samples:** help the model match actual course/status/type spellings, but disclose sampled values and introduce untrusted prompt content.
- **Allocation-based occupancy:** notes tell Gemini to count active allocations instead of trusting the manually editable `rooms.occupied` counter.
- **Frontend answer formatting:** avoids a second model call and sending query results to Gemini; it supports values/tables rather than generated prose.

## Known limitations and future work

- Fix document mutation ownership checks, SQL function/locking validation, scoped CTE resolution, and executable column restrictions.
- Occupancy can drift; allocation/release requests lack locking and an active-allocation uniqueness constraint. Room numbers lack DB uniqueness.
- Due dates, release notes, and statuses are text; `SCHEMA_NOTES` assumes date formatting the API does not enforce. Amounts use floats; contact-number request types can lose formatting.
- No login rate limiter. AI limiter is per-process, unsynchronized, and retains user keys. Logout does not revoke JWTs.
- `test_schema.py` has four print-based SQL-guard smoke cases, not an assertion-based automated suite. No Docker or CI configuration is present. Add auth, SQL-policy, and frontend regression tests.
- Historical commits contain JWT/database credentials; rotate them before publishing history if not already rotated.

**Not implemented yet:** document upload/download, notices API/UI, conversational backend memory, LLM prose summaries, and a first-admin CLI/seed command. Document metadata CRUD and student metadata viewing are implemented.
