-- ============================================================
-- AfyaTab HMIS — Hospital Settings Migration
-- Adds a single-row table holding facility branding info
-- (logo, name, motto) used by the sidebar and Settings page.
-- Safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS hospital_settings (
    id              SERIAL PRIMARY KEY,
    hospital_name   VARCHAR(200) NOT NULL DEFAULT 'AfyaTab HMIS',
    motto           VARCHAR(255) DEFAULT 'Your corporate health management information system.',
    logo_url        TEXT,                         -- image URL, or a data: base64 string
    facility_code   VARCHAR(30),
    county          VARCHAR(100),
    sub_county      VARCHAR(100),
    phone           VARCHAR(30),
    updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

-- Seed the single settings row with current defaults (only if empty)
INSERT INTO hospital_settings (hospital_name, motto, facility_code, county, sub_county, phone)
SELECT 'Webuye West Sub-County Hospital',
       'Your corporate health management information system.',
       '13024', 'Bungoma County', 'Webuye West', '+254 700 000000'
WHERE NOT EXISTS (SELECT 1 FROM hospital_settings);

SELECT * FROM hospital_settings;