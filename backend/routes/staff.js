const express = require('express');
const router  = express.Router();
const pool    = require('../config/db');

// GET all staff
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, r.name AS role_name, d.name AS department_name
       FROM staff s
       LEFT JOIN roles r ON r.id = s.role_id
       LEFT JOIN departments d ON d.id = s.department_id
       WHERE s.status != 'Deleted'
       ORDER BY s.first_name`
    );
    res.json({ success: true, count: result.rows.length, staff: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single staff
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, r.name AS role_name, d.name AS department_name
       FROM staff s
       LEFT JOIN roles r ON r.id = s.role_id
       LEFT JOIN departments d ON d.id = s.department_id
       WHERE s.id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, error: 'Staff not found' });
    }
    res.json({ success: true, staff: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create staff
router.post('/', async (req, res) => {
  try {
    const {
      first_name, last_name, gender, date_of_birth,
      national_id, phone, email, department_id,
      role_id, shift, hire_date
    } = req.body;
    if (!first_name || !last_name || !role_id) {
      return res.status(400).json({
        success: false,
        error: 'first_name, last_name and role_id are required'
      });
    }
    const count = await pool.query('SELECT COUNT(*) FROM staff');
    const staff_no = 'S' + String(parseInt(count.rows[0].count) + 1).padStart(3, '0');
    const result = await pool.query(
      `INSERT INTO staff (
        staff_no, first_name, last_name, gender, date_of_birth,
        national_id, phone, email, department_id, role_id, shift, hire_date
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *`,
      [
        staff_no, first_name, last_name, gender || null,
        date_of_birth || null, national_id || null,
        phone || null, email || null, department_id || null,
        role_id, shift || 'Day', hire_date || null
      ]
    );
    res.status(201).json({ success: true, message: 'Staff created', staff: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update staff
router.put('/:id', async (req, res) => {
  try {
    const {
      first_name, last_name, phone, email,
      department_id, role_id, shift, status
    } = req.body;
    const result = await pool.query(
      `UPDATE staff SET
        first_name=$1, last_name=$2, phone=$3, email=$4,
        department_id=$5, role_id=$6, shift=$7, status=$8,
        updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [first_name, last_name, phone, email,
       department_id, role_id, shift, status, req.params.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, error: 'Staff not found' });
    }
    res.json({ success: true, message: 'Staff updated', staff: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET all roles
router.get('/meta/roles', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM roles ORDER BY name');
    res.json({ success: true, roles: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET all departments
router.get('/meta/departments', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM departments ORDER BY name');
    res.json({ success: true, departments: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;