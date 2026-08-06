-- ============================================================
-- TibaMax HMIS -- Fix: visit.move and visit.delete permissions
-- These were referenced by backend/routes/visits.js but never
-- seeded, meaning nobody (including Super Admin) could use
-- "Move to" or "Delete" on the Look-up page.
-- Per the TibaMax Role & Module Responsibility Matrix, these are
-- Front Office / Receptionist actions, not Super Admin duties --
-- granted to Receptionist only, intentionally not Super Admin.
-- Safe to re-run.
-- ============================================================

BEGIN;

INSERT INTO permissions (name, category, description) VALUES
    ('visit.move',   'Visits', 'Move a patient to a different service location'),
    ('visit.delete', 'Visits', 'Delete a visit record (patient registration unaffected)')
ON CONFLICT (name) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'Receptionist' AND p.name IN ('visit.move', 'visit.delete')
ON CONFLICT DO NOTHING;

COMMIT;