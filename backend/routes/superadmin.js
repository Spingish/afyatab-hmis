// TibaMax HMIS - Super Admin Routes
const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const pool    = require('../config/db');
const { requirePermission } = require('../middleware/auth');

// Note: verifyToken already ran globally for /api/superadmin (see server.js),
// so req.user is already populated here. This just checks the permission.
const requireSuperAdmin = requirePermission('superadmin.access');

// GET /api/superadmin/overview — full system overview
router.get('/overview', requireSuperAdmin, async (req, res) => {
  try {
    const [
      patients, visits, users, staff,
      invoices, payments, labReqs, prescriptions,
      roles, depts, notifications
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM patients WHERE is_deleted=FALSE'),
      pool.query('SELECT COUNT(*) FROM visits WHERE visit_date=CURRENT_DATE'),
      pool.query('SELECT COUNT(*) FROM users WHERE is_active=TRUE'),
      pool.query('SELECT COUNT(*) FROM staff WHERE status=\'Active\''),
      pool.query('SELECT COUNT(*) FROM invoices WHERE status IN (\'Pending\',\'Partial\')'),
      pool.query('SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE payment_date=CURRENT_DATE'),
      pool.query('SELECT COUNT(*) FROM lab_requests WHERE requested_at::date=CURRENT_DATE'),
      pool.query('SELECT COUNT(*) FROM prescriptions WHERE prescribed_at::date=CURRENT_DATE'),
      pool.query('SELECT COUNT(*) FROM roles'),
      pool.query('SELECT COUNT(*) FROM departments'),
      pool.query('SELECT COUNT(*) FROM notifications WHERE is_read=FALSE'),
    ]);

    res.json({
      success: true,
      overview: {
        total_patients:      parseInt(patients.rows[0].count),
        visits_today:        parseInt(visits.rows[0].count),
        active_users:        parseInt(users.rows[0].count),
        active_staff:        parseInt(staff.rows[0].count),
        pending_bills:       parseInt(invoices.rows[0].count),
        revenue_today:       parseFloat(payments.rows[0].total),
        lab_requests_today:  parseInt(labReqs.rows[0].count),
        prescriptions_today: parseInt(prescriptions.rows[0].count),
        total_roles:         parseInt(roles.rows[0].count),
        total_departments:   parseInt(depts.rows[0].count),
        unread_notifications:parseInt(notifications.rows[0].count),
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/superadmin/users — all system users
router.get('/users', requireSuperAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.is_active, u.last_login, u.created_at,
              r.name AS role,
              s.staff_no, s.first_name, s.last_name,
              s.phone, s.email, s.department_id,
              d.name AS department_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       JOIN staff s ON s.id = u.staff_id
       LEFT JOIN departments d ON d.id = s.department_id
       ORDER BY u.created_at DESC`
    );
    res.json({ success: true, count: result.rows.length, users: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/superadmin/users — create new system user
router.post('/users', requireSuperAdmin, async (req, res) => {
  try {
    const {
      first_name, last_name, gender, phone, email,
      national_id, department_id, role_id,
      username, password, shift, hire_date
    } = req.body;

    if (!first_name||!last_name||!username||!password||!role_id) {
      return res.status(400).json({
        success: false,
        error: 'first_name, last_name, username, password and role_id are required'
      });
    }

    // Check username not taken
    const existing = await pool.query('SELECT id FROM users WHERE username=$1',[username]);
    if (existing.rows[0]) {
      return res.status(409).json({ success: false, error: 'Username already taken' });
    }

    // Generate staff number
    const count = await pool.query('SELECT COUNT(*) FROM staff');
    const staff_no = 'S' + String(parseInt(count.rows[0].count)+1).padStart(3,'0');

    // Create staff record
    const staffResult = await pool.query(
      `INSERT INTO staff (
        staff_no, first_name, last_name, gender,
        phone, email, national_id, department_id,
        role_id, shift, hire_date, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'Active')
      RETURNING *`,
      [
        staff_no, first_name, last_name, gender||'Male',
        phone||null, email||null, national_id||null,
        department_id||null, role_id,
        shift||'Day', hire_date||null
      ]
    );

    // Hash password and create user
    const password_hash = await bcrypt.hash(password, 12);
    const userResult = await pool.query(
      `INSERT INTO users (staff_id, username, password_hash, role_id, is_active)
       VALUES ($1,$2,$3,$4,TRUE) RETURNING id, username`,
      [staffResult.rows[0].id, username, password_hash, role_id]
    );

    // Log to audit
    await pool.query(
      `INSERT INTO audit_log (user_id, action, table_name, record_id, new_values)
       VALUES ($1,'CREATE','users',$2,$3)`,
      [
        req.user.id,
        userResult.rows[0].id,
        JSON.stringify({ username, role_id, staff_no })
      ]
    );

    res.status(201).json({
      success:  true,
      message:  `User ${username} created successfully`,
      staff_no: staff_no,
      user:     userResult.rows[0]
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/superadmin/users/:id/toggle — activate/deactivate user
router.put('/users/:id/toggle', requireSuperAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE users SET is_active = NOT is_active, updated_at=NOW()
       WHERE id=$1 RETURNING id, username, is_active`,
      [req.params.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({
      success: true,
      message: `User ${result.rows[0].is_active ? 'activated' : 'deactivated'}`,
      user:    result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/superadmin/users/:id/role — change user role
router.put('/users/:id/role', requireSuperAdmin, async (req, res) => {
  try {
    const { role_id } = req.body;
    const result = await pool.query(
      `UPDATE users SET role_id=$1, updated_at=NOW()
       WHERE id=$2 RETURNING id, username, role_id`,
      [role_id, req.params.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, message: 'Role updated', user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/superadmin/users/:id/reset-password — reset password
router.put('/users/:id/reset-password', requireSuperAdmin, async (req, res) => {
  try {
    const { new_password } = req.body;
    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }
    const hash = await bcrypt.hash(new_password, 12);
    await pool.query(
      'UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2',
      [hash, req.params.id]
    );
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/superadmin/audit-log — system audit trail
router.get('/audit-log', requireSuperAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.id, a.action, a.table_name, a.record_id,
              a.new_values, a.performed_at,
              u.username,
              s.first_name || ' ' || s.last_name AS performed_by
       FROM audit_log a
       LEFT JOIN users u ON u.id = a.user_id
       LEFT JOIN staff s ON s.id = u.staff_id
       ORDER BY a.performed_at DESC
       LIMIT 100`
    );
    res.json({ success: true, count: result.rows.length, logs: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/superadmin/roles — all roles
router.get('/roles', requireSuperAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM roles ORDER BY id');
    res.json({ success: true, roles: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/superadmin/departments — all departments
router.get('/departments', requireSuperAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM departments ORDER BY name');
    res.json({ success: true, departments: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;