const express = require('express');
const router  = express.Router();
const pool    = require('../config/db');

// GET all appointments
router.get('/', async (req, res) => {
  try {
    const { date, status, dept } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    let i = 1;
    if (date)   { where += ` AND a.appointment_date = $${i++}`; params.push(date); }
    if (status) { where += ` AND a.status = $${i++}`; params.push(status); }
    if (dept)   { where += ` AND a.department_id = $${i++}`; params.push(dept); }

    const result = await pool.query(
      `SELECT a.*,
              p.patient_no, p.first_name, p.last_name, p.phone,
              d.name AS department_name,
              s.first_name || ' ' || s.last_name AS provider_name
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
       LEFT JOIN departments d ON d.id = a.department_id
       LEFT JOIN staff s ON s.id = a.provider_id
       ${where}
       ORDER BY a.appointment_date, a.appointment_time`,
      params
    );
    res.json({ success: true, count: result.rows.length, appointments: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET today's appointments
router.get('/today', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*,
              p.patient_no, p.first_name, p.last_name, p.phone,
              d.name AS department_name,
              s.first_name || ' ' || s.last_name AS provider_name
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
       LEFT JOIN departments d ON d.id = a.department_id
       LEFT JOIN staff s ON s.id = a.provider_id
       WHERE a.appointment_date = CURRENT_DATE
       ORDER BY a.appointment_time`
    );
    res.json({ success: true, count: result.rows.length, appointments: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create appointment
router.post('/', async (req, res) => {
  try {
    const {
      patient_id, department_id, provider_id,
      appointment_date, appointment_time,
      purpose, booked_by, notes
    } = req.body;
    if (!patient_id || !appointment_date) {
      return res.status(400).json({
        success: false, error: 'patient_id and appointment_date are required'
      });
    }
    const count = await pool.query(
      `SELECT COUNT(*) FROM appointments
       WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())`
    );
    const appointment_no = 'APT-' + new Date().getFullYear() + '-' +
      String(parseInt(count.rows[0].count) + 1).padStart(5, '0');

    const result = await pool.query(
      `INSERT INTO appointments (
        appointment_no, patient_id, department_id, provider_id,
        appointment_date, appointment_time, purpose,
        booked_by, notes, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Scheduled')
      RETURNING *`,
      [
        appointment_no, patient_id, department_id || null,
        provider_id || null, appointment_date,
        appointment_time || null, purpose || null,
        booked_by || null, notes || null
      ]
    );
    res.status(201).json({
      success:        true,
      message:        'Appointment scheduled',
      appointment_no: result.rows[0].appointment_no,
      appointment:    result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update appointment status
router.put('/:id/status', async (req, res) => {
  try {
    const { status, rescheduled_to, cancellation_reason } = req.body;
    const validStatuses = ['Scheduled','Visited','Missed','LTFU','Rescheduled','Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }
    const result = await pool.query(
      `UPDATE appointments SET
        status=$1, rescheduled_to=$2,
        cancellation_reason=$3, updated_at=NOW()
       WHERE id=$4 RETURNING *`,
      [status, rescheduled_to || null, cancellation_reason || null, req.params.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }
    res.json({ success: true, message: `Appointment marked as ${status}`, appointment: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;