-- ============================================================
-- TibaMax HMIS — Fix visit_no generation (duplicate key bug)
--
-- generate_visit_no() previously computed the next number as
-- COUNT(*) + 1 for the current year. That breaks the instant
-- there's any gap in that year's numbering — which the Delete
-- Visit feature now guarantees will eventually happen (deleting
-- one visit leaves a gap, and the next Initiate/Continue then
-- recomputes a number that's already taken by an existing row).
--
-- Same root cause and same fix pattern already applied to
-- staff_no generation: compute from the true MAX existing
-- number for the year, not a row count.
--
-- Safe to re-run (CREATE OR REPLACE).
-- ============================================================

CREATE OR REPLACE FUNCTION generate_visit_no()
RETURNS VARCHAR AS $$
DECLARE
  yr        TEXT := TO_CHAR(NOW(), 'YYYY');
  max_no    INT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(visit_no FROM 'V-\d{4}-(\d+)$') AS INT)), 0)
  INTO max_no
  FROM visits
  WHERE visit_no LIKE 'V-' || yr || '-%';

  RETURN 'V-' || yr || '-' || LPAD((max_no + 1)::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;
