-- =============================================================
-- Polla Mundialista — Relational schema (PostgreSQL 16)
-- Source of truth for the data model. The API (EF Core) maps to
-- exactly these tables/columns and can also create them itself
-- on first run (EnsureCreated) for local development.
-- =============================================================

CREATE TABLE users (
    id             uuid         PRIMARY KEY,
    email          varchar(320) NOT NULL,
    display_name   varchar(60)  NOT NULL,
    password_hash  varchar(100) NOT NULL,          -- BCrypt
    role           varchar(10)  NOT NULL DEFAULT 'User',  -- 'User' | 'Admin'
    created_at     timestamptz  NOT NULL DEFAULT now(),
    -- brute-force protection: silent temporary lockout after repeated failures
    failed_login_count int      NOT NULL DEFAULT 0,
    lockout_until  timestamptz  NULL,
    CONSTRAINT uq_users_email UNIQUE (email)       -- emails stored normalized (trim+lower)
);

CREATE TABLE matches (
    id                int          PRIMARY KEY,    -- seeded 1..12, not auto-generated
    group_code        varchar(1)   NOT NULL,       -- 'A' | 'B'
    home_team         varchar(40)  NOT NULL,
    away_team         varchar(40)  NOT NULL,
    kickoff_at        timestamptz  NOT NULL,       -- UTC; server time rules the lock
    home_goals        int          NULL,           -- real result (NULL until loaded)
    away_goals        int          NULL,
    result_loaded_at  timestamptz  NULL            -- doubles as "result exists" flag + audit
);

CREATE TABLE predictions (
    id           uuid        PRIMARY KEY,
    user_id      uuid        NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
    match_id     int         NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    home_goals   int         NOT NULL,
    away_goals   int         NOT NULL,
    points       int         NULL,                 -- materialized when result is loaded (3/1/0)
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),

    -- INVARIANT 1: one prediction per user per match, enforced by the DB (checks race; code doesn't)
    CONSTRAINT uq_prediction_user_match UNIQUE (user_id, match_id),
    CONSTRAINT ck_predictions_home_goals CHECK (home_goals BETWEEN 0 AND 99),
    CONSTRAINT ck_predictions_away_goals CHECK (away_goals BETWEEN 0 AND 99)
);

CREATE INDEX ix_predictions_match_id ON predictions (match_id);  -- scoring recompute per match
CREATE INDEX ix_predictions_user_id  ON predictions (user_id);   -- user history / leaderboard
