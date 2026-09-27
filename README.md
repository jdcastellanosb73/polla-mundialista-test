# ⚽ Polla Mundialista — AI-First Fullstack Assessment

World Cup prediction pool for a private group of users: predict scores, an admin loads the
real results, points are awarded automatically and a global leaderboard ranks everyone.

| Layer | Technology |
|---|---|
| Backend | .NET 8 Web API · EF Core · JWT · BCrypt |
| Frontend | React 18 + Vite |
| Database | PostgreSQL 16 (relational, schema in [`db/schema.sql`](db/schema.sql)) |

## Structure

```
api/    Backend — .NET 8 Web API
web/    Frontend — React (Vite)
db/     Relational schema (schema.sql) + seed data (seed.sql)
docs/   Architecture and design decisions
```

## Modules (build plan)

1. **Auth & Users** — register/login with JWT, roles `User` / `Admin`
2. **Predictions** — 12 seeded group-stage matches, score predictions, 3/1/0 scoring
3. **Admin panel** — protected result loading
4. **Leaderboard** — global ranking + per-user prediction history

## Run locally

_(completed as modules land — final instructions at the end of the build)_

```bash
# Database
docker compose up -d db
```
