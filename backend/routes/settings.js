const express = require('express');
const router  = express.Router();
const pool    = require('../config/db');

// GET /api/settings/hospital — used by the sidebar (every page) and Settings page
router.get('/hospital', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM hospital_settings ORDER BY id LIMIT 1');
    res.json({ success: true, settings: result.rows[0] || null });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/settings/hospital — Settings page "Save Changes"
router.put('/hospital', async (req, res) => {
  const { hospital_name, motto, logo_url, facility_code, county, sub_county, phone } = req.body;
  try {
    const existing = await pool.query('SELECT id FROM hospital_settings ORDER BY id LIMIT 1');
    let result;
    if (existing.rows.length === 0) {
      result = await pool.query(
        `INSERT INTO hospital_settings (hospital_name, motto, logo_url, facility_code, county, sub_county, phone)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [hospital_name, motto, logo_url, facility_code, county, sub_county, phone]
      );
    } else {
      result = await pool.query(
        `UPDATE hospital_settings SET
           hospital_name = COALESCE($1, hospital_name),
           motto         = COALESCE($2, motto),
           logo_url      = COALESCE($3, logo_url),
           facility_code = COALESCE($4, facility_code),
           county        = COALESCE($5, county),
           sub_county    = COALESCE($6, sub_county),
           phone         = COALESCE($7, phone),
           updated_at    = NOW()
         WHERE id = $8 RETURNING *`,
        [hospital_name, motto, logo_url, facility_code, county, sub_county, phone, existing.rows[0].id]
      );
    }
    res.json({ success: true, settings: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;