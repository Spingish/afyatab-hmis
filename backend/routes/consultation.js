// AfyaTab HMIS - Consultation Routes
const express = require('express');
const router  = express.Router();
const pool    = require('../config/db');

// GET consultation queue (patients at Consultation stage today)
router.get('/queue', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT v.id AS visit_id, v.visit_no, v.visit_type,
              v.visit_time, v.current_stage, v.patient_type,
              p.id AS patient_id, p.patient_no,
              p.first_name, p.last_name, p.gender,
              p.date_of_birth, p.phone, p.allergies,
              p.chronic_conditions, p.blood_group,
              -- Triage data
              t.temperature, t.blood_pressure_systolic,
              t.blood_pressure_diastolic, t.pulse_rate,
              t.respiratory_rate, t.oxygen_saturation,
              t.weight_kg, t.height_cm, t.priority,
              t.chief_complaint AS triage_complaint,
              -- Previous visits count
              (SELECT COUNT(*) FROM visits pv
               WHERE pv.patient_id = p.id
               AND pv.id != v.id) AS previous_visits,
              -- Assigned doctor
              s.first_name || ' ' || s.last_name AS doctor_name
       FROM visits v
       JOIN patients p ON p.id = v.patient_id
       LEFT JOIN triage t ON t.visit_id = v.id
       LEFT JOIN staff s ON s.id = v.attending_doctor_id
       WHERE v.visit_date = CURRENT_DATE
         AND v.current_stage = 'Consultation'
         AND v.status = 'Active'
       ORDER BY t.priority DESC, v.visit_time ASC`
    );
    res.json({ success: true, count: result.rows.length, queue: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single consultation by visit
router.get('/visit/:visit_id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*,
              v.visit_no, v.visit_type, v.visit_date,
              p.patient_no, p.first_name, p.last_name,
              p.gender, p.date_of_birth, p.allergies,
              p.chronic_conditions, p.blood_group,
              s.first_name || ' ' || s.last_name AS doctor_name,
              t.temperature, t.blood_pressure_systolic,
              t.blood_pressure_diastolic, t.pulse_rate,
              t.oxygen_saturation, t.weight_kg,
              t.chief_complaint AS triage_complaint,
              t.priority
       FROM consultations c
       JOIN visits v ON v.id = c.visit_id
       JOIN patients p ON p.id = c.patient_id
       LEFT JOIN staff s ON s.id = c.doctor_id
       LEFT JOIN triage t ON t.visit_id = c.visit_id
       WHERE c.visit_id = $1
       ORDER BY c.created_at DESC
       LIMIT 1`,
      [req.params.visit_id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, error: 'No consultation found for this visit' });
    }
    res.json({ success: true, consultation: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET patient consultation history
router.get('/patient/:patient_id/history', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.id, c.visit_id, c.chief_complaint,
              c.working_diagnosis, c.management_plan,
              c.follow_up_date, c.consultation_date,
              v.visit_no, v.visit_type,
              s.first_name || ' ' || s.last_name AS doctor_name,
              (SELECT STRING_AGG(cd.diagnosis_text, ', ')
               FROM consultation_diagnoses cd
               WHERE cd.consultation_id = c.id) AS diagnoses
       FROM consultations c
       JOIN visits v ON v.id = c.visit_id
       LEFT JOIN staff s ON s.id = c.doctor_id
       WHERE c.patient_id = $1
       ORDER BY c.consultation_date DESC
       LIMIT 10`,
      [req.params.patient_id]
    );
    res.json({ success: true, count: result.rows.length, history: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create consultation
router.post('/', async (req, res) => {
  try {
    const {
      visit_id, patient_id, doctor_id,
      chief_complaint, history_of_presenting_illness,
      past_medical_history, family_history,
      general_examination, systemic_examination,
      working_diagnosis, differential_diagnosis,
      management_plan, diagnoses,
      referred_to_dept, referral_notes,
      follow_up_date,
      // Prescription items
      prescriptions,
      // Lab requests
      lab_tests,
      // Next stage
      next_stage
    } = req.body;

    if (!visit_id || !patient_id || !doctor_id) {
      return res.status(400).json({
        success: false,
        error: 'visit_id, patient_id and doctor_id are required'
      });
    }

    if (!chief_complaint) {
      return res.status(400).json({
        success: false,
        error: 'Chief complaint is required'
      });
    }

    // Create consultation
    const consult = await pool.query(
      `INSERT INTO consultations (
        visit_id, patient_id, doctor_id,
        chief_complaint, history_of_presenting_illness,
        past_medical_history, family_history,
        general_examination, systemic_examination,
        working_diagnosis, differential_diagnosis,
        management_plan, referred_to_dept,
        referral_notes, follow_up_date,
        consultation_date, consultation_time
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,CURRENT_DATE,CURRENT_TIME)
      RETURNING *`,
      [
        visit_id, patient_id, doctor_id,
        chief_complaint,
        history_of_presenting_illness || null,
        past_medical_history || null,
        family_history || null,
        general_examination || null,
        systemic_examination || null,
        working_diagnosis || null,
        differential_diagnosis || null,
        management_plan || null,
        referred_to_dept || null,
        referral_notes || null,
        follow_up_date || null
      ]
    );

    const consultation_id = consult.rows[0].id;

    // Save diagnoses
    if (diagnoses && diagnoses.length > 0) {
      for (const d of diagnoses) {
        await pool.query(
          `INSERT INTO consultation_diagnoses
           (consultation_id, diagnosis_text, diagnosis_type)
           VALUES ($1,$2,$3)`,
          [consultation_id, d.text, d.type || 'Primary']
        );
      }
    }

    // Create prescription if drugs ordered
    let prescription_no = null;
    if (prescriptions && prescriptions.length > 0) {
      const count = await pool.query(
        `SELECT COUNT(*) FROM prescriptions
         WHERE EXTRACT(YEAR FROM prescribed_at) = EXTRACT(YEAR FROM NOW())`
      );
      prescription_no = 'RX-' + new Date().getFullYear() + '-' +
        String(parseInt(count.rows[0].count) + 1).padStart(5, '0');

      const rx = await pool.query(
        `INSERT INTO prescriptions (
          prescription_no, patient_id, visit_id,
          consultation_id, prescribed_by, status
        ) VALUES ($1,$2,$3,$4,$5,'Pending')
        RETURNING id`,
        [prescription_no, patient_id, visit_id, consultation_id, doctor_id]
      );

      for (const item of prescriptions) {
        await pool.query(
          `INSERT INTO prescription_items (
            prescription_id, drug_id, quantity,
            dosage, frequency, duration, route, instructions
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            rx.rows[0].id, item.drug_id, item.quantity,
            item.dosage || null, item.frequency || null,
            item.duration || null, item.route || 'Oral',
            item.instructions || null
          ]
        );
      }
    }

    // Create lab request if tests ordered
    let lab_request_no = null;
    if (lab_tests && lab_tests.length > 0) {
      const count = await pool.query(
        `SELECT COUNT(*) FROM lab_requests
         WHERE EXTRACT(YEAR FROM requested_at) = EXTRACT(YEAR FROM NOW())`
      );
      lab_request_no = 'LAB-' + new Date().getFullYear() + '-' +
        String(parseInt(count.rows[0].count) + 1).padStart(5, '0');

      const lr = await pool.query(
        `INSERT INTO lab_requests (
          request_no, patient_id, visit_id,
          requested_by, priority, status
        ) VALUES ($1,$2,$3,$4,'Normal','Pending')
        RETURNING id`,
        [lab_request_no, patient_id, visit_id, doctor_id]
      );

      for (const test_id of lab_tests) {
        await pool.query(
          `INSERT INTO lab_request_items (lab_request_id, test_id, status)
           VALUES ($1,$2,'Pending')`,
          [lr.rows[0].id, test_id]
        );
      }
    }

    // Move to next stage
    const stage = next_stage || 'Pharmacy';
    await pool.query(
      `UPDATE visits SET current_stage=$1, updated_at=NOW() WHERE id=$2`,
      [stage, visit_id]
    );

    await pool.query(
      `INSERT INTO visit_stage_log (visit_id, to_stage, moved_by)
       VALUES ($1,$2,$3)`,
      [visit_id, stage, doctor_id]
    );

    res.status(201).json({
      success:         true,
      message:         'Consultation saved successfully',
      consultation_id,
      prescription_no,
      lab_request_no,
      next_stage:      stage
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;