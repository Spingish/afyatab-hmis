-- ============================================================
-- TibaMax HMIS — Billing Phase 1: Charge Aggregation Foundation
-- Safe to re-run.
-- ============================================================

BEGIN;

-- 1. Ward daily bed rate (didn't exist — needed to bill bed/ward days)
ALTER TABLE ward_types ADD COLUMN IF NOT EXISTS daily_rate NUMERIC(10,2) DEFAULT 0;

-- 2. Flat-fee service catalog — for charges that aren't tied to
--    lab/pharmacy/procedure tables (Consultation Fee, Registration Fee, etc.)
CREATE TABLE IF NOT EXISTS service_catalog (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(150) NOT NULL UNIQUE,
    category    VARCHAR(80),
    price       NUMERIC(10,2) NOT NULL DEFAULT 0,
    is_active   BOOLEAN DEFAULT TRUE
);

INSERT INTO service_catalog (name, category, price) VALUES
    ('Consultation Fee', 'Consultation', 300),
    ('Registration Fee',  'Registration', 100)
ON CONFLICT (name) DO NOTHING;

-- 3. Track WHICH source record an invoice_item came from, so the
--    charge-aggregation query can exclude anything already invoiced
--    (prevents billing the same lab test/drug/procedure twice).
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS source_table VARCHAR(50);
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS source_id INT;
CREATE INDEX IF NOT EXISTS idx_invoice_items_source
    ON invoice_items(source_table, source_id);

COMMIT;

-- ============================================================
-- Notes:
-- - Set real daily_rate values per ward type once this runs:
--     UPDATE ward_types SET daily_rate = 1500 WHERE name = 'General';
--     UPDATE ward_types SET daily_rate = 3000 WHERE name = 'ICU';
--   (adjust to your actual tariffs)
-- - service_catalog prices above are placeholders — update to your
--   real consultation/registration fees.
-- ============================================================