// TibaMax HMIS - Encounter Service recorder
// Call this after successfully creating a clinical record (triage,
// consultation, lab request, prescription, etc.) so it shows up in
// encounter_services for reporting. Safe to call even if a row for
// that reference already exists (ON CONFLICT DO NOTHING).

async function recordEncounterService(pool, {
  visit_id, patient_id, service_type,
  reference_table, reference_id,
  performed_by = null, status = 'Completed',
  started_at = null, completed_at = null
}) {
  if (!visit_id || !patient_id || !reference_id) return; // nothing to link
  try {
    await pool.query(
      `INSERT INTO encounter_services
         (visit_id, patient_id, service_type, reference_table, reference_id,
          performed_by, status, started_at, completed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8, NOW()),$9)
       ON CONFLICT (reference_table, reference_id) DO NOTHING`,
      [visit_id, patient_id, service_type, reference_table, reference_id,
       performed_by, status, started_at, completed_at]
    );
  } catch (err) {
    // Never let a reporting side-effect break the actual clinical write.
    console.error('recordEncounterService failed:', err.message);
  }
}

module.exports = { recordEncounterService };