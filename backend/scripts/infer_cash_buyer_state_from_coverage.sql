-- Infer cash_buyers.state from coverage[] when state IS NULL.
-- Matches whole coverage elements only (exact 2-letter code or full state name).
-- Safe to re-run: only updates rows where state IS NULL.

BEGIN;

-- ---------------------------------------------------------------------------
-- Preview: rows that would receive a state (no writes)
-- ---------------------------------------------------------------------------
WITH state_map(abbrev, name) AS (
    VALUES
        ('AL', 'Alabama'),
        ('AK', 'Alaska'),
        ('AZ', 'Arizona'),
        ('AR', 'Arkansas'),
        ('CA', 'California'),
        ('CO', 'Colorado'),
        ('CT', 'Connecticut'),
        ('DE', 'Delaware'),
        ('FL', 'Florida'),
        ('GA', 'Georgia'),
        ('HI', 'Hawaii'),
        ('ID', 'Idaho'),
        ('IL', 'Illinois'),
        ('IN', 'Indiana'),
        ('IA', 'Iowa'),
        ('KS', 'Kansas'),
        ('KY', 'Kentucky'),
        ('LA', 'Louisiana'),
        ('ME', 'Maine'),
        ('MD', 'Maryland'),
        ('MA', 'Massachusetts'),
        ('MI', 'Michigan'),
        ('MN', 'Minnesota'),
        ('MS', 'Mississippi'),
        ('MO', 'Missouri'),
        ('MT', 'Montana'),
        ('NE', 'Nebraska'),
        ('NV', 'Nevada'),
        ('NH', 'New Hampshire'),
        ('NJ', 'New Jersey'),
        ('NM', 'New Mexico'),
        ('NY', 'New York'),
        ('NC', 'North Carolina'),
        ('ND', 'North Dakota'),
        ('OH', 'Ohio'),
        ('OK', 'Oklahoma'),
        ('OR', 'Oregon'),
        ('PA', 'Pennsylvania'),
        ('RI', 'Rhode Island'),
        ('SC', 'South Carolina'),
        ('SD', 'South Dakota'),
        ('TN', 'Tennessee'),
        ('TX', 'Texas'),
        ('UT', 'Utah'),
        ('VT', 'Vermont'),
        ('VA', 'Virginia'),
        ('WA', 'Washington'),
        ('WV', 'West Virginia'),
        ('WI', 'Wisconsin'),
        ('WY', 'Wyoming'),
        ('DC', 'District of Columbia')
),
coverage_matches AS (
    SELECT
        cb.id,
        sm.abbrev,
        cov.ord
    FROM cash_buyers cb
    CROSS JOIN LATERAL unnest(cb.coverage) WITH ORDINALITY AS cov(entry, ord)
    INNER JOIN state_map sm
        ON upper(btrim(cov.entry)) = sm.abbrev
        OR upper(btrim(cov.entry)) = upper(sm.name)
    WHERE cb.state IS NULL
      AND cb.coverage IS NOT NULL
      AND cardinality(cb.coverage) > 0
),
best_match AS (
    SELECT DISTINCT ON (id)
        id,
        abbrev
    FROM coverage_matches
    ORDER BY id, ord
)
SELECT COUNT(*) AS would_update
FROM best_match;

-- ---------------------------------------------------------------------------
-- Update (only state IS NULL; first matching coverage entry wins)
-- ---------------------------------------------------------------------------
WITH state_map(abbrev, name) AS (
    VALUES
        ('AL', 'Alabama'),
        ('AK', 'Alaska'),
        ('AZ', 'Arizona'),
        ('AR', 'Arkansas'),
        ('CA', 'California'),
        ('CO', 'Colorado'),
        ('CT', 'Connecticut'),
        ('DE', 'Delaware'),
        ('FL', 'Florida'),
        ('GA', 'Georgia'),
        ('HI', 'Hawaii'),
        ('ID', 'Idaho'),
        ('IL', 'Illinois'),
        ('IN', 'Indiana'),
        ('IA', 'Iowa'),
        ('KS', 'Kansas'),
        ('KY', 'Kentucky'),
        ('LA', 'Louisiana'),
        ('ME', 'Maine'),
        ('MD', 'Maryland'),
        ('MA', 'Massachusetts'),
        ('MI', 'Michigan'),
        ('MN', 'Minnesota'),
        ('MS', 'Mississippi'),
        ('MO', 'Missouri'),
        ('MT', 'Montana'),
        ('NE', 'Nebraska'),
        ('NV', 'Nevada'),
        ('NH', 'New Hampshire'),
        ('NJ', 'New Jersey'),
        ('NM', 'New Mexico'),
        ('NY', 'New York'),
        ('NC', 'North Carolina'),
        ('ND', 'North Dakota'),
        ('OH', 'Ohio'),
        ('OK', 'Oklahoma'),
        ('OR', 'Oregon'),
        ('PA', 'Pennsylvania'),
        ('RI', 'Rhode Island'),
        ('SC', 'South Carolina'),
        ('SD', 'South Dakota'),
        ('TN', 'Tennessee'),
        ('TX', 'Texas'),
        ('UT', 'Utah'),
        ('VT', 'Vermont'),
        ('VA', 'Virginia'),
        ('WA', 'Washington'),
        ('WV', 'West Virginia'),
        ('WI', 'Wisconsin'),
        ('WY', 'Wyoming'),
        ('DC', 'District of Columbia')
),
coverage_matches AS (
    SELECT
        cb.id,
        sm.abbrev,
        cov.ord
    FROM cash_buyers cb
    CROSS JOIN LATERAL unnest(cb.coverage) WITH ORDINALITY AS cov(entry, ord)
    INNER JOIN state_map sm
        ON upper(btrim(cov.entry)) = sm.abbrev
        OR upper(btrim(cov.entry)) = upper(sm.name)
    WHERE cb.state IS NULL
      AND cb.coverage IS NOT NULL
      AND cardinality(cb.coverage) > 0
),
best_match AS (
    SELECT DISTINCT ON (id)
        id,
        abbrev
    FROM coverage_matches
    ORDER BY id, ord
),
updated AS (
    UPDATE cash_buyers cb
    SET
        state = bm.abbrev,
        updated_at = NOW()
    FROM best_match bm
    WHERE cb.id = bm.id
      AND cb.state IS NULL
    RETURNING cb.id
)
SELECT COUNT(*) AS rows_updated FROM updated;

COMMIT;
