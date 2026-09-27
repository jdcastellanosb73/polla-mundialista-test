-- =============================================================
-- Seed: 12 group-stage matches (2 groups × 4 teams, full round-robin)
-- Kickoffs are in the future so predictions are OPEN during review.
-- NOTE: users (admin + demo) are seeded by the API at startup from
-- configuration — BCrypt hashes are generated at runtime, never
-- hardcoded here.
-- =============================================================

INSERT INTO matches (id, group_code, home_team, away_team, kickoff_at) VALUES
-- Group A: México, Alemania, Escocia, Uruguay
( 1, 'A', 'México',    'Alemania',  '2026-11-10 18:00:00+00'),
( 2, 'A', 'Escocia',   'Uruguay',   '2026-11-10 21:00:00+00'),
( 3, 'A', 'México',    'Escocia',   '2026-11-13 18:00:00+00'),
( 4, 'A', 'Alemania',  'Uruguay',   '2026-11-13 21:00:00+00'),
( 5, 'A', 'México',    'Uruguay',   '2026-11-16 18:00:00+00'),
( 6, 'A', 'Alemania',  'Escocia',   '2026-11-16 21:00:00+00'),
-- Group B: Argentina, Francia, Japón, Marruecos
( 7, 'B', 'Argentina', 'Francia',   '2026-11-11 18:00:00+00'),
( 8, 'B', 'Japón',     'Marruecos', '2026-11-11 21:00:00+00'),
( 9, 'B', 'Argentina', 'Japón',     '2026-11-14 18:00:00+00'),
(10, 'B', 'Francia',   'Marruecos', '2026-11-14 21:00:00+00'),
(11, 'B', 'Argentina', 'Marruecos', '2026-11-17 18:00:00+00'),
(12, 'B', 'Francia',   'Japón',     '2026-11-17 21:00:00+00')
ON CONFLICT (id) DO NOTHING;
