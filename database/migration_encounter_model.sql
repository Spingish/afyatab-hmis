-- ============================================================
-- TibaMax HMIS — Phase 4: Encounter/Service Data Model
--
-- Per the roadmap, this separates "the encounter" from "the
-- multiple service activities within it." Rather than creating
-- a parallel `encounters` table (which would mean re-pointing
-- every foreign key in triage/consultations/lab_requests/
-- prescriptions/mch registers — high-risk, high-effort), this
-- migration extends the EXISTING `visits` table with the
-- encounter-tracking fields it was missing, and adds a genuine
-- new `encounter_services` table linking each clinical activity
-- back to its visit. `visits` now functionally IS the encounter
-- table — nothing that currently works breaks.
--
-- Safe to re-run.
-- ============================================================

-- ── 1. Extend visits with encounter-tracking fields ──────────
ALTER TABLE visits ADD COLUMN IF NOT EXISTS encounter_status VARCHAR(30) DEFAULT 'Open';
  -- Open | In Progress | Awaiting Result | Awaiting Service |
  -- Completed | Cancelled | Admitted | Transferred | Discharged
ALTER TABLE visits ADD COLUMN IF NOT EXISTS current_service  VARCHAR(80);
ALTER TABLE visits ADD COLUMN IF NOT EXISTS current_location VARCHAR(80);
ALTER TABLE visits ADD COLUMN IF NOT EXISTS continuation_of_visit_id INT REFERENCES visits(id);

-- Note: `visit_type` (New | Revisit | Emergency) already exists and IS
-- the encounter classification field the reporting spec calls for —
-- no need to duplicate it.

-- Backfill encounter_status from the existing status/current_stage fields
UPDATE visits SET encounter_status = CASE
  WHEN status = 'Discharged'  THEN 'Discharged'
  WHEN status = 'Admitted'    THEN 'Admitted'
  WHEN status = 'Transferred' THEN 'Transferred'
  WHEN status = 'Completed'   THEN 'Completed'
  WHEN current_stage IN ('Investigation','Procedure') THEN 'Awaiting Result'
  WHEN current_stage = 'Pharmacy' THEN 'Awaiting Service'
  WHEN status = 'Active'      THEN 'In Progress'
  ELSE 'Open'
END
WHERE encounter_status = 'Open'; -- only touch rows still at the default

UPDATE visits SET current_service = current_stage WHERE current_service IS NULL;

-- ── 2. New table: encounter_services ──────────────────────────
-- One row per clinical activity performed during a visit/encounter.
-- reference_table + reference_id point back to the actual clinical
-- record (triage, consultations, lab_requests, prescriptions, etc.)
-- so nothing is duplicated — this is an index/timeline, not a copy.
CREATE TABLE IF NOT EXISTS encounter_services (
    id              SERIAL PRIMARY KEY,
    visit_id        INT          NOT NULL REFERENCES visits(id),
    patient_id      INT          NOT NULL REFERENCES patients(id),
    service_type    VARCHAR(40)  NOT NULL,  -- Triage | Consultation | Laboratory | Pharmacy | ANC | PNC | CWC | FamilyPlanning
    reference_table VARCHAR(40)  NOT NULL,  -- e.g. 'triage', 'consultations'
    reference_id    INT          NOT NULL,  -- id within reference_table
    performed_by    INT          REFERENCES staff(id),
    status          VARCHAR(30)  DEFAULT 'Completed',
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE (reference_table, reference_id)  -- prevents double-backfill
);

CREATE INDEX IF NOT EXISTS idx_encounter_services_visit   ON encounter_services(visit_id);
CREATE INDEX IF NOT EXISTS idx_encounter_services_patient ON encounter_services(patient_id);
CREATE INDEX IF NOT EXISTS idx_encounter_services_type    ON encounter_services(service_type);

-- ── 3. Backfill from existing clinical tables ──────────────────
INSERT INTO encounter_services (visit_id, patient_id, service_type, reference_table, reference_id, performed_by, started_at, completed_at)
SELECT visit_id, patient_id, 'Triage', 'triage', id, triaged_by, triaged_at, triaged_at
FROM triage
ON CONFLICT (reference_table, reference_id) DO NOTHING;

INSERT INTO encounter_services (visit_id, patient_id, service_type, reference_table, reference_id, performed_by, started_at, completed_at)
SELECT visit_id, patient_id, 'Consultation', 'consultations', id, doctor_id, created_at, created_at
FROM consultations
ON CONFLICT (reference_table, reference_id) DO NOTHING;

INSERT INTO encounter_services (visit_id, patient_id, service_type, reference_table, reference_id, performed_by, status, started_at, completed_at)
SELECT visit_id, patient_id, 'Laboratory', 'lab_requests', id, requested_by, status, requested_at, completed_at
FROM lab_requests
WHERE visit_id IS NOT NULL
ON CONFLICT (reference_table, reference_id) DO NOTHING;

INSERT INTO encounter_services (visit_id, patient_id, service_type, reference_table, reference_id, performed_by, status, started_at, completed_at)
SELECT visit_id, patient_id, 'Pharmacy', 'prescriptions', id, prescribed_by, status, prescribed_at, NULL
FROM prescriptions
WHERE visit_id IS NOT NULL
ON CONFLICT (reference_table, reference_id) DO NOTHING;

INSERT INTO encounter_services (visit_id, patient_id, service_type, reference_table, reference_id, started_at, completed_at)
SELECT visit_id, patient_id, 'ANC', 'anc_register', id, created_at, created_at
FROM anc_register
ON CONFLICT (reference_table, reference_id) DO NOTHING;

INSERT INTO encounter_services (visit_id, patient_id, service_type, reference_table, reference_id, started_at, completed_at)
SELECT visit_id, patient_id, 'PNC', 'pnc_register', id, created_at, created_at
FROM pnc_register
ON CONFLICT (reference_table, reference_id) DO NOTHING;

INSERT INTO encounter_services (visit_id, patient_id, service_type, reference_table, reference_id, started_at, completed_at)
SELECT visit_id, patient_id, 'CWC', 'cwc_register', id, created_at, created_at
FROM cwc_register
ON CONFLICT (reference_table, reference_id) DO NOTHING;

INSERT INTO encounter_services (visit_id, patient_id, service_type, reference_table, reference_id, started_at, completed_at)
SELECT visit_id, patient_id, 'FamilyPlanning', 'fp_register', id, date_issued, date_issued
FROM fp_register
ON CONFLICT (reference_table, reference_id) DO NOTHING;

-- Verify
SELECT service_type, COUNT(*) AS activities, COUNT(DISTINCT visit_id) AS encounters, COUNT(DISTINCT patient_id) AS unique_patients
FROM encounter_services GROUP BY service_type ORDER BY service_type;