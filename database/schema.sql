-- ============================================================
-- WEBUYE WEST HOSPITAL MANAGEMENT SYSTEM
-- PostgreSQL Database Schema
-- Neon Console Ready
-- Version: 1.0
-- ============================================================

-- ============================================================
-- SECTION 0: EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================
-- SECTION 1: LOOKUP / REFERENCE TABLES
-- (These have no foreign key dependencies — create first)
-- ============================================================

-- 1.1 Counties
CREATE TABLE counties (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE
);

-- 1.2 Wards (Administrative wards, not hospital wards)
CREATE TABLE sub_counties (
    id          SERIAL PRIMARY KEY,
    county_id   INT NOT NULL REFERENCES counties(id),
    name        VARCHAR(100) NOT NULL
);

-- 1.3 Hospital Departments
CREATE TABLE departments (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(20)  NOT NULL UNIQUE,  -- e.g. OPD, LAB, PHARM, MCH
    name        VARCHAR(100) NOT NULL,
    category    VARCHAR(50)  NOT NULL          -- CLINICAL | ADMINISTRATIVE | SUPPORT
);

-- 1.4 Staff Roles
CREATE TABLE roles (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(80)  NOT NULL UNIQUE,  -- Doctor, Nurse, Pharmacist, etc.
    description TEXT
);

-- 1.5 Drug Categories
CREATE TABLE drug_categories (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE
);

-- 1.6 Test Categories (Lab)
CREATE TABLE test_categories (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE   -- Haematology, Biochemistry, etc.
);

-- 1.7 Ward Types (Hospital wards)
CREATE TABLE ward_types (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(80)  NOT NULL UNIQUE   -- General, Maternity, Paediatric, ICU
);

-- 1.8 Payment Methods
CREATE TABLE payment_methods (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(80)  NOT NULL UNIQUE   -- Cash, M-Pesa, NHIF, Insurance, Credit
);

-- 1.9 Insurance Providers
CREATE TABLE insurance_providers (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    code        VARCHAR(30),
    contact     VARCHAR(50)
);

-- 1.10 Diagnosis Catalog (ICD codes)
CREATE TABLE diagnosis_catalog (
    id          SERIAL PRIMARY KEY,
    icd_code    VARCHAR(20)  UNIQUE,
    name        VARCHAR(255) NOT NULL,
    category    VARCHAR(100)
);

-- 1.11 Procedure Catalog
CREATE TABLE procedure_catalog (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    category    VARCHAR(100),
    base_price  NUMERIC(10,2) DEFAULT 0
);

-- 1.12 FP Methods
CREATE TABLE fp_methods (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE   -- DMPA, Implant, IUCD, COC, etc.
);

-- 1.13 Immunization Schedule
CREATE TABLE vaccines (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    schedule_weeks INT,                        -- weeks of age given
    doses_required INT DEFAULT 1
);


-- ============================================================
-- SECTION 2: STAFF & USERS
-- ============================================================

-- 2.1 Staff
CREATE TABLE staff (
    id              SERIAL PRIMARY KEY,
    staff_no        VARCHAR(20)  NOT NULL UNIQUE,  -- e.g. S001
    first_name      VARCHAR(80)  NOT NULL,
    last_name       VARCHAR(80)  NOT NULL,
    gender          VARCHAR(10),
    date_of_birth   DATE,
    national_id     VARCHAR(30)  UNIQUE,
    phone           VARCHAR(20),
    email           VARCHAR(120) UNIQUE,
    department_id   INT REFERENCES departments(id),
    role_id         INT REFERENCES roles(id),
    shift           VARCHAR(20)  DEFAULT 'Day',    -- Day | Night | Rotating
    hire_date       DATE,
    status          VARCHAR(20)  DEFAULT 'Active', -- Active | Inactive | On Leave
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

-- 2.2 System Users (linked to staff)
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    staff_id        INT          UNIQUE REFERENCES staff(id) ON DELETE CASCADE,
    username        VARCHAR(60)  NOT NULL UNIQUE,
    password_hash   TEXT         NOT NULL,           -- bcrypt hash
    role_id         INT          REFERENCES roles(id),
    is_active       BOOLEAN      DEFAULT TRUE,
    last_login      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

-- 2.3 Attendance
CREATE TABLE attendance (
    id              SERIAL PRIMARY KEY,
    staff_id        INT          NOT NULL REFERENCES staff(id),
    clock_in        TIMESTAMPTZ  NOT NULL,
    clock_out       TIMESTAMPTZ,
    date            DATE         NOT NULL DEFAULT CURRENT_DATE,
    notes           TEXT
);


-- ============================================================
-- SECTION 3: PATIENTS & FAMILY ACCOUNTS
-- ============================================================

-- 3.1 Family Accounts
CREATE TABLE family_accounts (
    id              SERIAL PRIMARY KEY,
    main_phone      VARCHAR(20)  NOT NULL UNIQUE,   -- THE key identifier
    account_name    VARCHAR(160) NOT NULL,           -- head of family full name
    county_id       INT          REFERENCES counties(id),
    created_at      TIMESTAMPTZ  DEFAULT NOW()
);

-- 3.2 Patients (Central Patient Record)
CREATE TABLE patients (
    id              SERIAL PRIMARY KEY,
    patient_no      VARCHAR(20)  NOT NULL UNIQUE,   -- e.g. P0001
    first_name      VARCHAR(80)  NOT NULL,
    last_name       VARCHAR(80)  NOT NULL,
    other_names     VARCHAR(80),
    gender          VARCHAR(15)  NOT NULL,           -- Male | Female | Other
    date_of_birth   DATE,
    national_id     VARCHAR(30)  UNIQUE,
    phone           VARCHAR(20),
    email           VARCHAR(120),
    county_id       INT          REFERENCES counties(id),
    sub_county_id   INT          REFERENCES sub_counties(id),
    village         VARCHAR(100),
    -- Family account linkage
    family_account_id   INT      REFERENCES family_accounts(id),
    relationship    VARCHAR(50)  DEFAULT 'Self',    -- Self | Child | Spouse | Parent | Sibling
    is_family_head  BOOLEAN      DEFAULT FALSE,
    -- Clinical flags
    blood_group     VARCHAR(5),                     -- A+, B-, O+, AB+ etc.
    allergies       TEXT,                           -- free text
    chronic_conditions TEXT,
    -- Next of kin
    kin_name        VARCHAR(160),
    kin_phone       VARCHAR(20),
    kin_relationship VARCHAR(50),
    -- Metadata
    registered_by   INT          REFERENCES staff(id),
    is_deleted      BOOLEAN      DEFAULT FALSE,     -- soft delete
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

-- Index for fast search
CREATE INDEX idx_patients_phone      ON patients(phone);
CREATE INDEX idx_patients_national_id ON patients(national_id);
CREATE INDEX idx_patients_patient_no  ON patients(patient_no);
CREATE INDEX idx_patients_family      ON patients(family_account_id);
CREATE INDEX idx_patients_name        ON patients(first_name, last_name);


-- ============================================================
-- SECTION 4: VISITS
-- ============================================================

-- 4.1 Visits (every encounter begins here at Reception)
CREATE TABLE visits (
    id              SERIAL PRIMARY KEY,
    visit_no        VARCHAR(20)  NOT NULL UNIQUE,   -- e.g. V-2026-00001
    patient_id      INT          NOT NULL REFERENCES patients(id),
    visit_type      VARCHAR(30)  NOT NULL DEFAULT 'New',  -- New | Revisit | Emergency
    patient_type    VARCHAR(20)  NOT NULL DEFAULT 'Outpatient', -- Outpatient | Inpatient
    visit_date      DATE         NOT NULL DEFAULT CURRENT_DATE,
    visit_time      TIME         NOT NULL DEFAULT CURRENT_TIME,
    -- Workflow tracking
    current_stage   VARCHAR(50)  DEFAULT 'Reception',
    -- Reception → Triage → Consultation → Investigation → Procedure → Pharmacy → Discharged
    status          VARCHAR(30)  DEFAULT 'Active',  -- Active | Completed | Admitted | Discharged | Transferred
    -- Assignment
    attending_doctor_id INT      REFERENCES staff(id),
    referred_from   VARCHAR(100),                   -- if referred from another facility
    referred_to     VARCHAR(100),
    -- Reception
    received_by     INT          REFERENCES staff(id),
    directed_to     VARCHAR(80),                    -- which dept they were directed to
    -- Discharge
    discharge_date  DATE,
    discharge_notes TEXT,
    discharged_by   INT          REFERENCES staff(id),
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX idx_visits_patient    ON visits(patient_id);
CREATE INDEX idx_visits_date       ON visits(visit_date);
CREATE INDEX idx_visits_status     ON visits(status);

-- 4.2 Visit Stage History (audit trail of patient movement)
CREATE TABLE visit_stage_log (
    id              SERIAL PRIMARY KEY,
    visit_id        INT          NOT NULL REFERENCES visits(id),
    from_stage      VARCHAR(50),
    to_stage        VARCHAR(50)  NOT NULL,
    moved_by        INT          REFERENCES staff(id),
    moved_at        TIMESTAMPTZ  DEFAULT NOW(),
    notes           TEXT
);


-- ============================================================
-- SECTION 5: TRIAGE
-- ============================================================

CREATE TABLE triage (
    id              SERIAL PRIMARY KEY,
    visit_id        INT          NOT NULL UNIQUE REFERENCES visits(id),
    patient_id      INT          NOT NULL REFERENCES patients(id),
    -- Vitals
    temperature     NUMERIC(5,2),                   -- °C
    blood_pressure_systolic  INT,
    blood_pressure_diastolic INT,
    pulse_rate      INT,                            -- bpm
    respiratory_rate INT,
    oxygen_saturation NUMERIC(5,2),                 -- SpO2 %
    weight_kg       NUMERIC(6,2),
    height_cm       NUMERIC(6,2),
    bmi             NUMERIC(5,2) GENERATED ALWAYS AS (
                        CASE WHEN height_cm > 0
                        THEN ROUND(weight_kg / POWER(height_cm/100.0, 2), 2)
                        ELSE NULL END
                    ) STORED,
    muac_cm         NUMERIC(5,2),                   -- for children
    -- Priority
    priority        VARCHAR(20)  DEFAULT 'Normal',  -- Emergency | Urgent | High | Normal | Low
    chief_complaint TEXT,
    triaged_by      INT          REFERENCES staff(id),
    triaged_at      TIMESTAMPTZ  DEFAULT NOW()
);


-- ============================================================
-- SECTION 6: CONSULTATION
-- ============================================================

CREATE TABLE consultations (
    id              SERIAL PRIMARY KEY,
    visit_id        INT          NOT NULL REFERENCES visits(id),
    patient_id      INT          NOT NULL REFERENCES patients(id),
    -- History
    chief_complaint TEXT         NOT NULL,
    history_of_presenting_illness TEXT,
    past_medical_history TEXT,
    family_history  TEXT,
    social_history  TEXT,
    review_of_systems TEXT,
    -- Examination
    general_examination TEXT,
    systemic_examination TEXT,
    -- Assessment
    working_diagnosis TEXT,
    differential_diagnosis TEXT,
    -- Plan
    management_plan TEXT,
    -- Referrals
    referred_to_dept INT         REFERENCES departments(id),
    referral_notes  TEXT,
    -- Doctor
    doctor_id       INT          NOT NULL REFERENCES staff(id),
    consultation_date DATE       DEFAULT CURRENT_DATE,
    consultation_time TIME       DEFAULT CURRENT_TIME,
    follow_up_date  DATE,
    created_at      TIMESTAMPTZ  DEFAULT NOW()
);

-- 6.2 Consultation Diagnoses (one consultation can have many diagnoses)
CREATE TABLE consultation_diagnoses (
    id              SERIAL PRIMARY KEY,
    consultation_id INT          NOT NULL REFERENCES consultations(id),
    diagnosis_id    INT          REFERENCES diagnosis_catalog(id),
    diagnosis_text  VARCHAR(255),                   -- free text if not in catalog
    diagnosis_type  VARCHAR(20)  DEFAULT 'Primary', -- Primary | Secondary | Differential
    created_at      TIMESTAMPTZ  DEFAULT NOW()
);

-- 6.3 Procedures ordered during consultation
CREATE TABLE consultation_procedures (
    id              SERIAL PRIMARY KEY,
    consultation_id INT          NOT NULL REFERENCES consultations(id),
    procedure_id    INT          REFERENCES procedure_catalog(id),
    notes           TEXT,
    status          VARCHAR(20)  DEFAULT 'Ordered', -- Ordered | Completed
    done_by         INT          REFERENCES staff(id),
    done_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  DEFAULT NOW()
);


-- ============================================================
-- SECTION 7: LABORATORY
-- ============================================================

-- 7.1 Lab Tests Catalog
CREATE TABLE lab_tests (
    id              SERIAL PRIMARY KEY,
    code            VARCHAR(20)  UNIQUE,
    name            VARCHAR(200) NOT NULL,
    category_id     INT          REFERENCES test_categories(id),
    normal_range    VARCHAR(100),
    unit            VARCHAR(30),
    price           NUMERIC(10,2) DEFAULT 0,
    sample_type     VARCHAR(50),                    -- Blood | Urine | Stool | Sputum etc.
    turnaround_hours INT          DEFAULT 2,
    is_active       BOOLEAN      DEFAULT TRUE
);

-- 7.2 Lab Requests
CREATE TABLE lab_requests (
    id              SERIAL PRIMARY KEY,
    request_no      VARCHAR(20)  NOT NULL UNIQUE,   -- e.g. LAB-2026-00001
    visit_id        INT          REFERENCES visits(id),    -- NULL for walk-in
    patient_id      INT          NOT NULL REFERENCES patients(id),
    requested_by    INT          REFERENCES staff(id),     -- NULL for walk-in self
    is_walkin       BOOLEAN      DEFAULT FALSE,
    priority        VARCHAR(20)  DEFAULT 'Normal',  -- Normal | Urgent | Critical
    clinical_notes  TEXT,
    status          VARCHAR(30)  DEFAULT 'Pending', -- Pending | Processing | Ready | Cancelled
    requested_at    TIMESTAMPTZ  DEFAULT NOW(),
    received_at     TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    received_by     INT          REFERENCES staff(id)
);

-- 7.3 Lab Request Items (tests per request)
CREATE TABLE lab_request_items (
    id              SERIAL PRIMARY KEY,
    lab_request_id  INT          NOT NULL REFERENCES lab_requests(id),
    test_id         INT          NOT NULL REFERENCES lab_tests(id),
    status          VARCHAR(30)  DEFAULT 'Pending',
    -- Result
    result_value    TEXT,
    result_flag     VARCHAR(20),                    -- Normal | Low | High | Critical
    result_notes    TEXT,
    entered_by      INT          REFERENCES staff(id),
    entered_at      TIMESTAMPTZ,
    verified_by     INT          REFERENCES staff(id),
    verified_at     TIMESTAMPTZ
);

-- 7.4 Lab Inventory (reagents, consumables, equipment)
CREATE TABLE lab_inventory (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    category        VARCHAR(80),                    -- Reagent | Consumable | Equipment
    quantity        NUMERIC(10,2) DEFAULT 0,
    unit            VARCHAR(30),
    min_quantity    NUMERIC(10,2) DEFAULT 0,
    batch_no        VARCHAR(50),
    expiry_date     DATE,
    supplier        VARCHAR(100),
    last_restocked  DATE,
    notes           TEXT,
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  DEFAULT NOW()
);


-- ============================================================
-- SECTION 8: PHARMACY
-- ============================================================

-- 8.1 Drugs / Medicines Master
CREATE TABLE drugs (
    id              SERIAL PRIMARY KEY,
    code            VARCHAR(30)  UNIQUE,
    generic_name    VARCHAR(200) NOT NULL,
    brand_name      VARCHAR(200),
    category_id     INT          REFERENCES drug_categories(id),
    strength        VARCHAR(50),                    -- e.g. 500mg, 250mg/5ml
    dosage_form     VARCHAR(50),                    -- Tablet | Capsule | Syrup | Injection
    unit_of_measure VARCHAR(30)  DEFAULT 'Tablet',
    is_active       BOOLEAN      DEFAULT TRUE,
    created_at      TIMESTAMPTZ  DEFAULT NOW()
);

-- 8.2 Drug Stock (per store/location)
CREATE TABLE drug_stock (
    id              SERIAL PRIMARY KEY,
    drug_id         INT          NOT NULL REFERENCES drugs(id),
    store           VARCHAR(30)  NOT NULL DEFAULT 'Main',  -- Main | Central
    batch_no        VARCHAR(50),
    quantity        NUMERIC(10,2) NOT NULL DEFAULT 0,
    min_quantity    NUMERIC(10,2) DEFAULT 50,
    expiry_date     DATE,
    unit_cost       NUMERIC(10,2) DEFAULT 0,
    selling_price   NUMERIC(10,2) DEFAULT 0,
    supplier        VARCHAR(100),
    date_received   DATE         DEFAULT CURRENT_DATE,
    received_by     INT          REFERENCES staff(id),
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX idx_drug_stock_drug   ON drug_stock(drug_id);
CREATE INDEX idx_drug_stock_store  ON drug_stock(store);
CREATE INDEX idx_drug_stock_expiry ON drug_stock(expiry_date);

-- 8.3 Prescriptions
CREATE TABLE prescriptions (
    id              SERIAL PRIMARY KEY,
    prescription_no VARCHAR(20)  NOT NULL UNIQUE,   -- e.g. RX-2026-00001
    visit_id        INT          REFERENCES visits(id),
    patient_id      INT          NOT NULL REFERENCES patients(id),
    consultation_id INT          REFERENCES consultations(id),
    prescribed_by   INT          NOT NULL REFERENCES staff(id),
    status          VARCHAR(30)  DEFAULT 'Pending', -- Pending | Partial | Dispensed | Cancelled
    notes           TEXT,
    prescribed_at   TIMESTAMPTZ  DEFAULT NOW()
);

-- 8.4 Prescription Items
CREATE TABLE prescription_items (
    id              SERIAL PRIMARY KEY,
    prescription_id INT          NOT NULL REFERENCES prescriptions(id),
    drug_id         INT          NOT NULL REFERENCES drugs(id),
    quantity        NUMERIC(10,2) NOT NULL,
    dosage          VARCHAR(100),                   -- e.g. 1 tablet TDS
    frequency       VARCHAR(50),                    -- TDS | BD | OD | QID | PRN
    duration        VARCHAR(50),                    -- e.g. 5 days, 1 week
    route           VARCHAR(30)  DEFAULT 'Oral',    -- Oral | IV | IM | Topical
    instructions    TEXT,
    -- Dispensing
    status          VARCHAR(30)  DEFAULT 'Pending',
    quantity_dispensed NUMERIC(10,2) DEFAULT 0,
    dispensed_by    INT          REFERENCES staff(id),
    dispensed_at    TIMESTAMPTZ,
    drug_stock_id   INT          REFERENCES drug_stock(id)
);

-- 8.5 Drug Stock Movements (full audit trail)
CREATE TABLE stock_movements (
    id              SERIAL PRIMARY KEY,
    drug_stock_id   INT          NOT NULL REFERENCES drug_stock(id),
    drug_id         INT          NOT NULL REFERENCES drugs(id),
    movement_type   VARCHAR(30)  NOT NULL,
    -- RECEIVED | DISPENSED | TRANSFERRED_IN | TRANSFERRED_OUT
    -- ADJUSTED | EXPIRED | RETURNED | DEPT_ISSUE | POS_SALE
    quantity        NUMERIC(10,2) NOT NULL,         -- positive = in, negative = out
    balance_after   NUMERIC(10,2),
    reference_no    VARCHAR(50),                    -- prescription no / transfer no / GRN no
    from_store      VARCHAR(30),
    to_store        VARCHAR(30),
    performed_by    INT          REFERENCES staff(id),
    notes           TEXT,
    movement_at     TIMESTAMPTZ  DEFAULT NOW()
);

-- 8.6 Stock Transfers (Central → Main)
CREATE TABLE stock_transfers (
    id              SERIAL PRIMARY KEY,
    transfer_no     VARCHAR(20)  NOT NULL UNIQUE,
    from_store      VARCHAR(30)  NOT NULL,
    to_store        VARCHAR(30)  NOT NULL,
    requested_by    INT          REFERENCES staff(id),
    approved_by     INT          REFERENCES staff(id),
    status          VARCHAR(20)  DEFAULT 'Pending', -- Pending | Approved | Rejected | Completed
    notes           TEXT,
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);

CREATE TABLE stock_transfer_items (
    id              SERIAL PRIMARY KEY,
    transfer_id     INT          NOT NULL REFERENCES stock_transfers(id),
    drug_id         INT          NOT NULL REFERENCES drugs(id),
    quantity        NUMERIC(10,2) NOT NULL,
    actual_quantity NUMERIC(10,2)                   -- confirmed quantity on completion
);

-- 8.7 Pharmacy POS (walk-in sales)
CREATE TABLE pharmacy_pos_sales (
    id              SERIAL PRIMARY KEY,
    sale_no         VARCHAR(20)  NOT NULL UNIQUE,
    customer_name   VARCHAR(160) DEFAULT 'Walk-in',
    customer_phone  VARCHAR(20),
    patient_id      INT          REFERENCES patients(id),  -- NULL for walk-ins
    total_amount    NUMERIC(10,2) NOT NULL,
    amount_paid     NUMERIC(10,2) DEFAULT 0,
    payment_method_id INT        REFERENCES payment_methods(id),
    served_by       INT          REFERENCES staff(id),
    sale_at         TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE pharmacy_pos_sale_items (
    id              SERIAL PRIMARY KEY,
    sale_id         INT          NOT NULL REFERENCES pharmacy_pos_sales(id),
    drug_id         INT          NOT NULL REFERENCES drugs(id),
    drug_stock_id   INT          REFERENCES drug_stock(id),
    quantity        NUMERIC(10,2) NOT NULL,
    unit_price      NUMERIC(10,2) NOT NULL,
    subtotal        NUMERIC(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);


-- ============================================================
-- SECTION 9: INPATIENT
-- ============================================================

-- 9.1 Hospital Wards
CREATE TABLE wards (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(80)  NOT NULL UNIQUE,   -- Ward A, Maternity, ICU
    ward_type_id    INT          REFERENCES ward_types(id),
    total_beds      INT          NOT NULL DEFAULT 0,
    department_id   INT          REFERENCES departments(id),
    is_active       BOOLEAN      DEFAULT TRUE
);

-- 9.2 Beds
CREATE TABLE beds (
    id              SERIAL PRIMARY KEY,
    bed_no          VARCHAR(20)  NOT NULL,           -- e.g. A-01, B-04
    ward_id         INT          NOT NULL REFERENCES wards(id),
    status          VARCHAR(20)  DEFAULT 'Available', -- Available | Occupied | Reserved | Maintenance
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE(bed_no, ward_id)
);

-- 9.3 Admissions
CREATE TABLE admissions (
    id              SERIAL PRIMARY KEY,
    admission_no    VARCHAR(20)  NOT NULL UNIQUE,   -- e.g. ADM-2026-00001
    patient_id      INT          NOT NULL REFERENCES patients(id),
    visit_id        INT          NOT NULL REFERENCES visits(id),
    ward_id         INT          NOT NULL REFERENCES wards(id),
    bed_id          INT          NOT NULL REFERENCES beds(id),
    -- Admission details
    admission_date  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    admitting_doctor_id INT      NOT NULL REFERENCES staff(id),
    admission_diagnosis TEXT,
    admission_notes TEXT,
    -- Discharge
    discharge_date  TIMESTAMPTZ,
    discharge_diagnosis TEXT,
    discharge_notes TEXT,
    discharge_condition VARCHAR(50),               -- Improved | Recovered | Deceased | Transferred | LAMA
    discharged_by   INT          REFERENCES staff(id),
    -- Status
    status          VARCHAR(20)  DEFAULT 'Admitted', -- Admitted | Discharged | Transferred | Deceased
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

-- 9.4 Nursing Notes
CREATE TABLE nursing_notes (
    id              SERIAL PRIMARY KEY,
    admission_id    INT          NOT NULL REFERENCES admissions(id),
    patient_id      INT          NOT NULL REFERENCES patients(id),
    note_type       VARCHAR(50)  DEFAULT 'Progress', -- Progress | Handover | Observation | Incident
    note            TEXT         NOT NULL,
    vitals_temp     NUMERIC(5,2),
    vitals_bp       VARCHAR(20),
    vitals_pulse    INT,
    vitals_spo2     NUMERIC(5,2),
    written_by      INT          NOT NULL REFERENCES staff(id),
    written_at      TIMESTAMPTZ  DEFAULT NOW()
);

-- 9.5 Ward Drug Issues (pharmacy → ward)
CREATE TABLE ward_drug_issues (
    id              SERIAL PRIMARY KEY,
    issue_no        VARCHAR(20)  NOT NULL UNIQUE,
    ward_id         INT          NOT NULL REFERENCES wards(id),
    requested_by    INT          REFERENCES staff(id),
    issued_by       INT          REFERENCES staff(id),
    status          VARCHAR(20)  DEFAULT 'Pending',  -- Pending | Issued | Rejected
    issued_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE ward_drug_issue_items (
    id              SERIAL PRIMARY KEY,
    issue_id        INT          NOT NULL REFERENCES ward_drug_issues(id),
    drug_id         INT          NOT NULL REFERENCES drugs(id),
    quantity_requested NUMERIC(10,2),
    quantity_issued NUMERIC(10,2)
);


-- ============================================================
-- SECTION 10: MCH MODULE
-- ============================================================

-- 10.1 ANC Register
CREATE TABLE anc_register (
    id              SERIAL PRIMARY KEY,
    patient_id      INT          NOT NULL REFERENCES patients(id),
    visit_id        INT          NOT NULL REFERENCES visits(id),
    -- Obstetric history
    gravidity       INT,                            -- number of pregnancies
    parity          INT,                            -- number of deliveries
    lmp             DATE,                           -- last menstrual period
    edd             DATE,                           -- expected date of delivery
    edd_method      VARCHAR(30),                    -- LMP | Ultrasound
    gestational_age_weeks INT,
    -- Risk assessment
    risk_level      VARCHAR(20)  DEFAULT 'Low',     -- Low | Moderate | High
    risk_factors    TEXT,
    -- Current visit
    visit_number    INT          DEFAULT 1,
    blood_pressure  VARCHAR(20),
    weight_kg       NUMERIC(6,2),
    fundal_height   NUMERIC(5,2),
    fetal_heart_rate INT,
    presentation    VARCHAR(30),                    -- Cephalic | Breech | Transverse
    -- Tests
    hb_level        NUMERIC(5,2),
    blood_group     VARCHAR(5),
    hiv_status      VARCHAR(20),                    -- Negative | Positive | Unknown
    syphilis_status VARCHAR(20),
    malaria_prophylaxis BOOLEAN  DEFAULT FALSE,
    tt_status       VARCHAR(30),                    -- immunization status
    -- Supplements
    iron_folic_given BOOLEAN     DEFAULT FALSE,
    -- Provider
    provider_id     INT          REFERENCES staff(id),
    next_visit_date DATE,
    notes           TEXT,
    visit_date      DATE         DEFAULT CURRENT_DATE,
    created_at      TIMESTAMPTZ  DEFAULT NOW()
);

-- 10.2 PNC Register
CREATE TABLE pnc_register (
    id              SERIAL PRIMARY KEY,
    patient_id      INT          NOT NULL REFERENCES patients(id),
    visit_id        INT          NOT NULL REFERENCES visits(id),
    delivery_date   DATE,
    delivery_mode   VARCHAR(30),                    -- SVD | CS | Assisted
    delivery_place  VARCHAR(100),
    -- Mother review
    mother_condition VARCHAR(50),
    breast_examination TEXT,
    uterus_involution TEXT,
    lochia          VARCHAR(50),
    wound_status    VARCHAR(50),
    -- Baby review
    baby_name       VARCHAR(160),
    baby_weight_kg  NUMERIC(5,3),
    baby_condition  VARCHAR(50),
    breastfeeding   BOOLEAN,
    -- FP counseling
    fp_counseled    BOOLEAN      DEFAULT FALSE,
    fp_method_chosen INT         REFERENCES fp_methods(id),
    -- Provider
    provider_id     INT          REFERENCES staff(id),
    visit_number    INT          DEFAULT 1,
    next_visit_date DATE,
    notes           TEXT,
    visit_date      DATE         DEFAULT CURRENT_DATE,
    created_at      TIMESTAMPTZ  DEFAULT NOW()
);

-- 10.3 Family Planning Register
CREATE TABLE fp_register (
    id              SERIAL PRIMARY KEY,
    patient_id      INT          NOT NULL REFERENCES patients(id),
    visit_id        INT          NOT NULL REFERENCES visits(id),
    fp_method_id    INT          NOT NULL REFERENCES fp_methods(id),
    visit_type      VARCHAR(30)  DEFAULT 'New',     -- New | Revisit | Change | Discontinue
    -- For hormonal methods
    date_issued     DATE         DEFAULT CURRENT_DATE,
    next_visit_date DATE,
    -- Counseling
    counseling_done BOOLEAN      DEFAULT FALSE,
    side_effects    TEXT,
    reason_for_change TEXT,
    -- Provider
    provider_id     INT          REFERENCES staff(id),
    notes           TEXT,
    visit_date      DATE         DEFAULT CURRENT_DATE,
    created_at      TIMESTAMPTZ  DEFAULT NOW()
);

-- 10.4 Child Welfare Clinic (CWC) Register
CREATE TABLE cwc_register (
    id              SERIAL PRIMARY KEY,
    patient_id      INT          NOT NULL REFERENCES patients(id), -- the child
    mother_id       INT          REFERENCES patients(id),          -- the mother
    visit_id        INT          NOT NULL REFERENCES visits(id),
    -- Growth monitoring
    weight_kg       NUMERIC(5,3),
    height_cm       NUMERIC(6,2),
    muac_cm         NUMERIC(5,2),
    nutritional_status VARCHAR(30),                -- Normal | MAM | SAM
    -- Immunization given this visit
    vaccines_given  TEXT,                          -- comma-separated vaccine names
    -- Deworming
    deworming_given BOOLEAN      DEFAULT FALSE,
    vitamin_a_given BOOLEAN      DEFAULT FALSE,
    -- Development
    developmental_milestone TEXT,
    -- Provider
    provider_id     INT          REFERENCES staff(id),
    next_visit_date DATE,
    notes           TEXT,
    visit_date      DATE         DEFAULT CURRENT_DATE,
    created_at      TIMESTAMPTZ  DEFAULT NOW()
);

-- 10.5 Immunization Log
CREATE TABLE immunization_log (
    id              SERIAL PRIMARY KEY,
    patient_id      INT          NOT NULL REFERENCES patients(id),
    visit_id        INT          REFERENCES visits(id),
    vaccine_id      INT          NOT NULL REFERENCES vaccines(id),
    dose_number     INT          DEFAULT 1,
    date_given      DATE         DEFAULT CURRENT_DATE,
    batch_no        VARCHAR(50),
    site            VARCHAR(30),                   -- Left arm | Right thigh | Oral
    given_by        INT          REFERENCES staff(id),
    next_dose_date  DATE,
    adverse_effects TEXT
);


-- ============================================================
-- SECTION 11: APPOINTMENTS
-- ============================================================

CREATE TABLE appointments (
    id              SERIAL PRIMARY KEY,
    appointment_no  VARCHAR(20)  NOT NULL UNIQUE,   -- e.g. APT-2026-00001
    patient_id      INT          NOT NULL REFERENCES patients(id),
    department_id   INT          REFERENCES departments(id),
    provider_id     INT          REFERENCES staff(id),
    appointment_date DATE        NOT NULL,
    appointment_time TIME,
    purpose         TEXT,
    -- Status
    status          VARCHAR(30)  DEFAULT 'Scheduled',
    -- Scheduled | Visited | Missed | LTFU | Rescheduled | Cancelled
    rescheduled_to  DATE,
    cancellation_reason TEXT,
    -- Family
    is_family_appointment BOOLEAN DEFAULT FALSE,
    family_account_id INT        REFERENCES family_accounts(id),
    -- Metadata
    booked_by       INT          REFERENCES staff(id),
    notes           TEXT,
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_date    ON appointments(appointment_date);
CREATE INDEX idx_appointments_status  ON appointments(status);


-- ============================================================
-- SECTION 12: BILLING & PAYMENTS
-- ============================================================

-- 12.1 Invoices
CREATE TABLE invoices (
    id              SERIAL PRIMARY KEY,
    invoice_no      VARCHAR(20)  NOT NULL UNIQUE,   -- e.g. INV-2026-00001
    patient_id      INT          NOT NULL REFERENCES patients(id),
    visit_id        INT          REFERENCES visits(id),
    family_account_id INT        REFERENCES family_accounts(id),  -- for consolidated billing
    invoice_date    DATE         DEFAULT CURRENT_DATE,
    due_date        DATE,
    -- Totals (auto-calculated from items)
    subtotal        NUMERIC(12,2) DEFAULT 0,
    discount        NUMERIC(12,2) DEFAULT 0,
    tax             NUMERIC(12,2) DEFAULT 0,
    total           NUMERIC(12,2) DEFAULT 0,
    amount_paid     NUMERIC(12,2) DEFAULT 0,
    balance         NUMERIC(12,2) GENERATED ALWAYS AS (total - amount_paid) STORED,
    -- Insurance
    insurance_provider_id INT    REFERENCES insurance_providers(id),
    insurance_claim_no VARCHAR(50),
    insurance_amount NUMERIC(12,2) DEFAULT 0,
    -- Status
    status          VARCHAR(20)  DEFAULT 'Pending', -- Pending | Partial | Paid | Cancelled | Waived
    -- Staff
    created_by      INT          REFERENCES staff(id),
    notes           TEXT,
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

-- 12.2 Invoice Line Items
CREATE TABLE invoice_items (
    id              SERIAL PRIMARY KEY,
    invoice_id      INT          NOT NULL REFERENCES invoices(id),
    service_type    VARCHAR(30)  NOT NULL,
    -- Consultation | Laboratory | Pharmacy | Procedure | Admission | Nursing | Other
    service_ref_id  INT,                            -- ID from the relevant service table
    description     VARCHAR(255) NOT NULL,
    quantity        NUMERIC(10,2) DEFAULT 1,
    unit_price      NUMERIC(10,2) NOT NULL,
    subtotal        NUMERIC(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

-- 12.3 Payments
CREATE TABLE payments (
    id              SERIAL PRIMARY KEY,
    payment_no      VARCHAR(20)  NOT NULL UNIQUE,   -- e.g. PAY-2026-00001
    invoice_id      INT          NOT NULL REFERENCES invoices(id),
    patient_id      INT          NOT NULL REFERENCES patients(id),
    amount          NUMERIC(12,2) NOT NULL,
    payment_method_id INT        NOT NULL REFERENCES payment_methods(id),
    -- M-Pesa specific
    mpesa_reference VARCHAR(50),
    -- Insurance specific
    insurance_provider_id INT    REFERENCES insurance_providers(id),
    -- Receipt
    receipt_no      VARCHAR(30)  UNIQUE,
    -- Cashier
    received_by     INT          NOT NULL REFERENCES staff(id),
    payment_date    DATE         DEFAULT CURRENT_DATE,
    payment_time    TIME         DEFAULT CURRENT_TIME,
    notes           TEXT,
    created_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX idx_payments_invoice  ON payments(invoice_id);
CREATE INDEX idx_payments_date     ON payments(payment_date);

-- 12.4 Cashier Sessions
CREATE TABLE cashier_sessions (
    id              SERIAL PRIMARY KEY,
    cashier_id      INT          NOT NULL REFERENCES staff(id),
    opened_at       TIMESTAMPTZ  DEFAULT NOW(),
    closed_at       TIMESTAMPTZ,
    opening_balance NUMERIC(12,2) DEFAULT 0,
    closing_balance NUMERIC(12,2),
    total_collected NUMERIC(12,2) DEFAULT 0,
    status          VARCHAR(20)  DEFAULT 'Open',   -- Open | Closed
    notes           TEXT
);

-- 12.5 Expenses
CREATE TABLE expenses (
    id              SERIAL PRIMARY KEY,
    category        VARCHAR(80)  NOT NULL,          -- Supplies | Utilities | Salaries | Other
    description     TEXT         NOT NULL,
    amount          NUMERIC(12,2) NOT NULL,
    payment_method_id INT        REFERENCES payment_methods(id),
    expense_date    DATE         DEFAULT CURRENT_DATE,
    approved_by     INT          REFERENCES staff(id),
    recorded_by     INT          REFERENCES staff(id),
    receipt_ref     VARCHAR(50),
    notes           TEXT,
    created_at      TIMESTAMPTZ  DEFAULT NOW()
);


-- ============================================================
-- SECTION 13: AUDIT & SYSTEM LOGS
-- ============================================================

-- 13.1 Audit Log (track every important action)
CREATE TABLE audit_log (
    id              BIGSERIAL PRIMARY KEY,
    user_id         INT          REFERENCES users(id),
    action          VARCHAR(50)  NOT NULL,          -- CREATE | UPDATE | DELETE | LOGIN | etc.
    table_name      VARCHAR(80),
    record_id       INT,
    old_values      JSONB,
    new_values      JSONB,
    ip_address      VARCHAR(45),
    user_agent      TEXT,
    performed_at    TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX idx_audit_user       ON audit_log(user_id);
CREATE INDEX idx_audit_table      ON audit_log(table_name);
CREATE INDEX idx_audit_performed  ON audit_log(performed_at);

-- 13.2 System Notifications
CREATE TABLE notifications (
    id              SERIAL PRIMARY KEY,
    type            VARCHAR(50),                    -- LOW_STOCK | EXPIRY | APPOINTMENT | LAB_READY
    title           VARCHAR(200) NOT NULL,
    message         TEXT,
    reference_table VARCHAR(80),
    reference_id    INT,
    is_read         BOOLEAN      DEFAULT FALSE,
    read_by         INT          REFERENCES users(id),
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  DEFAULT NOW()
);


-- ============================================================
-- SECTION 14: SEED DATA — Reference Tables
-- ============================================================

-- Departments
INSERT INTO departments (code, name, category) VALUES
    ('RECEPT',  'Reception',           'CLINICAL'),
    ('TRIAGE',  'Triage',              'CLINICAL'),
    ('OPD',     'Outpatient Department','CLINICAL'),
    ('IPD',     'Inpatient / Wards',   'CLINICAL'),
    ('LAB',     'Laboratory',          'CLINICAL'),
    ('PHARM',   'Pharmacy',            'CLINICAL'),
    ('MCH',     'MCH Clinic',          'CLINICAL'),
    ('THEATRE', 'Theatre / Procedures','CLINICAL'),
    ('DENTAL',  'Dental',              'CLINICAL'),
    ('RADIOL',  'Radiology',           'CLINICAL'),
    ('FINANCE', 'Finance / Billing',   'ADMINISTRATIVE'),
    ('ADMIN',   'Administration',      'ADMINISTRATIVE'),
    ('STORE',   'Central Store',       'SUPPORT'),
    ('IT',      'IT / Systems',        'SUPPORT');

-- Roles
INSERT INTO roles (name) VALUES
    ('Admin'),('Doctor'),('Nurse'),('Pharmacist'),
    ('Lab Technician'),('Receptionist'),('Cashier'),
    ('Records Officer'),('Storekeeper'),('Radiographer');

-- Drug Categories
INSERT INTO drug_categories (name) VALUES
    ('Antibiotics'),('Analgesics / NSAIDs'),('Antiparasitic / Antimalarials'),
    ('Antihypertensives'),('Antiretrovirals'),('Vitamins & Supplements'),
    ('Rehydration'),('Antihistamines'),('Antifungals'),('Vaccines'),
    ('Hormones & Contraceptives'),('Gastrointestinal'),('Respiratory'),
    ('Cardiovascular'),('Dermatologicals'),('Eye / Ear Drops'),('Other');

-- Test Categories
INSERT INTO test_categories (name) VALUES
    ('Haematology'),('Biochemistry'),('Microbiology'),
    ('Parasitology'),('Serology / Immunology'),
    ('Urinalysis'),('Histopathology'),('Other');

-- Ward Types
INSERT INTO ward_types (name) VALUES
    ('General'),('Female'),('Male'),
    ('Maternity'),('Paediatric'),('ICU'),
    ('Surgical'),('Isolation');

-- Payment Methods
INSERT INTO payment_methods (name) VALUES
    ('Cash'),('M-Pesa'),('NHIF'),
    ('Insurance'),('Credit'),('Waiver'),('Other');

-- Insurance Providers
INSERT INTO insurance_providers (name, code) VALUES
    ('NHIF', 'NHIF'),('AAR Healthcare', 'AAR'),
    ('CIC Insurance', 'CIC'),('Jubilee Insurance', 'JUB'),
    ('ICEA Lion', 'ICEA'),('Britam', 'BRIT'),
    ('Resolution Insurance', 'RES');

-- FP Methods
INSERT INTO fp_methods (name) VALUES
    ('DMPA Injectable'),('Combined Oral Contraceptive (COC)'),
    ('Progestogen Only Pill (POP)'),('Implant (Jadelle / Implanon)'),
    ('IUCD (Copper T)'),('Male Condoms'),('Female Condoms'),
    ('Tubal Ligation'),('Vasectomy'),('NFP / LAM'),('Emergency Contraception');

-- Common Vaccines
INSERT INTO vaccines (name, schedule_weeks, doses_required) VALUES
    ('BCG',              0,  1),
    ('OPV 0 (at birth)', 0,  1),
    ('OPV 1',            6,  1),
    ('OPV 2',            10, 1),
    ('OPV 3',            14, 1),
    ('DPT-HepB-Hib 1',   6,  1),
    ('DPT-HepB-Hib 2',   10, 1),
    ('DPT-HepB-Hib 3',   14, 1),
    ('PCV10 1',          6,  1),
    ('PCV10 2',          10, 1),
    ('PCV10 3',          14, 1),
    ('Rotavirus 1',      6,  1),
    ('Rotavirus 2',      10, 1),
    ('IPV',              14, 1),
    ('Measles / Rubella (MR1)', 36, 1),
    ('MR2 Booster',      72, 1),
    ('Yellow Fever',     36, 1),
    ('Vitamin A (6mo)',   24, 1),
    ('Tetanus TT1',      NULL,1),
    ('Tetanus TT2',      NULL,1),
    ('Tetanus TT3',      NULL,1);

-- Counties (Kenya — all 47)
INSERT INTO counties (name) VALUES
    ('Mombasa'),('Kwale'),('Kilifi'),('Tana River'),('Lamu'),
    ('Taita Taveta'),('Garissa'),('Wajir'),('Mandera'),('Marsabit'),
    ('Isiolo'),('Meru'),('Tharaka-Nithi'),('Embu'),('Kitui'),
    ('Machakos'),('Makueni'),('Nyandarua'),('Nyeri'),('Kirinyaga'),
    ('Murang''a'),('Kiambu'),('Turkana'),('West Pokot'),('Samburu'),
    ('Trans-Nzoia'),('Uasin Gishu'),('Elgeyo Marakwet'),('Nandi'),('Baringo'),
    ('Laikipia'),('Nakuru'),('Narok'),('Kajiado'),('Kericho'),
    ('Bomet'),('Kakamega'),('Vihiga'),('Bungoma'),('Busia'),
    ('Siaya'),('Kisumu'),('Homa Bay'),('Migori'),('Kisii'),
    ('Nyamira'),('Nairobi');

-- Lab Tests (common panel)
INSERT INTO lab_tests (code, name, category_id, normal_range, unit, price, sample_type) VALUES
    ('CBC',     'Complete Blood Count',          1, 'See report',       '',    400,  'Blood'),
    ('MPS',     'Malaria Parasite Screen',        4, 'Negative',         '',    300,  'Blood'),
    ('MRDT',    'Malaria RDT',                    5, 'Negative',         '',    300,  'Blood'),
    ('WIDAL',   'Widal Test',                     5, '<1:80',            '',    400,  'Blood'),
    ('UFEME',   'Urinalysis Full (UFEME)',         6, 'See report',       '',    300,  'Urine'),
    ('BS',      'Blood Sugar (RBS)',               2, '4.0 - 7.8 mmol/L','mmol/L',250,'Blood'),
    ('HBA1C',   'HbA1c',                          2, '<6.5%',            '%',   800,  'Blood'),
    ('LFT',     'Liver Function Tests',            2, 'See report',       '',    800,  'Blood'),
    ('RFT',     'Renal Function Tests',            2, 'See report',       '',    800,  'Blood'),
    ('LIPID',   'Lipid Profile',                   2, 'See report',       '',    900,  'Blood'),
    ('HIV',     'HIV Rapid Test',                  5, 'Non-Reactive',     '',    200,  'Blood'),
    ('SYPHILIS','Syphilis (VDRL/RPR)',             5, 'Non-Reactive',     '',    300,  'Blood'),
    ('HEPB',    'Hepatitis B (HBsAg)',             5, 'Non-Reactive',     '',    400,  'Blood'),
    ('HB',      'Haemoglobin',                     1, '12-17 g/dL',       'g/dL',200,  'Blood'),
    ('ESR',     'Erythrocyte Sedimentation Rate',  1, 'M:<15 F:<20 mm/hr','mm/hr',250, 'Blood'),
    ('UREA',    'Urea & Electrolytes',              2, 'See report',       '',    600,  'Blood'),
    ('PREG',    'Pregnancy Test (Urine)',           5, 'Negative',         '',    200,  'Urine'),
    ('CULTURE', 'Culture & Sensitivity',           3, 'No growth',        '',   1200,  'Various'),
    ('XRAY',    'Chest X-Ray (Radiograph)',        8, 'See report',       '',   1500,  'N/A'),
    ('ULTRASOUND','Ultrasound Scan',               8, 'See report',       '',   2000,  'N/A');

-- Common Drugs
INSERT INTO drugs (code, generic_name, brand_name, category_id, strength, dosage_form) VALUES
    ('AMX500',  'Amoxicillin',              'Amoxil',      1,  '500mg',     'Capsule'),
    ('AMX250S', 'Amoxicillin',              'Amoxil',      1,  '250mg/5ml', 'Syrup'),
    ('AUG625',  'Amoxicillin/Clavulanate',  'Augmentin',   1,  '625mg',     'Tablet'),
    ('MTZ400',  'Metronidazole',            'Flagyl',      1,  '400mg',     'Tablet'),
    ('CIP500',  'Ciprofloxacin',            'Ciprobay',    1,  '500mg',     'Tablet'),
    ('ARTHLU',  'Artemether/Lumefantrine',  'Coartem',     3,  '20/120mg',  'Tablet'),
    ('ARTSUN',  'Artesunate',               'Falcimon',    3,  '200mg',     'Injection'),
    ('SP',      'Sulfadoxine/Pyrimethamine','Fansidar',    3,  '500/25mg',  'Tablet'),
    ('PCT500',  'Paracetamol',              'Panadol',     2,  '500mg',     'Tablet'),
    ('PCT120S', 'Paracetamol',              'Calpol',      2,  '120mg/5ml', 'Syrup'),
    ('IBP400',  'Ibuprofen',                'Brufen',      2,  '400mg',     'Tablet'),
    ('DICLOF',  'Diclofenac Sodium',        'Voltaren',    2,  '50mg',      'Tablet'),
    ('AMLO5',   'Amlodipine',               'Norvasc',     4,  '5mg',       'Tablet'),
    ('ENALA',   'Enalapril',                'Vasotec',     4,  '10mg',      'Tablet'),
    ('NIFE',    'Nifedipine',               'Adalat',      4,  '10mg',      'Tablet'),
    ('METF',    'Metformin',                'Glucophage',  14, '500mg',     'Tablet'),
    ('FOLAC',   'Folic Acid',               'Folvite',     6,  '5mg',       'Tablet'),
    ('FERROUS', 'Ferrous Sulphate',         'Feosol',      6,  '200mg',     'Tablet'),
    ('VIT B',   'Vitamin B Complex',        'Neurobion',   6,  '',          'Tablet'),
    ('ORS',     'ORS Sachets',              'Dioralyte',   7,  '20.5g',     'Sachet'),
    ('ZINC',    'Zinc Sulphate',            'Zincovit',    6,  '20mg',      'Tablet'),
    ('DMPA',    'Medroxyprogesterone',      'Depo-Provera',11, '150mg/ml',  'Injection'),
    ('IMPLANT', 'Levonorgestrel Implant',   'Jadelle',     11, '75mg x2',   'Implant'),
    ('CONDOM',  'Male Condom',              '',            11, '',          'Unit'),
    ('COTRIM',  'Cotrimoxazole',            'Bactrim',     1,  '480mg',     'Tablet'),
    ('DOXY',    'Doxycycline',              'Vibramycin',  1,  '100mg',     'Capsule'),
    ('SALBU',   'Salbutamol',               'Ventolin',    13, '100mcg',    'Inhaler'),
    ('PRED',    'Prednisolone',             'Prelone',     17, '5mg',       'Tablet'),
    ('OMEP',    'Omeprazole',               'Losec',       12, '20mg',      'Capsule'),
    ('METOCL',  'Metoclopramide',           'Maxolon',     12, '10mg',      'Tablet');

-- ============================================================
-- SECTION 15: USEFUL VIEWS FOR REPORTS & DASHBOARDS
-- ============================================================

-- View: Today's patient summary
CREATE VIEW v_today_summary AS
SELECT
    COUNT(DISTINCT v.patient_id)                                          AS total_patients_today,
    COUNT(DISTINCT CASE WHEN v.patient_type='Outpatient' THEN v.id END)   AS outpatients,
    COUNT(DISTINCT CASE WHEN v.patient_type='Inpatient'  THEN v.id END)   AS inpatients,
    COUNT(DISTINCT CASE WHEN v.current_stage='Reception' THEN v.id END)   AS at_reception,
    COUNT(DISTINCT CASE WHEN v.current_stage='Consultation' THEN v.id END) AS at_consultation,
    COUNT(DISTINCT CASE WHEN v.current_stage='Pharmacy'  THEN v.id END)   AS at_pharmacy,
    COUNT(DISTINCT CASE WHEN v.current_stage='Laboratory'THEN v.id END)   AS at_laboratory,
    COUNT(DISTINCT CASE WHEN v.status='Discharged'       THEN v.id END)   AS discharged
FROM visits v
WHERE v.visit_date = CURRENT_DATE;

-- View: Low stock drugs
CREATE VIEW v_low_stock AS
SELECT
    d.generic_name,
    d.brand_name,
    ds.store,
    ds.quantity       AS current_qty,
    ds.min_quantity   AS min_qty,
    ds.expiry_date,
    CASE
        WHEN ds.quantity = 0               THEN 'Out of Stock'
        WHEN ds.quantity < ds.min_quantity THEN 'Low Stock'
        ELSE 'OK'
    END AS stock_status
FROM drug_stock ds
JOIN drugs d ON d.id = ds.drug_id
WHERE ds.quantity < ds.min_quantity
ORDER BY ds.quantity ASC;

-- View: Expiring drugs (within 90 days)
CREATE VIEW v_expiring_drugs AS
SELECT
    d.generic_name,
    d.brand_name,
    ds.store,
    ds.batch_no,
    ds.quantity,
    ds.expiry_date,
    (ds.expiry_date - CURRENT_DATE) AS days_to_expiry
FROM drug_stock ds
JOIN drugs d ON d.id = ds.drug_id
WHERE ds.expiry_date IS NOT NULL
  AND ds.expiry_date <= CURRENT_DATE + INTERVAL '90 days'
  AND ds.quantity > 0
ORDER BY ds.expiry_date ASC;

-- View: Revenue summary per day
CREATE VIEW v_revenue_daily AS
SELECT
    payment_date,
    SUM(amount)                                              AS total_revenue,
    SUM(CASE WHEN pm.name = 'Cash'   THEN p.amount ELSE 0 END) AS cash_revenue,
    SUM(CASE WHEN pm.name = 'M-Pesa' THEN p.amount ELSE 0 END) AS mpesa_revenue,
    SUM(CASE WHEN pm.name = 'NHIF'   THEN p.amount ELSE 0 END) AS nhif_revenue,
    COUNT(DISTINCT p.invoice_id)                             AS invoices_settled
FROM payments p
JOIN payment_methods pm ON pm.id = p.payment_method_id
GROUP BY payment_date
ORDER BY payment_date DESC;

-- View: Pending bills
CREATE VIEW v_pending_bills AS
SELECT
    i.invoice_no,
    p.first_name || ' ' || p.last_name   AS patient_name,
    p.phone,
    i.total,
    i.amount_paid,
    i.balance,
    i.invoice_date,
    i.status
FROM invoices i
JOIN patients p ON p.id = i.patient_id
WHERE i.status IN ('Pending','Partial')
ORDER BY i.balance DESC;

-- View: Bed occupancy
CREATE VIEW v_bed_occupancy AS
SELECT
    w.name        AS ward,
    wt.name       AS ward_type,
    COUNT(b.id)   AS total_beds,
    COUNT(CASE WHEN b.status = 'Occupied'  THEN 1 END) AS occupied,
    COUNT(CASE WHEN b.status = 'Available' THEN 1 END) AS available,
    ROUND(COUNT(CASE WHEN b.status='Occupied' THEN 1 END)::NUMERIC / NULLIF(COUNT(b.id),0) * 100, 1) AS occupancy_pct
FROM wards w
LEFT JOIN ward_types wt ON wt.id = w.ward_type_id
LEFT JOIN beds b ON b.ward_id = w.id
GROUP BY w.id, w.name, wt.name
ORDER BY w.name;

-- View: Monthly OPD report
CREATE VIEW v_opd_monthly AS
SELECT
    DATE_TRUNC('month', v.visit_date)::DATE    AS month,
    COUNT(*)                                   AS total_visits,
    COUNT(CASE WHEN v.visit_type='New'    THEN 1 END) AS new_patients,
    COUNT(CASE WHEN v.visit_type='Revisit'THEN 1 END) AS revisits,
    COUNT(DISTINCT v.patient_id)               AS unique_patients
FROM visits v
WHERE v.patient_type = 'Outpatient'
GROUP BY DATE_TRUNC('month', v.visit_date)
ORDER BY month DESC;

-- View: Lab workload monthly
CREATE VIEW v_lab_workload_monthly AS
SELECT
    DATE_TRUNC('month', lr.requested_at)::DATE AS month,
    COUNT(DISTINCT lr.id)                      AS total_requests,
    COUNT(lri.id)                              AS total_tests,
    COUNT(CASE WHEN lr.status='Ready'      THEN 1 END) AS completed,
    COUNT(CASE WHEN lr.status='Pending'    THEN 1 END) AS pending,
    COUNT(CASE WHEN lr.is_walkin           THEN 1 END) AS walkin_requests
FROM lab_requests lr
LEFT JOIN lab_request_items lri ON lri.lab_request_id = lr.id
GROUP BY DATE_TRUNC('month', lr.requested_at)
ORDER BY month DESC;

-- ============================================================
-- SECTION 16: HELPER FUNCTIONS
-- ============================================================

-- Auto-generate patient number: P0001, P0002...
CREATE OR REPLACE FUNCTION generate_patient_no()
RETURNS VARCHAR AS $$
DECLARE
    next_val INT;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(patient_no FROM 2) AS INT)), 0) + 1
    INTO next_val
    FROM patients;
    RETURN 'P' || LPAD(next_val::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Auto-generate visit number
CREATE OR REPLACE FUNCTION generate_visit_no()
RETURNS VARCHAR AS $$
BEGIN
    RETURN 'V-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
           LPAD((SELECT COALESCE(COUNT(*),0)+1 FROM visits WHERE EXTRACT(YEAR FROM created_at)=EXTRACT(YEAR FROM NOW()))::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- Auto-generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_no()
RETURNS VARCHAR AS $$
BEGIN
    RETURN 'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
           LPAD((SELECT COALESCE(COUNT(*),0)+1 FROM invoices WHERE EXTRACT(YEAR FROM created_at)=EXTRACT(YEAR FROM NOW()))::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- Auto-update invoice totals when items are added
CREATE OR REPLACE FUNCTION update_invoice_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE invoices
    SET subtotal = (SELECT COALESCE(SUM(quantity * unit_price),0) FROM invoice_items WHERE invoice_id = NEW.invoice_id),
        total    = (SELECT COALESCE(SUM(quantity * unit_price),0) FROM invoice_items WHERE invoice_id = NEW.invoice_id) - discount + tax,
        updated_at = NOW()
    WHERE id = NEW.invoice_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_invoice_total
AFTER INSERT OR UPDATE OR DELETE ON invoice_items
FOR EACH ROW EXECUTE FUNCTION update_invoice_total();

-- Auto-update drug stock quantity after movement
CREATE OR REPLACE FUNCTION update_stock_after_movement()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE drug_stock
    SET quantity   = quantity + NEW.quantity,
        updated_at = NOW()
    WHERE id = NEW.drug_stock_id;

    -- Update balance_after on the movement record
    NEW.balance_after := (SELECT quantity FROM drug_stock WHERE id = NEW.drug_stock_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_stock_movement
BEFORE INSERT ON stock_movements
FOR EACH ROW EXECUTE FUNCTION update_stock_after_movement();

-- Auto-generate low stock notifications
CREATE OR REPLACE FUNCTION notify_low_stock()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.quantity < NEW.min_quantity AND OLD.quantity >= OLD.min_quantity THEN
        INSERT INTO notifications (type, title, message, reference_table, reference_id)
        SELECT 'LOW_STOCK',
               'Low Stock Alert: ' || d.generic_name,
               'Stock for ' || d.generic_name || ' in ' || NEW.store || ' has fallen to ' || NEW.quantity || ' units (min: ' || NEW.min_quantity || ')',
               'drug_stock',
               NEW.id
        FROM drugs d WHERE d.id = NEW.drug_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_low_stock_notification
AFTER UPDATE OF quantity ON drug_stock
FOR EACH ROW EXECUTE FUNCTION notify_low_stock();

-- ============================================================
-- DONE
-- ============================================================
-- Tables:    47
-- Views:      7
-- Functions:  5
-- Triggers:   3
-- Seed rows: ~130
-- ============================================================