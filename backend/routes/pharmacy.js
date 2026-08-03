const express = require('express');
const router  = express.Router();
const pool    = require('../config/db');
const { recordEncounterService } = require('../utils/encounterService');

// GET all drug stock
router.get('/stock', async (req, res) => {
  try {
    const { store } = req.query;
    let where = '';
    const params = [];
    if (store) { where = 'WHERE ds.store = $1'; params.push(store); }
    const result = await pool.query(
      `SELECT ds.*, d.generic_name, d.brand_name, d.strength,
              d.dosage_form, dc.name AS category_name
       FROM drug_stock ds
       JOIN drugs d ON d.id = ds.drug_id
       LEFT JOIN drug_categories dc ON dc.id = d.category_id
       ${where}
       ORDER BY d.generic_name`,
      params
    );
    res.json({ success: true, count: result.rows.length, stock: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET low stock
router.get('/stock/low', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM v_low_stock');
    res.json({ success: true, count: result.rows.length, items: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET expiring drugs
router.get('/stock/expiring', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM v_expiring_drugs');
    res.json({ success: true, count: result.rows.length, items: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET all prescriptions
router.get('/prescriptions', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT pr.*, p.patient_no, p.first_name, p.last_name,
              s.first_name || ' ' || s.last_name AS prescribed_by_name,
              COUNT(pi.id) AS item_count
       FROM prescriptions pr
       JOIN patients p ON p.id = pr.patient_id
       LEFT JOIN staff s ON s.id = pr.prescribed_by
       LEFT JOIN prescription_items pi ON pi.prescription_id = pr.id
       GROUP BY pr.id, p.patient_no, p.first_name,
                p.last_name, s.first_name, s.last_name
       ORDER BY pr.prescribed_at DESC
       LIMIT 50`
    );
    res.json({ success: true, count: result.rows.length, prescriptions: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST add drug to stock
router.post('/stock', async (req, res) => {
  try {
    const {
      drug_id, store, batch_no, quantity, min_quantity,
      expiry_date, unit_cost, selling_price, supplier
    } = req.body;
    if (!drug_id || !quantity) {
      return res.status(400).json({
        success: false, error: 'drug_id and quantity are required'
      });
    }
    const result = await pool.query(
      `INSERT INTO drug_stock (
        drug_id, store, batch_no, quantity, min_quantity,
        expiry_date, unit_cost, selling_price, supplier
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *`,
      [
        drug_id, store || 'Main', batch_no || null,
        quantity, min_quantity || 50, expiry_date || null,
        unit_cost || 0, selling_price || 0, supplier || null
      ]
    );
    res.status(201).json({
      success: true,
      message: 'Drug added to stock',
      stock:   result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST new prescription
router.post('/prescriptions', async (req, res) => {
  try {
    const {
      patient_id, visit_id, consultation_id,
      prescribed_by, notes, items
    } = req.body;
    if (!patient_id || !prescribed_by || !items || !items.length) {
      return res.status(400).json({
        success: false,
        error: 'patient_id, prescribed_by and items are required'
      });
    }
    const count = await pool.query(
      `SELECT COUNT(*) FROM prescriptions
       WHERE EXTRACT(YEAR FROM prescribed_at) = EXTRACT(YEAR FROM NOW())`
    );
    const prescription_no = 'RX-' + new Date().getFullYear() + '-' +
      String(parseInt(count.rows[0].count) + 1).padStart(5, '0');

    const pr = await pool.query(
      `INSERT INTO prescriptions (
        prescription_no, patient_id, visit_id,
        consultation_id, prescribed_by, notes, status
      ) VALUES ($1,$2,$3,$4,$5,$6,'Pending')
      RETURNING *`,
      [
        prescription_no, patient_id, visit_id || null,
        consultation_id || null, prescribed_by, notes || null
      ]
    );
    await recordEncounterService(pool, {
      visit_id: visit_id || null, patient_id, service_type: 'Pharmacy',
      reference_table: 'prescriptions', reference_id: pr.rows[0].id,
      performed_by: prescribed_by, status: 'Pending'
    });

    for (const item of items) {
      await pool.query(
        `INSERT INTO prescription_items (
          prescription_id, drug_id, quantity, dosage,
          frequency, duration, route, instructions
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          pr.rows[0].id, item.drug_id, item.quantity,
          item.dosage || null, item.frequency || null,
          item.duration || null, item.route || 'Oral',
          item.instructions || null
        ]
      );
    }

    res.status(201).json({
      success:         true,
      message:         'Prescription created',
      prescription_no: pr.rows[0].prescription_no,
      prescription:    pr.rows[0]
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET all drugs catalog
router.get('/drugs', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT d.*, dc.name AS category_name
       FROM drugs d
       LEFT JOIN drug_categories dc ON dc.id = d.category_id
       WHERE d.is_active = TRUE
       ORDER BY d.generic_name`
    );
    res.json({ success: true, count: result.rows.length, drugs: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;