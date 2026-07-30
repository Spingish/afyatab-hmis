-- ============================================================
-- TibaMax HMIS — Permission-Based RBAC Migration
-- Adds: permissions, roles, role_permissions
-- Links: staff.role_id -> roles.id
-- Based on: TibaMax Role & Module Responsibility Matrix
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. CORE TABLES
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS permissions (
  id          SERIAL PRIMARY KEY,
  code        VARCHAR(100) UNIQUE NOT NULL,   -- e.g. 'lab.result.validate'
  module      VARCHAR(50)  NOT NULL,          -- e.g. 'laboratory'
  description TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roles (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(50) UNIQUE NOT NULL,    -- e.g. 'front_office'
  label       VARCHAR(100) NOT NULL,          -- e.g. 'Front Office / Reception'
  description TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id       INT REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INT REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- Link staff to a role. Nullable so existing rows don't break;
-- backfill manually per staff member after this migration runs.
ALTER TABLE staff ADD COLUMN IF NOT EXISTS role_id INT REFERENCES roles(id);

-- ------------------------------------------------------------
-- 2. PERMISSIONS (module by module, from the role matrix)
-- ------------------------------------------------------------

INSERT INTO permissions (code, module, description) VALUES
-- Patients / Front Office / Records
('patients.register',            'patients', 'Register new patient'),
('patients.search',              'patients', 'Search for a patient'),
('patients.view_demographics',   'patients', 'View patient demographics'),
('patients.update_demographics', 'patients', 'Update permitted demographic fields'),
('patients.correct_demographics','patients', 'Correct/verify identity, deeper edit rights (Records Officer)'),
('patients.manage_uhid',         'patients', 'Manage Unique Health ID'),
('patients.merge_duplicates',    'patients', 'Merge duplicate patient records'),
('patients.manage_attachments',  'patients', 'Manage patient file attachments'),
('patients.view_history',        'patients', 'View visit/encounter history'),
('patients.archive',             'patients', 'Archive/deactivate patient records'),
('patients.view_full_record',    'patients', 'View unrestricted clinical record (beyond demographics)'),

-- Visits / Appointments
('visits.create',                'visits', 'Create a new visit'),
('visits.checkin',               'visits', 'Check in a patient for an appointment/visit'),
('visits.manage_queue',          'visits', 'Manage registration/service queue'),
('appointments.book',            'appointments', 'Book an appointment'),
('appointments.reschedule',      'appointments', 'Reschedule an appointment'),
('appointments.cancel',          'appointments', 'Cancel an appointment'),

-- Clinical / Doctor
('clinical.consultation.start',  'clinical', 'Start a consultation'),
('clinical.history.record',      'clinical', 'Record patient history'),
('clinical.examination.record',  'clinical', 'Record examination findings'),
('clinical.diagnosis.record',    'clinical', 'Record diagnosis'),
('clinical.treatment_plan.create','clinical','Create treatment plan'),
('clinical.prescription.create', 'clinical', 'Create prescription'),
('clinical.lab_order.create',    'clinical', 'Order laboratory tests'),
('clinical.imaging_order.create','clinical', 'Order imaging/radiology'),
('clinical.referral.create',     'clinical', 'Create referral'),
('clinical.procedure.record',    'clinical', 'Record a clinical procedure'),
('clinical.followup.create',     'clinical', 'Create follow-up plan'),
('clinical.notes.sign',          'clinical', 'Sign off clinical notes'),

-- Nursing
('nursing.triage',               'nursing', 'Perform triage'),
('nursing.vitals.record',        'nursing', 'Record vital signs'),
('nursing.assessment.record',    'nursing', 'Nursing assessment'),
('nursing.care_plan.manage',     'nursing', 'Manage nursing care plans'),
('nursing.medication.administer','nursing', 'Administer medication'),
('nursing.notes.create',         'nursing', 'Create nursing notes'),
('nursing.handover.create',      'nursing', 'Create handover notes'),
('nursing.orders.view',          'nursing', 'View doctor orders'),
('nursing.critical.flag',        'nursing', 'Flag critical observations'),

-- Laboratory
('lab.order.view',               'laboratory', 'View lab orders'),
('lab.specimen.collect',         'laboratory', 'Collect specimen'),
('lab.test.process',             'laboratory', 'Process laboratory test'),
('lab.result.enter',             'laboratory', 'Enter test results'),
('lab.result.validate',          'laboratory', 'Validate/authorize results (senior/pathologist)'),
('lab.result.release',           'laboratory', 'Release results'),
('lab.report.print',             'laboratory', 'Print laboratory report'),
('lab.critical.flag',            'laboratory', 'Flag critical result'),
('lab.config.manage',            'laboratory', 'Manage lab test configuration'),

-- Pharmacy
('pharmacy.prescription.view',   'pharmacy', 'View prescriptions'),
('pharmacy.prescription.verify', 'pharmacy', 'Verify a prescription'),
('pharmacy.stock.view',          'pharmacy', 'View pharmacy stock'),
('pharmacy.dispense',            'pharmacy', 'Dispense medication'),
('pharmacy.returns.handle',      'pharmacy', 'Handle medication returns'),
('pharmacy.stock.adjust',        'pharmacy', 'Adjust pharmacy stock'),
('pharmacy.stock.adjust.approve','pharmacy', 'Approve stock adjustments (manager)'),
('pharmacy.formulary.manage',    'pharmacy', 'Manage drug formulary'),
('pharmacy.transfer.approve',    'pharmacy', 'Approve stock transfers'),

-- Supply Chain / Inventory
('inventory.receive',            'inventory', 'Receive supplies'),
('inventory.issue',              'inventory', 'Issue supplies'),
('inventory.stock_count',        'inventory', 'Perform stock counts'),
('inventory.transfer',           'inventory', 'Transfer stock between stores'),
('inventory.requisition.create', 'inventory', 'Create a requisition'),
('inventory.purchase_order.create','inventory','Create purchase orders (procurement)'),
('inventory.supplier.manage',    'inventory', 'Manage suppliers'),
('inventory.adjustment.approve', 'inventory', 'Approve stock adjustments'),
('inventory.reconcile',          'inventory', 'Reconcile/audit stock'),
('inventory.reports.view',       'inventory', 'View inventory reports'),

-- Billing & Finance
('billing.initiate',             'billing', 'Initiate billing for a visit'),
('billing.charges.view',         'billing', 'View applicable charges'),
('billing.invoice.generate',     'billing', 'Generate/view invoices'),
('billing.payment.receive',      'billing', 'Receive payment'),
('billing.receipt.print',        'billing', 'Print receipt'),
('billing.refund.process',       'billing', 'Process an authorized refund'),
('billing.refund.approve',       'billing', 'Approve a refund (manager)'),
('billing.drawer.close',         'billing', 'Close cash drawer'),
('billing.transactions.review',  'billing', 'Review transactions'),
('billing.reconcile',            'billing', 'Perform cashbook/M-Pesa/POS reconciliation'),
('billing.reconcile.approve',    'billing', 'Approve reconciliation'),
('billing.financial_adjustment', 'billing', 'Make financial adjustments'),
('billing.reports.view',         'billing', 'View revenue/financial reports'),

-- Inpatient
('inpatient.admission.register', 'inpatient', 'Register an admission'),
('inpatient.bed.assign',         'inpatient', 'Assign a bed'),
('inpatient.ward.census.view',   'inpatient', 'View ward census'),
('inpatient.transfer',           'inpatient', 'Transfer a patient between wards/beds'),
('inpatient.assessment.record',  'inpatient', 'Record admission assessment'),
('inpatient.progress_notes.create','inpatient','Create daily progress notes'),
('inpatient.discharge.decide',   'inpatient', 'Make discharge decision'),
('inpatient.discharge.summary.create', 'inpatient', 'Create discharge summary'),
('inpatient.discharge.process',  'inpatient', 'Process discharge administratively'),
('inpatient.capacity.manage',    'inpatient', 'Manage ward capacity/occupancy'),

-- Emergency / Casualty
('emergency.register',           'emergency', 'Register an emergency patient'),
('emergency.triage',             'emergency', 'Perform emergency triage'),
('emergency.assessment.record',  'emergency', 'Record emergency assessment'),
('emergency.disposition.decide', 'emergency', 'Decide patient disposition'),
('emergency.department.oversight','emergency','Emergency department operational oversight'),

-- MCH (Maternal & Child Health)
('mch.anc.record',               'mch', 'Record ANC visit'),
('mch.pnc.record',               'mch', 'Record PNC visit'),
('mch.cwc.record',               'mch', 'Record CWC/child welfare visit'),
('mch.fp.record',                'mch', 'Record family planning visit'),
('mch.register.manage',          'mch', 'Manage MCH registers'),
('mch.reporting',                'mch', 'MCH statistical/MOH reporting'),

-- Records & Reporting
('records.duplicates.manage',    'records', 'Manage/identify duplicate records'),
('records.data_quality.check',   'records', 'Perform data quality checks'),
('records.moh_report.generate',  'records', 'Generate MOH reports'),
('records.audit',                'records', 'Perform records audits'),
('records.correction.audited',   'records', 'Make data corrections with audit trail'),

-- HR
('hr.staff_records.manage',      'hr', 'Manage staff records/profiles'),
('hr.leave.manage',              'hr', 'Manage staff leave'),
('hr.attendance.manage',         'hr', 'Manage staff attendance'),
('hr.reports.view',              'hr', 'View HR reports'),

-- Communications & Notifications
('comms.receive',                'communications', 'Receive announcements/notifications'),
('comms.department.broadcast',   'communications', 'Send department-wide announcements'),
('comms.system.broadcast',       'communications', 'Send system-wide/emergency announcements'),

-- Audit & Security
('audit.operational.view',       'audit', 'View operational audit logs'),
('audit.comprehensive.view',     'audit', 'View comprehensive audit trail'),
('audit.policy.configure',       'audit', 'Configure audit policies'),
('security.policy.configure',    'audit', 'Configure security policies'),
('security.account.disable',     'audit', 'Disable a compromised account'),

-- Settings & Master Data
('settings.personal.manage',     'settings', 'Manage own personal preferences'),
('settings.department.manage',   'settings', 'Manage limited department configuration'),
('settings.operational.manage',  'settings', 'Manage departments/counters/printers/notifications'),
('settings.master_data.approved.manage', 'settings', 'Maintain approved operational master data'),
('settings.master_data.governance','settings', 'Control structure/governance of master data'),
('settings.rbac.manage',         'settings', 'Manage roles and permission policies'),
('settings.security.manage',     'settings', 'Manage system-wide security configuration'),
('settings.integration.manage',  'settings', 'Configure approved operational integrations'),
('settings.integration.credentials', 'settings', 'Manage integration API credentials (superadmin only)'),
('settings.module.activate',     'settings', 'Activate/deactivate system modules'),
('settings.facility.configure',  'settings', 'Configure facility/system-wide settings'),

-- Users & Roles
('users.manage',                 'users', 'Create/manage user accounts'),
('users.password_reset',         'users', 'Reset user passwords'),
('users.role_assign',            'users', 'Assign approved roles to users'),
('users.create_system_admin',    'users', 'Create System Admin accounts'),
('users.create_super_admin',     'users', 'Create Super Admin accounts'),

-- Reports & Analytics (scope-based)
('reports.own_department.view',  'reports', 'View own department operational reports'),
('reports.department_wide.view', 'reports', 'View department-wide reports'),
('reports.facility_wide.view',   'reports', 'View facility-wide clinical/statistical reports'),
('reports.financial.view',       'reports', 'View revenue/financial reports'),
('reports.technical.view',       'reports', 'View technical/system reports'),
('reports.comprehensive.view',   'reports', 'View comprehensive system-wide analytics')

ON CONFLICT (code) DO NOTHING;

-- ------------------------------------------------------------
-- 3. ROLES
-- ------------------------------------------------------------

INSERT INTO roles (name, label, description) VALUES
('super_admin',        'Super Admin',                 'System governance, security, and facility configuration owner'),
('system_admin',       'System Admin',                'Technical & operational administration'),
('front_office',       'Front Office / Reception',    'Primary patient-entry role'),
('records_officer',    'Records Officer / Health Records', 'Deeper patient-info authority, records & reporting'),
('doctor',             'Doctor / Medical Officer',     'Clinical care and EMR'),
('nurse',              'Nurse',                        'Nursing care and triage'),
('lab_tech',           'Laboratory Technician',        'Specimen collection and test processing'),
('lab_senior',         'Senior Lab / Pathologist',     'Result validation and lab configuration'),
('pharmacist',         'Pharmacist',                   'Dispensing and pharmacy stock'),
('pharmacy_manager',   'Pharmacy Manager',             'Formulary and stock approval'),
('storekeeper',        'Storekeeper',                  'Receive/issue supplies, stock counts'),
('procurement_officer','Procurement Officer',          'Requisitions, purchase orders, suppliers'),
('inventory_manager',  'Inventory Manager',            'Stock approvals, reconciliation, audits'),
('cashier',            'Cashier',                      'Invoicing and payment collection'),
('finance_officer',    'Finance Officer',              'Reconciliation and revenue reporting'),
('finance_manager',    'Finance Manager',              'Financial approvals and oversight'),
('ward_clerk',         'Ward Clerk',                   'Admission registration and bed administration'),
('inpatient_manager',  'Inpatient Manager',            'Ward capacity and occupancy oversight'),
('emergency_manager',  'Emergency Manager',            'Emergency department oversight'),
('hr_officer',         'HR Officer',                   'Staff records, leave, attendance'),
('department_manager', 'Department Manager',           'Generic department-level oversight role')
ON CONFLICT (name) DO NOTHING;

-- ------------------------------------------------------------
-- 4. ROLE → PERMISSION MAPPINGS
-- ------------------------------------------------------------

-- Helper pattern: insert via SELECT joining role name + permission code.
-- Add/remove rows here as your policies evolve — this is the
-- single source of truth for "who can do what".

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE
(r.name, p.code) IN (
  -- ===== FRONT OFFICE =====
  ('front_office','patients.register'), ('front_office','patients.search'),
  ('front_office','patients.update_demographics'), ('front_office','visits.create'),
  ('front_office','visits.checkin'), ('front_office','visits.manage_queue'),
  ('front_office','appointments.book'), ('front_office','appointments.reschedule'),
  ('front_office','appointments.cancel'), ('front_office','billing.initiate'),
  ('front_office','billing.charges.view'), ('front_office','settings.personal.manage'),

  -- ===== RECORDS OFFICER =====
  ('records_officer','patients.register'), ('records_officer','patients.correct_demographics'),
  ('records_officer','patients.manage_uhid'), ('records_officer','patients.merge_duplicates'),
  ('records_officer','patients.manage_attachments'), ('records_officer','patients.view_history'),
  ('records_officer','patients.archive'), ('records_officer','records.duplicates.manage'),
  ('records_officer','records.data_quality.check'), ('records_officer','records.moh_report.generate'),
  ('records_officer','records.audit'), ('records_officer','records.correction.audited'),
  ('records_officer','mch.register.manage'), ('records_officer','mch.reporting'),
  ('records_officer','reports.facility_wide.view'), ('records_officer','settings.personal.manage'),

  -- ===== DOCTOR =====
  ('doctor','patients.search'), ('doctor','patients.view_demographics'),
  ('doctor','patients.view_history'), ('doctor','patients.view_full_record'),
  ('doctor','clinical.consultation.start'), ('doctor','clinical.history.record'),
  ('doctor','clinical.examination.record'), ('doctor','clinical.diagnosis.record'),
  ('doctor','clinical.treatment_plan.create'), ('doctor','clinical.prescription.create'),
  ('doctor','clinical.lab_order.create'), ('doctor','clinical.imaging_order.create'),
  ('doctor','clinical.referral.create'), ('doctor','clinical.procedure.record'),
  ('doctor','clinical.followup.create'), ('doctor','clinical.notes.sign'),
  ('doctor','inpatient.assessment.record'), ('doctor','inpatient.progress_notes.create'),
  ('doctor','inpatient.discharge.decide'), ('doctor','inpatient.discharge.summary.create'),
  ('doctor','emergency.assessment.record'), ('doctor','emergency.disposition.decide'),
  ('doctor','mch.anc.record'), ('doctor','mch.pnc.record'),
  ('doctor','reports.own_department.view'), ('doctor','settings.personal.manage'),

  -- ===== NURSE =====
  ('nurse','patients.search'), ('nurse','patients.view_demographics'),
  ('nurse','nursing.triage'), ('nurse','nursing.vitals.record'),
  ('nurse','nursing.assessment.record'), ('nurse','nursing.care_plan.manage'),
  ('nurse','nursing.medication.administer'), ('nurse','nursing.notes.create'),
  ('nurse','nursing.handover.create'), ('nurse','nursing.orders.view'),
  ('nurse','nursing.critical.flag'), ('nurse','inpatient.bed.assign'),
  ('nurse','inpatient.ward.census.view'), ('nurse','emergency.triage'),
  ('nurse','mch.anc.record'), ('nurse','mch.pnc.record'), ('nurse','mch.cwc.record'),
  ('nurse','mch.fp.record'), ('nurse','reports.own_department.view'),
  ('nurse','settings.personal.manage'),

  -- ===== LAB TECH =====
  ('lab_tech','patients.search'), ('lab_tech','lab.order.view'),
  ('lab_tech','lab.specimen.collect'), ('lab_tech','lab.test.process'),
  ('lab_tech','lab.result.enter'), ('lab_tech','lab.report.print'),
  ('lab_tech','lab.critical.flag'), ('lab_tech','reports.own_department.view'),
  ('lab_tech','settings.personal.manage'),

  -- ===== LAB SENIOR / PATHOLOGIST (inherits lab_tech scope + more) =====
  ('lab_senior','patients.search'), ('lab_senior','lab.order.view'),
  ('lab_senior','lab.specimen.collect'), ('lab_senior','lab.test.process'),
  ('lab_senior','lab.result.enter'), ('lab_senior','lab.result.validate'),
  ('lab_senior','lab.result.release'), ('lab_senior','lab.report.print'),
  ('lab_senior','lab.critical.flag'), ('lab_senior','lab.config.manage'),
  ('lab_senior','reports.department_wide.view'), ('lab_senior','settings.personal.manage'),

  -- ===== PHARMACIST =====
  ('pharmacist','patients.search'), ('pharmacist','pharmacy.prescription.view'),
  ('pharmacist','pharmacy.prescription.verify'), ('pharmacist','pharmacy.stock.view'),
  ('pharmacist','pharmacy.dispense'), ('pharmacist','pharmacy.returns.handle'),
  ('pharmacist','pharmacy.stock.adjust'), ('pharmacist','reports.own_department.view'),
  ('pharmacist','settings.personal.manage'),

  -- ===== PHARMACY MANAGER =====
  ('pharmacy_manager','patients.search'), ('pharmacy_manager','pharmacy.prescription.view'),
  ('pharmacy_manager','pharmacy.stock.view'), ('pharmacy_manager','pharmacy.stock.adjust.approve'),
  ('pharmacy_manager','pharmacy.formulary.manage'), ('pharmacy_manager','pharmacy.transfer.approve'),
  ('pharmacy_manager','reports.department_wide.view'), ('pharmacy_manager','settings.personal.manage'),

  -- ===== STOREKEEPER =====
  ('storekeeper','inventory.receive'), ('storekeeper','inventory.issue'),
  ('storekeeper','inventory.stock_count'), ('storekeeper','inventory.transfer'),
  ('storekeeper','inventory.requisition.create'), ('storekeeper','inventory.reports.view'),
  ('storekeeper','settings.personal.manage'),

  -- ===== PROCUREMENT OFFICER =====
  ('procurement_officer','inventory.requisition.create'), ('procurement_officer','inventory.purchase_order.create'),
  ('procurement_officer','inventory.supplier.manage'), ('procurement_officer','inventory.reports.view'),
  ('procurement_officer','settings.personal.manage'),

  -- ===== INVENTORY MANAGER =====
  ('inventory_manager','inventory.adjustment.approve'), ('inventory_manager','inventory.reconcile'),
  ('inventory_manager','inventory.transfer'), ('inventory_manager','inventory.reports.view'),
  ('inventory_manager','reports.department_wide.view'), ('inventory_manager','settings.personal.manage'),

  -- ===== CASHIER =====
  ('cashier','billing.invoice.generate'), ('cashier','billing.payment.receive'),
  ('cashier','billing.receipt.print'), ('cashier','billing.refund.process'),
  ('cashier','billing.drawer.close'), ('cashier','reports.own_department.view'),
  ('cashier','settings.personal.manage'),

  -- ===== FINANCE OFFICER =====
  ('finance_officer','billing.transactions.review'), ('finance_officer','billing.reconcile'),
  ('finance_officer','billing.reports.view'), ('finance_officer','reports.financial.view'),
  ('finance_officer','settings.personal.manage'),

  -- ===== FINANCE MANAGER =====
  ('finance_manager','billing.refund.approve'), ('finance_manager','billing.reconcile.approve'),
  ('finance_manager','billing.financial_adjustment'), ('finance_manager','billing.reports.view'),
  ('finance_manager','reports.financial.view'), ('finance_manager','settings.personal.manage'),

  -- ===== WARD CLERK =====
  ('ward_clerk','inpatient.admission.register'), ('ward_clerk','inpatient.bed.assign'),
  ('ward_clerk','inpatient.ward.census.view'), ('ward_clerk','inpatient.transfer'),
  ('ward_clerk','inpatient.discharge.process'), ('ward_clerk','settings.personal.manage'),

  -- ===== INPATIENT MANAGER =====
  ('inpatient_manager','inpatient.capacity.manage'), ('inpatient_manager','inpatient.bed.assign'),
  ('inpatient_manager','inpatient.transfer'), ('inpatient_manager','inpatient.ward.census.view'),
  ('inpatient_manager','reports.department_wide.view'), ('inpatient_manager','settings.personal.manage'),

  -- ===== EMERGENCY MANAGER =====
  ('emergency_manager','emergency.department.oversight'), ('emergency_manager','reports.department_wide.view'),
  ('emergency_manager','settings.personal.manage'),

  -- ===== HR OFFICER =====
  ('hr_officer','hr.staff_records.manage'), ('hr_officer','hr.leave.manage'),
  ('hr_officer','hr.attendance.manage'), ('hr_officer','hr.reports.view'),
  ('hr_officer','settings.personal.manage'),

  -- ===== DEPARTMENT MANAGER (generic overlay; assign alongside a base role) =====
  ('department_manager','reports.department_wide.view'), ('department_manager','settings.department.manage'),
  ('department_manager','comms.department.broadcast'), ('department_manager','settings.personal.manage'),

  -- ===== SYSTEM ADMIN =====
  ('system_admin','users.manage'), ('system_admin','users.password_reset'),
  ('system_admin','users.role_assign'), ('system_admin','settings.operational.manage'),
  ('system_admin','settings.master_data.approved.manage'), ('system_admin','settings.integration.manage'),
  ('system_admin','audit.operational.view'), ('system_admin','security.account.disable'),
  ('system_admin','comms.system.broadcast'), ('system_admin','reports.technical.view'),
  ('system_admin','settings.personal.manage'),

  -- ===== SUPER ADMIN (full governance set) =====
  ('super_admin','users.manage'), ('super_admin','users.password_reset'),
  ('super_admin','users.role_assign'), ('super_admin','users.create_system_admin'),
  ('super_admin','users.create_super_admin'), ('super_admin','settings.rbac.manage'),
  ('super_admin','settings.security.manage'), ('super_admin','settings.module.activate'),
  ('super_admin','settings.facility.configure'), ('super_admin','settings.master_data.governance'),
  ('super_admin','settings.integration.credentials'), ('super_admin','settings.integration.manage'),
  ('super_admin','audit.comprehensive.view'), ('super_admin','audit.policy.configure'),
  ('super_admin','security.policy.configure'), ('super_admin','security.account.disable'),
  ('super_admin','comms.system.broadcast'), ('super_admin','reports.comprehensive.view'),
  ('super_admin','settings.personal.manage')
)
ON CONFLICT DO NOTHING;

COMMIT;

-- ============================================================
-- Notes:
-- 1. This migration is additive/idempotent (ON CONFLICT DO NOTHING),
--    safe to re-run.
-- 2. After running, backfill staff.role_id for existing users, e.g.:
--    UPDATE staff SET role_id = (SELECT id FROM roles WHERE name = 'doctor')
--    WHERE staff_id = '<some id>';
-- 3. Mappings above are a first pass from the role matrix — review
--    and adjust per-permission before going live, especially around
--    financial approvals and audit access.
-- ============================================================
