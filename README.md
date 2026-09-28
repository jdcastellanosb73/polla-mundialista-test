# Polla Mundialista

World Cup prediction pool for a private group of users. Users register, predict the score of
12 seeded group-stage matches, an administrator loads the real results, and the system scores
every prediction automatically (3 points exact score, 1 point correct outcome, 0 otherwise)
and publishes a global leaderboard with per-user history.

| Layer | Technology |
|---|---|
| Backend | .NET 8 Web API, EF Core, JWT, BCrypt — Clean Architecture (4 projects) |
| Frontend | React 18 + Vite (SPA) |
| Database | PostgreSQL 16 — relational; schema in `backend/db/schema.sql` |

## Project structure

```
backend/
  PollaMundialista.Api/              Presentation: controllers, middleware, auth pipeline
  PollaMundialista.Application/      Contracts (DTOs) and application error types
  PollaMundialista.Domain/           Entities and pure business rules (scoring engine)
  PollaMundialista.Infrastructure/   Persistence (EF Core/PostgreSQL), seeding, JWT issuing
  PollaMundialista.Tests/            Unit + integration tests (46)
  PollaMundialista.sln
  Dockerfile
  db/                                schema.sql and seed.sql (relational schema, documented)
frontend/                            React SPA
docs/                                Architecture diagram and design decisions
docker-compose.yml                   Local orchestration: PostgreSQL + API
```

## Prerequisites

- Docker Desktop (recommended path), or:
- .NET 8 SDK and Node.js 18+ for running each side directly.

## Run locally

### 1. Backend and database (Docker, recommended)

```bash
docker compose up -d --build
```

This starts:
- PostgreSQL 16 on `localhost:5433` (port 5433 avoids collisions with a host-level PostgreSQL).
- The API on `http://localhost:5180` (Swagger UI at `http://localhost:5180/swagger`).

On first run the API creates the schema (equivalent to `backend/db/schema.sql`) and seeds the
12 group-stage matches plus an admin and a demo user. Seeding is idempotent.

Alternative without Docker for the API: start only the database
(`docker compose up -d db`) and run:

```bash
cd backend/PollaMundialista.Api
dotnet run
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

The app opens at `http://localhost:5173` and points to the API at `http://localhost:5180`
(override with `VITE_API_URL` in `frontend/.env.local` if needed).

### 3. Sign in

| Role | Email | Password |
|---|---|---|
| Admin | `admin@polla.dev` | `Admin123!` |
| User | `user@polla.dev` | `User123!` |

Or register a new account from the login screen (registration always creates the `User` role;
the only admin is seeded from configuration).

### 4. Tests

```bash
cd backend
dotnet test
```

46 tests: 13 unit tests on the scoring engine and 33 integration tests that boot the real
application (`WebApplicationFactory` with in-memory SQLite, which enforces the unique indexes
and constraints under test). They cover auth rules, rate limiting, account lockout, the
private-group onboarding flow (organizer-created accounts, one-time temp password, forced
first-login change), portal segregation, prediction locks, role enforcement, idempotent
scoring recompute, leaderboard ordering and history privacy.

## Configuration

All settings can be overridden with environment variables (double underscore maps to nested
configuration sections). See `.env.example` for the full list used in deployment:

| Variable | Purpose |
|---|---|
| `ConnectionStrings__Default` | PostgreSQL connection string (Npgsql format) |
| `Jwt__Key` | JWT signing key — replace the development default in any real environment |
| `Seed__AdminEmail` / `Seed__AdminPassword` | Seeded admin credentials |
| `WebOrigin` | Allowed CORS origin(s) for the frontend, comma-separated |
| `VITE_API_URL` | Frontend build-time variable pointing at the API |

## API overview

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Create account (role `User`); rate limited |
| POST | `/api/auth/login` | — | Obtain JWT; rate limited, silent lockout after repeated failures |
| GET | `/api/matches` | User | Matches with the caller's own predictions |
| PUT | `/api/matches/{id}/prediction` | User | Create/update a prediction (locked at kickoff or once a result exists) |
| POST | `/api/matches/{id}/result` | Admin | Load or correct a result; scores all predictions idempotently |
| GET | `/api/leaderboard` | User | Global ranking (points, tie-break by exact hits) |
| GET | `/api/users/{id}/predictions` | User | A user's history, finished matches only |
| GET | `/health` | — | Health check |

Errors always respond as `{ "error": { "code", "message" } }` with an appropriate HTTP status
(`VALIDATION_ERROR`, `EMAIL_TAKEN`, `INVALID_CREDENTIALS`, `RATE_LIMITED`, `MATCH_NOT_FOUND`,
`MATCH_ALREADY_STARTED`, `RESULT_ALREADY_LOADED`, `USER_NOT_FOUND`).

## Troubleshooting

- **Port 5432 in use**: the compose database maps to host port 5433 on purpose; the API's
  default connection string already points there.
- **API starts but requests hang locally**: some antivirus web shields intercept HTTP to
  locally-run .NET processes. Use the Docker path (`docker compose up -d --build`) or add an
  antivirus exclusion for the project directory.
- **CORS errors in the browser**: make sure `WebOrigin` on the API matches the frontend origin.

## Documentation

- `docs/architecture.md` — architecture diagram and technology rationale.
- `docs/DECISIONS.md` — design decisions, alternatives considered and trade-offs.
- `AI_LOG.md` — how AI was used during development (assessment deliverable).
