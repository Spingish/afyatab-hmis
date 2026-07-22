// AfyaTab HMIS - Triage Routes
const express = require('express');
const router  = express.Router();
const pool    = require('../config/db');

// GET triage for a visit
router.get('/visit/:visit_id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, v.visit_no, v.patient_type,
              p.first_name, p.last_name, p.patient_no,
              p.date_of_birth, p.gender, p.allergies,
              s.first_name || ' ' || s.last_name AS triaged_by_name
       FROM triage t
       JOIN visits v ON v.id = t.visit_id
       JOIN patients p ON p.id = t.patient_id
       LEFT JOIN staff s ON s.id = t.triaged_by
       WHERE t.visit_id = $1`,
      [req.params.visit_id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, error: 'No triage record found for this visit' });
    }
    res.json({ success: true, triage: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET all triage records today
router.get('/today', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, v.visit_no, v.current_stage,
              p.first_name, p.last_name, p.patient_no, p.gender,
              p.date_of_birth, p.allergies
       FROM triage t
       JOIN visits v ON v.id = t.visit_id
       JOIN patients p ON p.id = t.patient_id
       WHERE t.triaged_at::date = CURRENT_DATE
       ORDER BY t.triaged_at DESC`
    );
    res.json({ success: true, count: result.rows.length, triage: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create triage record
router.post('/', async (req, res) => {
  try {
    const {
      visit_id, patient_id,
      temperature, blood_pressure_systolic, blood_pressure_diastolic,
      pulse_rate, respiratory_rate, oxygen_saturation,
      weight_kg, height_cm, muac_cm,
      priority, chief_complaint, triaged_by
    } = req.body;

    if (!visit_id || !patient_id) {
      return res.status(400).json({
        success: false,
        error: 'visit_id and patient_id are required'
      });
    }

    // Check if triage already exists for this visit
    const existing = await pool.query(
      'SELECT id FROM triage WHERE visit_id = $1',
      [visit_id]
    );

    let result;
    if (existing.rows[0]) {
      // Update existing triage
      result = await pool.query(
        `UPDATE triage SET
          temperature=$1, blood_pressure_systolic=$2,
          blood_pressure_diastolic=$3, pulse_rate=$4,
          respiratory_rate=$5, oxygen_saturation=$6,
          weight_kg=$7, height_cm=$8, muac_cm=$9,
          priority=$10, chief_complaint=$11,
          triaged_by=$12, triaged_at=NOW()
         WHERE visit_id=$13 RETURNING *`,
        [
          temperature || null, blood_pressure_systolic || null,
          blood_pressure_diastolic || null, pulse_rate || null,
          respiratory_rate || null, oxygen_saturation || null,
          weight_kg || null, height_cm || null, muac_cm || null,
          priority || 'Normal', chief_complaint || null,
          triaged_by || null, visit_id
        ]
      );
    } else {
      // Create new triage
      result = await pool.query(
        `INSERT INTO triage (
          visit_id, patient_id,
          temperature, blood_pressure_systolic, blood_pressure_diastolic,
          pulse_rate, respiratory_rate, oxygen_saturation,
          weight_kg, height_cm, muac_cm,
          priority, chief_complaint, triaged_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        RETURNING *`,
        [
          visit_id, patient_id,
          temperature || null, blood_pressure_systolic || null,
          blood_pressure_diastolic || null, pulse_rate || null,
          respiratory_rate || null, oxygen_saturation || null,
          weight_kg || null, height_cm || null, muac_cm || null,
          priority || 'Normal', chief_complaint || null,
          triaged_by || null
        ]
      );
    }

    // Auto-move visit to Triage stage
    await pool.query(
      `UPDATE visits SET current_stage='Triage', updated_at=NOW()
       WHERE id=$1`,
      [visit_id]
    );

    // Log stage movement
    await pool.query(
      `INSERT INTO visit_stage_log (visit_id, to_stage, moved_by, notes)
       VALUES ($1,'Triage',$2,'Auto-moved after triage captured')`,
      [visit_id, triaged_by || null]
    );

    res.status(201).json({
      success:  true,
      message:  'Triage recorded successfully',
      triage:   result.rows[0]
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET pending triage (visits at Reception not yet triaged)
router.get('/pending', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT v.id AS visit_id, v.visit_no, v.visit_time,
              v.visit_type, v.current_stage,
              p.id AS patient_id, p.patient_no,
              p.first_name, p.last_name, p.gender,
              p.date_of_birth, p.phone, p.allergies,
              (SELECT COUNT(*) FROM visits pv
               WHERE pv.patient_id = p.id
               AND pv.id != v.id) AS previous_visits
       FROM visits v
       JOIN patients p ON p.id = v.patient_id
       LEFT JOIN triage t ON t.visit_id = v.id
       WHERE v.visit_date = CURRENT_DATE
         AND v.status = 'Active'
         AND v.current_stage IN ('Reception','Triage')
         AND t.id IS NULL
       ORDER BY v.visit_time ASC`
    );
    res.json({ success: true, count: result.rows.length, pending: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;