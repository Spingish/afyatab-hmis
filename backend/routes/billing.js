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
          quantity, unit_price, source_table, source_id
        ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          inv.rows[0].id, item.service_type,
          item.description, item.quantity || 1, item.unit_price,
          item.source_table || null, item.source_id || null
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
// GET aggregated unbilled charges for a visit (Phase 1: charge aggregation)
// Excludes MCH/maternity entirely — those are SHA-capitated or a
// separate SHA claim, never a patient invoice item.
router.get('/charges/visit/:visitId', async (req, res) => {
  try {
    const visitId = req.params.visitId;
    const charges = [];

    // 1. Consultation Fee — one per consultation on this visit
    const consultations = await pool.query(
      `SELECT c.id FROM consultations c
       WHERE c.visit_id = $1
       AND NOT EXISTS (
         SELECT 1 FROM invoice_items ii
         WHERE ii.source_table = 'consultations' AND ii.source_id = c.id
       )`,
      [visitId]
    );
    if (consultations.rows.length) {
      const fee = await pool.query(
        `SELECT price FROM service_catalog WHERE name = 'Consultation Fee'`
      );
      const price = fee.rows[0]?.price || 0;
      for (const c of consultations.rows) {
        charges.push({
          category: 'Consultation',
          description: 'Consultation Fee',
          source_table: 'consultations',
          source_id: c.id,
          quantity: 1,
          unit_price: price,
          amount: price
        });
      }
    }

    // 2. Laboratory — completed lab test results, not yet invoiced
    const labItems = await pool.query(
      `SELECT lri.id, lt.name, lt.price
       FROM lab_request_items lri
       JOIN lab_requests lr ON lr.id = lri.lab_request_id
       JOIN lab_tests lt ON lt.id = lri.test_id
       WHERE lr.visit_id = $1
       AND lri.entered_at IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM invoice_items ii
         WHERE ii.source_table = 'lab_request_items' AND ii.source_id = lri.id
       )`,
      [visitId]
    );
    for (const item of labItems.rows) {
      charges.push({
        category: 'Laboratory',
        description: item.name,
        source_table: 'lab_request_items',
        source_id: item.id,
        quantity: 1,
        unit_price: item.price,
        amount: item.price
      });
    }

    // 3. Pharmacy — dispensed prescription items, not yet invoiced
    const rxItems = await pool.query(
      `SELECT pi.id, d.generic_name, pi.quantity_dispensed, ds.selling_price
       FROM prescription_items pi
       JOIN prescriptions p ON p.id = pi.prescription_id
       JOIN drugs d ON d.id = pi.drug_id
       LEFT JOIN drug_stock ds ON ds.id = pi.drug_stock_id
       WHERE p.visit_id = $1
       AND pi.dispensed_at IS NOT NULL
       AND pi.quantity_dispensed > 0
       AND NOT EXISTS (
         SELECT 1 FROM invoice_items ii
         WHERE ii.source_table = 'prescription_items' AND ii.source_id = pi.id
       )`,
      [visitId]
    );
    for (const item of rxItems.rows) {
      const unit = item.selling_price || 0;
      const qty = item.quantity_dispensed;
      charges.push({
        category: 'Pharmacy',
        description: item.generic_name,
        source_table: 'prescription_items',
        source_id: item.id,
        quantity: qty,
        unit_price: unit,
        amount: unit * qty
      });
    }

    // 4. Procedures — completed consultation procedures, not yet invoiced
    const procItems = await pool.query(
      `SELECT cp.id, pc.name, pc.base_price
       FROM consultation_procedures cp
       JOIN consultations c ON c.id = cp.consultation_id
       JOIN procedure_catalog pc ON pc.id = cp.procedure_id
       WHERE c.visit_id = $1
       AND cp.status = 'Completed'
       AND NOT EXISTS (
         SELECT 1 FROM invoice_items ii
         WHERE ii.source_table = 'consultation_procedures' AND ii.source_id = cp.id
       )`,
      [visitId]
    );
    for (const item of procItems.rows) {
      charges.push({
        category: 'Procedures',
        description: item.name,
        source_table: 'consultation_procedures',
        source_id: item.id,
        quantity: 1,
        unit_price: item.base_price,
        amount: item.base_price
      });
    }

    // 5. Bed/Ward — non-maternity admissions only, per night stayed
    const admissionRows = await pool.query(
      `SELECT a.id, a.admission_date, a.discharge_date, wt.daily_rate, w.name AS ward_name
       FROM admissions a
       JOIN wards w ON w.id = a.ward_id
       JOIN ward_types wt ON wt.id = w.ward_type_id
       WHERE a.visit_id = $1
       AND w.name != 'Maternity'
       AND NOT EXISTS (
         SELECT 1 FROM invoice_items ii
         WHERE ii.source_table = 'admissions' AND ii.source_id = a.id
       )`,
      [visitId]
    );
    for (const adm of admissionRows.rows) {
      const end = adm.discharge_date ? new Date(adm.discharge_date) : new Date();
      const start = new Date(adm.admission_date);
      const nights = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
      const rate = parseFloat(adm.daily_rate) || 0;
      charges.push({
        category: 'Bed/Ward',
        description: `${adm.ward_name} Ward — ${nights} night(s)`,
        source_table: 'admissions',
        source_id: adm.id,
        quantity: nights,
        unit_price: rate,
        amount: rate * nights
      });
    }

    // Group by category with subtotals, plus grand total
    const byCategory = {};
    let grossTotal = 0;
    for (const c of charges) {
      if (!byCategory[c.category]) byCategory[c.category] = { items: [], subtotal: 0 };
      byCategory[c.category].items.push(c);
      byCategory[c.category].subtotal += parseFloat(c.amount);
      grossTotal += parseFloat(c.amount);
    }

    res.json({
      success: true,
      visit_id: visitId,
      categories: byCategory,
      gross_total: grossTotal
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
module.exports = router;