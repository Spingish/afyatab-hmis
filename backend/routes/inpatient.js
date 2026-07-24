// AfyaTab HMIS - Inpatient / Ward Routes
const express = require('express');
const router  = express.Router();
const pool    = require('../config/db');

// GET all wards with bed occupancy
router.get('/wards', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT w.id, w.name, w.total_beds, w.is_active,
              wt.name AS ward_type,
              d.name  AS department_name,
              COUNT(b.id)                                           AS total_beds_count,
              COUNT(CASE WHEN b.status='Occupied'  THEN 1 END)     AS occupied,
              COUNT(CASE WHEN b.status='Available' THEN 1 END)     AS available,
              COUNT(CASE WHEN b.status='Reserved'  THEN 1 END)     AS reserved,
              COUNT(CASE WHEN b.status='Maintenance' THEN 1 END)   AS maintenance,
              ROUND(
                COUNT(CASE WHEN b.status='Occupied' THEN 1 END)::NUMERIC
                / NULLIF(COUNT(b.id),0) * 100, 1
              ) AS occupancy_pct
       FROM wards w
       LEFT JOIN ward_types wt ON wt.id = w.ward_type_id
       LEFT JOIN departments d  ON d.id  = w.department_id
       LEFT JOIN beds b         ON b.ward_id = w.id
       GROUP BY w.id, w.name, w.total_beds, w.is_active, wt.name, d.name
       ORDER BY w.name`
    );
    res.json({ success: true, count: result.rows.length, wards: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET beds in a ward
router.get('/wards/:ward_id/beds', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*,
              a.admission_no,
              p.first_name || ' ' || p.last_name AS patient_name,
              p.patient_no, p.gender,
              a.admission_date, a.admission_diagnosis
       FROM beds b
       LEFT JOIN admissions a ON a.bed_id = b.id AND a.status = 'Admitted'
       LEFT JOIN patients p   ON p.id = a.patient_id
       WHERE b.ward_id = $1
       ORDER BY b.bed_no`,
      [req.params.ward_id]
    );
    res.json({ success: true, beds: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create ward
router.post('/wards', async (req, res) => {
  try {
    const { name, ward_type_id, total_beds, department_id } = req.body;
    if (!name || !total_beds) {
      return res.status(400).json({ success: false, error: 'name and total_beds are required' });
    }

    const ward = await pool.query(
      `INSERT INTO wards (name, ward_type_id, total_beds, department_id)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [name, ward_type_id||null, total_beds, department_id||null]
    );

    // Auto-create beds for the ward
    const wardId = ward.rows[0].id;
    const prefix = name.replace(/\s+/g,'').substring(0,2).toUpperCase();
    for (let i = 1; i <= total_beds; i++) {
      await pool.query(
        `INSERT INTO beds (bed_no, ward_id, status) VALUES ($1,$2,'Available')`,
        [`${prefix}-${String(i).padStart(2,'0')}`, wardId]
      );
    }

    res.status(201).json({
      success: true,
      message: `Ward ${name} created with ${total_beds} beds`,
      ward:    ward.rows[0]
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET all admissions
router.get('/admissions', async (req, res) => {
  try {
    const { status } = req.query;
    const where = status ? `WHERE a.status = '${status}'` : `WHERE a.status = 'Admitted'`;
    const result = await pool.query(
      `SELECT a.*,
              p.patient_no, p.first_name, p.last_name,
              p.gender, p.date_of_birth, p.phone,
              p.allergies, p.blood_group,
              w.name AS ward_name,
              b.bed_no,
              s.first_name || ' ' || s.last_name AS doctor_name,
              EXTRACT(DAY FROM NOW() - a.admission_date)::INT AS days_admitted
       FROM admissions a
       JOIN patients p ON p.id = a.patient_id
       JOIN wards    w ON w.id = a.ward_id
       JOIN beds     b ON b.id = a.bed_id
       LEFT JOIN staff s ON s.id = a.admitting_doctor_id
       ${where}
       ORDER BY a.admission_date DESC`,
      []
    );
    res.json({ success: true, count: result.rows.length, admissions: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single admission
router.get('/admissions/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*,
              p.patient_no, p.first_name, p.last_name,
              p.gender, p.date_of_birth, p.phone,
              p.allergies, p.blood_group, p.chronic_conditions,
              w.name AS ward_name, b.bed_no,
              s.first_name || ' ' || s.last_name AS doctor_name
       FROM admissions a
       JOIN patients p ON p.id = a.patient_id
       JOIN wards    w ON w.id = a.ward_id
       JOIN beds     b ON b.id = a.bed_id
       LEFT JOIN staff s ON s.id = a.admitting_doctor_id
       WHERE a.id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, error: 'Admission not found' });
    }

    // Get nursing notes
    const notes = await pool.query(
      `SELECT n.*, s.first_name || ' ' || s.last_name AS nurse_name
       FROM nursing_notes n
       LEFT JOIN staff s ON s.id = n.written_by
       WHERE n.admission_id = $1
       ORDER BY n.written_at DESC`,
      [req.params.id]
    );

    res.json({
      success:   true,
      admission: result.rows[0],
      notes:     notes.rows
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST admit patient
router.post('/admissions', async (req, res) => {
  try {
    const {
      patient_id, visit_id, ward_id, bed_id,
      admitting_doctor_id, admission_diagnosis,
      admission_notes
    } = req.body;

    if (!patient_id || !ward_id || !bed_id) {
      return res.status(400).json({
        success: false,
        error: 'patient_id, ward_id and bed_id are required'
      });
    }

    // Check bed is available
    const bed = await pool.query(
      'SELECT * FROM beds WHERE id=$1 AND status=\'Available\'',
      [bed_id]
    );
    if (!bed.rows[0]) {
      return res.status(409).json({
        success: false,
        error: 'Bed is not available — please select another bed'
      });
    }

    // Generate admission number
    const count = await pool.query(
      `SELECT COUNT(*) FROM admissions
       WHERE EXTRACT(YEAR FROM admission_date) = EXTRACT(YEAR FROM NOW())`
    );
    const admission_no = 'ADM-' + new Date().getFullYear() + '-' +
      String(parseInt(count.rows[0].count) + 1).padStart(5, '0');

    // Create admission
    const admission = await pool.query(
      `INSERT INTO admissions (
        admission_no, patient_id, visit_id, ward_id, bed_id,
        admitting_doctor_id, admission_diagnosis, admission_notes,
        status, admission_date
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'Admitted',NOW())
      RETURNING *`,
      [
        admission_no, patient_id, visit_id||null, ward_id, bed_id,
        admitting_doctor_id||null, admission_diagnosis||null,
        admission_notes||null
      ]
    );

    // Mark bed as Occupied
    await pool.query(
      'UPDATE beds SET status=\'Occupied\' WHERE id=$1',
      [bed_id]
    );

    // Update visit to Inpatient
    if (visit_id) {
      await pool.query(
        `UPDATE visits SET
          patient_type='Inpatient', current_stage='Admitted',
          status='Admitted', updated_at=NOW()
         WHERE id=$1`,
        [visit_id]
      );
    }

    res.status(201).json({
      success:      true,
      message:      `Patient admitted successfully`,
      admission_no: admission_no,
      admission:    admission.rows[0]
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST nursing note
router.post('/admissions/:id/notes', async (req, res) => {
  try {
    const {
      note, note_type, written_by,
      vitals_temp, vitals_bp, vitals_pulse, vitals_spo2
    } = req.body;

    if (!note) {
      return res.status(400).json({ success: false, error: 'Note content is required' });
    }

    // Get admission to find patient_id
    const adm = await pool.query('SELECT patient_id FROM admissions WHERE id=$1', [req.params.id]);
    if (!adm.rows[0]) {
      return res.status(404).json({ success: false, error: 'Admission not found' });
    }

    const result = await pool.query(
      `INSERT INTO nursing_notes (
        admission_id, patient_id, note_type,
        note, vitals_temp, vitals_bp,
        vitals_pulse, vitals_spo2, written_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *`,
      [
        req.params.id, adm.rows[0].patient_id,
        note_type || 'Progress',
        note, vitals_temp||null, vitals_bp||null,
        vitals_pulse||null, vitals_spo2||null,
        written_by||null
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Nursing note saved',
      note:    result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT discharge patient
router.put('/admissions/:id/discharge', async (req, res) => {
  try {
    const {
      discharge_diagnosis, discharge_notes,
      discharge_condition, discharged_by
    } = req.body;

    const adm = await pool.query('SELECT * FROM admissions WHERE id=$1', [req.params.id]);
    if (!adm.rows[0]) {
      return res.status(404).json({ success: false, error: 'Admission not found' });
    }

    // Update admission
    await pool.query(
      `UPDATE admissions SET
        status='Discharged', discharge_date=NOW(),
        discharge_diagnosis=$1, discharge_notes=$2,
        discharge_condition=$3, discharged_by=$4,
        updated_at=NOW()
       WHERE id=$5`,
      [
        discharge_diagnosis||null, discharge_notes||null,
        discharge_condition||'Improved', discharged_by||null,
        req.params.id
      ]
    );

    // Free the bed
    await pool.query(
      'UPDATE beds SET status=\'Available\' WHERE id=$1',
      [adm.rows[0].bed_id]
    );

    // Update visit
    if (adm.rows[0].visit_id) {
      await pool.query(
        `UPDATE visits SET
          status='Discharged', current_stage='Discharged',
          discharge_date=CURRENT_DATE, updated_at=NOW()
         WHERE id=$1`,
        [adm.rows[0].visit_id]
      );
    }

    res.json({
      success: true,
      message: 'Patient discharged successfully'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET ward types
router.get('/ward-types', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ward_types ORDER BY name');
    res.json({ success: true, ward_types: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;