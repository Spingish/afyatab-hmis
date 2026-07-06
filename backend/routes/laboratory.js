const express = require('express');
const router  = express.Router();
const pool    = require('../config/db');

// GET all lab requests
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT lr.*,
              p.patient_no, p.first_name, p.last_name, p.phone,
              s.first_name || ' ' || s.last_name AS requested_by_name,
              COUNT(lri.id) AS test_count
       FROM lab_requests lr
       JOIN patients p ON p.id = lr.patient_id
       LEFT JOIN staff s ON s.id = lr.requested_by
       LEFT JOIN lab_request_items lri ON lri.lab_request_id = lr.id
       GROUP BY lr.id, p.patient_no, p.first_name, p.last_name, p.phone,
                s.first_name, s.last_name
       ORDER BY lr.requested_at DESC
       LIMIT 50`
    );
    res.json({ success: true, count: result.rows.length, requests: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET today's lab requests
router.get('/today', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT lr.*,
              p.patient_no, p.first_name, p.last_name,
              s.first_name || ' ' || s.last_name AS requested_by_name
       FROM lab_requests lr
       JOIN patients p ON p.id = lr.patient_id
       LEFT JOIN staff s ON s.id = lr.requested_by
       WHERE lr.requested_at::date = CURRENT_DATE
       ORDER BY lr.requested_at DESC`
    );
    res.json({ success: true, count: result.rows.length, requests: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single lab request with items
router.get('/:id', async (req, res) => {
  try {
    const req_result = await pool.query(
      `SELECT lr.*, p.patient_no, p.first_name, p.last_name, p.phone
       FROM lab_requests lr
       JOIN patients p ON p.id = lr.patient_id
       WHERE lr.id = $1`,
      [req.params.id]
    );
    if (!req_result.rows[0]) {
      return res.status(404).json({ success: false, error: 'Lab request not found' });
    }
    const items = await pool.query(
      `SELECT lri.*, lt.name AS test_name, lt.normal_range,
              lt.unit, lt.sample_type
       FROM lab_request_items lri
       JOIN lab_tests lt ON lt.id = lri.test_id
       WHERE lri.lab_request_id = $1`,
      [req.params.id]
    );
    res.json({
      success: true,
      request: req_result.rows[0],
      items:   items.rows
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST new lab request
router.post('/', async (req, res) => {
  try {
    const {
      patient_id, visit_id, requested_by,
      is_walkin, priority, clinical_notes, tests
    } = req.body;
    if (!patient_id || !tests || !tests.length) {
      return res.status(400).json({
        success: false,
        error: 'patient_id and at least one test are required'
      });
    }
    const count = await pool.query(
      `SELECT COUNT(*) FROM lab_requests
       WHERE EXTRACT(YEAR FROM requested_at) = EXTRACT(YEAR FROM NOW())`
    );
    const request_no = 'LAB-' + new Date().getFullYear() + '-' +
      String(parseInt(count.rows[0].count) + 1).padStart(5, '0');

    const lr = await pool.query(
      `INSERT INTO lab_requests (
        request_no, patient_id, visit_id, requested_by,
        is_walkin, priority, clinical_notes, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,'Pending')
      RETURNING *`,
      [
        request_no, patient_id, visit_id || null,
        requested_by || null, is_walkin || false,
        priority || 'Normal', clinical_notes || null
      ]
    );

    // Insert test items
    for (const test_id of tests) {
      await pool.query(
        `INSERT INTO lab_request_items (lab_request_id, test_id, status)
         VALUES ($1,$2,'Pending')`,
        [lr.rows[0].id, test_id]
      );
    }

    res.status(201).json({
      success:    true,
      message:    'Lab request created',
      request_no: lr.rows[0].request_no,
      request:    lr.rows[0]
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT enter results for a lab request item
router.put('/:id/results', async (req, res) => {
  try {
    const { results } = req.body;
    for (const r of results) {
      await pool.query(
        `UPDATE lab_request_items SET
          result_value=$1, result_flag=$2, result_notes=$3,
          entered_by=$4, entered_at=NOW(), status='Ready'
         WHERE id=$5`,
        [r.result_value, r.result_flag || 'Normal',
         r.result_notes || null, r.entered_by || null, r.item_id]
      );
    }
    await pool.query(
      `UPDATE lab_requests SET status='Ready', completed_at=NOW()
       WHERE id=$1`,
      [req.params.id]
    );
    res.json({ success: true, message: 'Results entered successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET all lab tests catalog
router.get('/meta/tests', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT lt.*, tc.name AS category_name
       FROM lab_tests lt
       LEFT JOIN test_categories tc ON tc.id = lt.category_id
       WHERE lt.is_active = TRUE
       ORDER BY tc.name, lt.name`
    );
    res.json({ success: true, tests: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;