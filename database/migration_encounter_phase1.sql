-- ============================================================
-- TibaMax HMIS — Patient/Encounter Model, Phase 1
--
-- Implements (see AFYATAB/TIBAMAX comprehensive Patient Management
-- spec, Rules 1-9 and Sections 66-77):
--
--   1. Removes the hard "max 2 visits/day" business rule — there is
--      no longer any code path that blocks a legitimate encounter
--      based on a same-day count. (Nothing to ALTER for this part —
--      the rule lived only in application code, already removed.)
--
--   2. Adds visit_sequence / visit_classification / related_visit_id
--      so "First Visit", "Revisit", etc. are derived operational
--      labels layered on top of the encounter record — never the
--      unique identity of the encounter itself (encounter identity
--      stays visit_no / id, unchanged).
--
--   3. Adds idempotency_key so a double-click or a network retry on
--      Initiate/Continue cannot create two visit rows for the same
--      submitted action.
--
--   4. Adds a configurable encounter_continuation_window_hours to
--      hospital_settings (defaults to 6) instead of hard-coding the
--      6-hour figure anywhere in application code.
--
--   5. Backfills visit_sequence/visit_classification for all
--      existing rows from their real chronological order per
--      patient, so history stays intact.
--
-- Purely additive — no existing column is dropped or renamed, no
-- data is destroyed. Safe to re-run.
-- ============================================================

ALTER TABLE visits ADD COLUMN IF NOT EXISTS visit_sequence       INT;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS visit_classification VARCHAR(20);
ALTER TABLE visits ADD COLUMN IF NOT EXISTS related_visit_id     INT REFERENCES visits(id);
ALTER TABLE visits ADD COLUMN IF NOT EXISTS idempotency_key      VARCHAR(64);

-- A double-submit with the same key must be rejected at the DB level
-- too, not just caught in application code (belt and suspenders).
CREATE UNIQUE INDEX IF NOT EXISTS visits_idempotency_key_uidx
  ON visits(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Configurable continuation window — facility policy, not a
-- hard-coded constant in application code.
ALTER TABLE hospital_settings
  ADD COLUMN IF NOT EXISTS encounter_continuation_window_hours INT DEFAULT 6;

-- Backfill visit_sequence for existing rows from real chronological
-- order per patient (1st, 2nd, 3rd... by actual visit_date/visit_time).
WITH seq AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY patient_id ORDER BY visit_date, visit_time, id
  ) AS rn
  FROM visits
)
UPDATE visits v SET visit_sequence = seq.rn
FROM seq
WHERE v.id = seq.id AND v.visit_sequence IS NULL;

-- Backfill visit_classification from the computed sequence.
UPDATE visits
SET visit_classification = CASE WHEN visit_sequence = 1 THEN 'FIRST_VISIT' ELSE 'REVISIT' END
WHERE visit_classification IS NULL;
