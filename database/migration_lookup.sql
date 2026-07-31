-- ============================================================
-- TibaMax HMIS — Look-up Page (Daily Front-desk Workspace)
--
-- Adds:
--   1. visits.location_locked — once a patient is moved to a
--      service location, the location can no longer change.
--   2. visit.delete / visit.move permissions, granted to the
--      roles that already own patient/visit management access.
--
-- Safe to re-run.
-- ============================================================

ALTER TABLE visits ADD COLUMN IF NOT EXISTS location_locked BOOLEAN DEFAULT FALSE;

INSERT INTO permissions (name, category, description) VALUES
    ('visit.delete', 'Patient Management', 'Delete a visit record (does not delete patient registration)'),
    ('visit.move',   'Patient Management', 'Move/refer a patient to a specific service location')
ON CONFLICT (name) DO NOTHING;

DO $$
DECLARE
  r_id INT;
BEGIN
  -- Receptionist (Front Office)
  SELECT id INTO r_id FROM roles WHERE name = 'Receptionist';
  IF r_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r_id, id FROM permissions WHERE name IN ('visit.delete','visit.move')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Records Officer
  SELECT id INTO r_id FROM roles WHERE name = 'Records Officer';
  IF r_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r_id, id FROM permissions WHERE name IN ('visit.delete','visit.move')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
