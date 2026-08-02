-- ============================================================
-- TibaMax HMIS — Billing Phase 1c: Correction
-- Only maternity/delivery-related MCH services are billable.
-- ANC, Family Planning, and CWC/immunization stay free.
-- ============================================================

BEGIN;

DELETE FROM service_catalog WHERE name IN ('ANC Visit Fee', 'FP Service Fee', 'CWC Visit Fee');

-- PNC Visit Fee stays (delivery-related). Confirm/set your real rate:
-- UPDATE service_catalog SET price = 200 WHERE name = 'PNC Visit Fee';

COMMIT;