// TibaMax HMIS - Authentication Routes
const express   = require('express');
const router    = express.Router();
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const pool      = require('../config/db');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }

    // Find user
    const result = await pool.query(
      `SELECT u.*, s.first_name, s.last_name, s.phone,
              s.department_id, r.name AS role_name,
              d.name AS department_name
       FROM users u
       JOIN staff s ON s.id = u.staff_id
       JOIN roles r ON r.id = u.role_id
       LEFT JOIN departments d ON d.id = s.department_id
       WHERE u.username = $1 AND u.is_active = TRUE`,
      [username]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      });
    }

    // Check password
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      });
    }

    // Update last login
    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    // Generate JWT token
    const token = jwt.sign(
      {
        id:         user.id,
        staff_id:   user.staff_id,
        username:   user.username,
        role:       user.role_name,
        department: user.department_name
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({
      success: true,
      message: `Welcome back, ${user.first_name}!`,
      token,
      user: {
        id:          user.id,
        username:    user.username,
        first_name:  user.first_name,
        last_name:   user.last_name,
        role:        user.role_name,
        department:  user.department_name,
        last_login:  user.last_login
      }
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/register-user (Admin only — create system user)
router.post('/register-user', async (req, res) => {
  try {
    const { staff_id, username, password, role_id } = req.body;
    if (!staff_id || !username || !password || !role_id) {
      return res.status(400).json({
        success: false,
        error: 'staff_id, username, password and role_id are required'
      });
    }

    // Check username not taken
    const existing = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );
    if (existing.rows[0]) {
      return res.status(409).json({
        success: false,
        error: 'Username already taken'
      });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (staff_id, username, password_hash, role_id)
       VALUES ($1, $2, $3, $4) RETURNING id, username`,
      [staff_id, username, password_hash, role_id]
    );

    res.status(201).json({
      success:  true,
      message:  'System user created successfully',
      user:     result.rows[0]
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/auth/me — get current user info from token
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ success: true, user: decoded });
  } catch (err) {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', async (req, res) => {
  try {
    const { username, old_password, new_password } = req.body;
    if (!username || !old_password || !new_password) {
      return res.status(400).json({ success: false, error: 'All fields required' });
    }

    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const valid = await bcrypt.compare(old_password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Old password incorrect' });
    }

    const new_hash = await bcrypt.hash(new_password, 12);
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [new_hash, user.id]
    );

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;