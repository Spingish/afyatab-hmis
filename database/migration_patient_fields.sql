-- Adds phone ownership + ID document type to patients.
-- Everything else (middle name, residence, email, emergency contact)
-- already exists as other_names, village, email, kin_name/kin_phone/kin_relationship.

ALTER TABLE patients ADD COLUMN IF NOT EXISTS phone_ownership VARCHAR(30) DEFAULT 'Personal';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS id_document_type VARCHAR(30);