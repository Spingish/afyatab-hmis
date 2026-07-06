const express = require('express');
const router  = express.Router();
const pool    = require('../config/db');

// GET dashboard summary
router.get('/dashboard', async (req, res) => {
  try {
    const [today, revenue, pending, beds, opd, lab] = await Promise.all([
      pool.query('SELECT * FROM v_today_summary'),
      pool.query('SELECT * FROM v_revenue_daily ORDER BY payment_date DESC LIMIT 7'),
      pool.query('SELECT COUNT(*) AS count FROM invoices WHERE status IN (\'Pending\',\'Partial\')'),
      pool.query('SELECT * FROM v_bed_occupancy'),
      pool.query('SELECT * FROM v_opd_monthly LIMIT 12'),
      pool.query('SELECT * FROM v_lab_workload_monthly LIMIT 12')
    ]);
    res.json({
      success: true,
      today:            today.rows[0],
      revenue_7days:    revenue.rows,
      pending_bills:    parseInt(pending.rows[0].count),
      bed_occupancy:    beds.rows,
      opd_monthly:      opd.rows,
      lab_monthly:      lab.rows
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET OPD monthly report
router.get('/opd', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM v_opd_monthly LIMIT 24');
    res.json({ success: true, report: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET revenue report
router.get('/revenue', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM v_revenue_daily ORDER BY payment_date DESC LIMIT 30'
    );
    res.json({ success: true, report: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET lab workload report
router.get('/laboratory', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM v_lab_workload_monthly LIMIT 24');
    res.json({ success: true, report: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET inventory report
router.get('/inventory', async (req, res) => {
  try {
    const [low, expiring] = await Promise.all([
      pool.query('SELECT * FROM v_low_stock'),
      pool.query('SELECT * FROM v_expiring_drugs')
    ]);
    res.json({
      success:        true,
      low_stock:      low.rows,
      expiring_drugs: expiring.rows
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET patient statistics
router.get('/patients', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        COUNT(*)                                           AS total_patients,
        COUNT(CASE WHEN gender='Male'   THEN 1 END)       AS male,
        COUNT(CASE WHEN gender='Female' THEN 1 END)       AS female,
        COUNT(CASE WHEN is_deleted=TRUE THEN 1 END)       AS deleted,
        COUNT(CASE WHEN created_at::date=CURRENT_DATE THEN 1 END) AS registered_today
       FROM patients`
    );
    res.json({ success: true, stats: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;