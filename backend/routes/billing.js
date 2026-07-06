const express = require('express');
const router  = express.Router();
const pool    = require('../config/db');

// GET all invoices
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT i.*,
              p.patient_no, p.first_name, p.last_name, p.phone,
              ip.name AS insurance_name
       FROM invoices i
       JOIN patients p ON p.id = i.patient_id
       LEFT JOIN insurance_providers ip ON ip.id = i.insurance_provider_id
       ORDER BY i.created_at DESC
       LIMIT 50`
    );
    res.json({ success: true, count: result.rows.length, invoices: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET pending bills
router.get('/pending', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM v_pending_bills');
    res.json({ success: true, count: result.rows.length, bills: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET revenue summary
router.get('/revenue', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM v_revenue_daily ORDER BY payment_date DESC LIMIT 30');
    res.json({ success: true, revenue: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single invoice with items
router.get('/:id', async (req, res) => {
  try {
    const inv = await pool.query(
      `SELECT i.*, p.patient_no, p.first_name, p.last_name, p.phone
       FROM invoices i
       JOIN patients p ON p.id = i.patient_id
       WHERE i.id = $1`,
      [req.params.id]
    );
    if (!inv.rows[0]) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }
    const items = await pool.query(
      'SELECT * FROM invoice_items WHERE invoice_id = $1',
      [req.params.id]
    );
    const payments = await pool.query(
      `SELECT py.*, pm.name AS payment_method_name
       FROM payments py
       JOIN payment_methods pm ON pm.id = py.payment_method_id
       WHERE py.invoice_id = $1
       ORDER BY py.created_at`,
      [req.params.id]
    );
    res.json({
      success:  true,
      invoice:  inv.rows[0],
      items:    items.rows,
      payments: payments.rows
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create invoice
router.post('/', async (req, res) => {
  try {
    const {
      patient_id, visit_id, discount,
      insurance_provider_id, items
    } = req.body;
    if (!patient_id || !items || !items.length) {
      return res.status(400).json({
        success: false, error: 'patient_id and items are required'
      });
    }
    const count = await pool.query(
      `SELECT COUNT(*) FROM invoices
       WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())`
    );
    const invoice_no = 'INV-' + new Date().getFullYear() + '-' +
      String(parseInt(count.rows[0].count) + 1).padStart(5, '0');

    const inv = await pool.query(
      `INSERT INTO invoices (
        invoice_no, patient_id, visit_id,
        discount, insurance_provider_id, status
      ) VALUES ($1,$2,$3,$4,$5,'Pending')
      RETURNING *`,
      [
        invoice_no, patient_id, visit_id || null,
        discount || 0, insurance_provider_id || null
      ]
    );

    for (const item of items) {
      await pool.query(
        `INSERT INTO invoice_items (
          invoice_id, service_type, description,
          quantity, unit_price
        ) VALUES ($1,$2,$3,$4,$5)`,
        [
          inv.rows[0].id, item.service_type,
          item.description, item.quantity || 1, item.unit_price
        ]
      );
    }

    const updated = await pool.query(
      'SELECT * FROM invoices WHERE id = $1',
      [inv.rows[0].id]
    );

    res.status(201).json({
      success:    true,
      message:    'Invoice created',
      invoice_no: inv.rows[0].invoice_no,
      invoice:    updated.rows[0]
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST record payment
router.post('/:id/payment', async (req, res) => {
  try {
    const { amount, payment_method_id, mpesa_reference, received_by } = req.body;
    if (!amount || !payment_method_id || !received_by) {
      return res.status(400).json({
        success: false,
        error: 'amount, payment_method_id and received_by are required'
      });
    }
    const inv = await pool.query(
      'SELECT * FROM invoices WHERE id = $1',
      [req.params.id]
    );
    if (!inv.rows[0]) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }
    const count = await pool.query(
      `SELECT COUNT(*) FROM payments
       WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())`
    );
    const payment_no = 'PAY-' + new Date().getFullYear() + '-' +
      String(parseInt(count.rows[0].count) + 1).padStart(5, '0');
    const receipt_no = 'RCP-' + Date.now();

    await pool.query(
      `INSERT INTO payments (
        payment_no, invoice_id, patient_id, amount,
        payment_method_id, mpesa_reference, receipt_no, received_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        payment_no, req.params.id, inv.rows[0].patient_id,
        amount, payment_method_id, mpesa_reference || null,
        receipt_no, received_by
      ]
    );

    const new_paid = parseFloat(inv.rows[0].amount_paid) + parseFloat(amount);
    const new_status = new_paid >= inv.rows[0].total ? 'Paid' : 'Partial';

    await pool.query(
      `UPDATE invoices SET amount_paid=$1, status=$2, updated_at=NOW()
       WHERE id=$3`,
      [new_paid, new_status, req.params.id]
    );

    res.json({
      success:    true,
      message:    'Payment recorded',
      payment_no, receipt_no,
      amount_paid: new_paid,
      status:      new_status
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET payment methods
router.get('/meta/payment-methods', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM payment_methods ORDER BY name');
    res.json({ success: true, methods: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;