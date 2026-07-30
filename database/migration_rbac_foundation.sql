-- ============================================================
-- TibaMax HMIS — RBAC Foundation (Phase 1)
--
-- Adds real permission-based access control on top of the
-- existing `roles` table, per the Role & Module Responsibility
-- Matrix. Only permissions for features that ACTUALLY EXIST in
-- the app are seeded here — aspirational modules (Radiology,
-- Insurance & Claims, Procurement, etc.) are intentionally left
-- out until those modules are actually built, so permissions
-- never lie about what a role can really do.
--
-- Safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS permissions (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(80) NOT NULL UNIQUE,   -- e.g. 'patient.register'
    category    VARCHAR(40) NOT NULL,          -- e.g. 'Patient Management'
    description VARCHAR(200)
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id       INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- ── Seed permissions (only for modules that actually exist) ──
INSERT INTO permissions (name, category, description) VALUES
    -- Patient Management
    ('patient.view',              'Patient Management', 'View patient records'),
    ('patient.register',          'Patient Management', 'Register a new patient'),
    ('patient.edit_demographics', 'Patient Management', 'Edit patient demographic info'),
    ('patient.delete',            'Patient Management', 'Delete/deactivate a patient record'),
    -- Visits / Queue
    ('visit.create',              'Patient Management', 'Start a new or continuation visit'),
    ('visit.view',                'Patient Management', 'View visit records/history'),
    -- Clinical / EMR
    ('nursing.vitals',            'Clinical Care & EMR', 'Record triage vitals'),
    ('consultation.create',       'Clinical Care & EMR', 'Start/record a consultation'),
    ('consultation.view',         'Clinical Care & EMR', 'View consultation records'),
    ('inpatient.admit',           'Clinical Care & EMR', 'Admit a patient'),
    ('inpatient.discharge',       'Clinical Care & EMR', 'Discharge a patient'),
    ('inpatient.notes',           'Clinical Care & EMR', 'Add ward/nursing notes'),
    -- Family Health
    ('mch.record',                'Family Health Services', 'Record ANC/PNC/CWC/FP encounters'),
    -- Laboratory
    ('lab.order',                 'Ancillary & Diagnostics', 'Order a lab test'),
    ('lab.process',               'Ancillary & Diagnostics', 'Process/collect a lab sample'),
    ('lab.result',                'Ancillary & Diagnostics', 'Enter lab results'),
    -- Pharmacy
    ('pharmacy.prescription.view','Pharmacy', 'View prescriptions'),
    ('pharmacy.dispense',         'Pharmacy', 'Dispense medication'),
    ('pharmacy.stock.manage',     'Pharmacy', 'Add/adjust pharmacy stock'),
    -- Billing
    ('billing.invoice',           'Billing & Financial Mgmt.', 'Create invoices'),
    ('billing.payment',           'Billing & Financial Mgmt.', 'Record a payment'),
    ('billing.view',              'Billing & Financial Mgmt.', 'View billing/revenue records'),
    -- Appointments
    ('appointment.create',        'Patient Management', 'Book an appointment'),
    ('appointment.manage',        'Patient Management', 'Reschedule/cancel appointments'),
    -- HR / Staff
    ('staff.view',                'HR & Administration', 'View staff records'),
    ('staff.manage',              'HR & Administration', 'Create/edit staff records'),
    ('users.create',              'HR & Administration', 'Create a system login user'),
    ('users.assign_role',         'HR & Administration', 'Assign a role to a user'),
    ('users.reset_password',      'HR & Administration', 'Reset a user password'),
    -- Reports
    ('reports.view',              'Reports & Analytics', 'View operational reports'),
    -- System / Governance (Super Admin territory)
    ('system.settings',           'System Settings', 'Manage hospital/system settings'),
    ('rbac.manage',               'System Settings', 'Manage roles & permissions'),
    ('audit.view',                'System Settings', 'View audit logs'),
    ('audit.manage',              'System Settings', 'Configure audit policy'),
    ('superadmin.access',         'System Settings', 'Access the Super Admin panel')
ON CONFLICT (name) DO NOTHING;

-- ── Role → permission assignments ──────────────────────────
-- Helper: assign a set of permissions to a role by name.
DO $$
DECLARE
  r_id INT;
BEGIN

  -- Receptionist (Front Office)
  SELECT id INTO r_id FROM roles WHERE name = 'Receptionist';
  IF r_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r_id, id FROM permissions WHERE name IN
      ('patient.view','patient.register','patient.edit_demographics',
       'visit.create','visit.view','appointment.create','appointment.manage',
       'billing.invoice','billing.view')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Records Officer
  SELECT id INTO r_id FROM roles WHERE name = 'Records Officer';
  IF r_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r_id, id FROM permissions WHERE name IN
      ('patient.view','patient.register','patient.edit_demographics','patient.delete',
       'visit.view','reports.view')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Doctor
  SELECT id INTO r_id FROM roles WHERE name = 'Doctor';
  IF r_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r_id, id FROM permissions WHERE name IN
      ('patient.view','visit.view','consultation.create','consultation.view',
       'lab.order','inpatient.admit','inpatient.discharge','inpatient.notes',
       'mch.record','pharmacy.prescription.view')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Nurse
  SELECT id INTO r_id FROM roles WHERE name = 'Nurse';
  IF r_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r_id, id FROM permissions WHERE name IN
      ('patient.view','visit.view','nursing.vitals','inpatient.notes','mch.record')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Lab Technician
  SELECT id INTO r_id FROM roles WHERE name = 'Lab Technician';
  IF r_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r_id, id FROM permissions WHERE name IN
      ('patient.view','lab.process','lab.result')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Pharmacist
  SELECT id INTO r_id FROM roles WHERE name = 'Pharmacist';
  IF r_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r_id, id FROM permissions WHERE name IN
      ('patient.view','pharmacy.prescription.view','pharmacy.dispense','pharmacy.stock.manage')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Cashier
  SELECT id INTO r_id FROM roles WHERE name = 'Cashier';
  IF r_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r_id, id FROM permissions WHERE name IN
      ('patient.view','billing.invoice','billing.payment','billing.view')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Storekeeper
  SELECT id INTO r_id FROM roles WHERE name = 'Storekeeper';
  IF r_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r_id, id FROM permissions WHERE name IN
      ('pharmacy.stock.manage')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Admin (System Admin equivalent)
  SELECT id INTO r_id FROM roles WHERE name = 'Admin';
  IF r_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r_id, id FROM permissions WHERE name IN
      ('patient.view','staff.view','staff.manage','users.create',
       'users.assign_role','users.reset_password','system.settings',
       'audit.view','reports.view')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Super Admin — everything
  SELECT id INTO r_id FROM roles WHERE name = 'Super Admin';
  IF r_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r_id, id FROM permissions
    ON CONFLICT DO NOTHING;
  END IF;

END $$;

-- Verify
SELECT r.name AS role, COUNT(rp.permission_id) AS permission_count
FROM roles r LEFT JOIN role_permissions rp ON rp.role_id = r.id
GROUP BY r.name ORDER BY r.name;