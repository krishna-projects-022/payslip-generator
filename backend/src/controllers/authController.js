const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'custq_super_secret_jwt_key_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const userRes = await db.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email.trim()]);
    if (userRes.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = userRes.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Fetch employee details if linked
    let employeeData = null;
    if (user.employee_id) {
      const empRes = await db.query('SELECT * FROM employees WHERE id = $1', [user.employee_id]);
      if (empRes.rows.length > 0) {
        employeeData = empRes.rows[0];
      }
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        employee_id: user.employee_id
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        employee_id: user.employee_id,
        employee: employeeData
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Internal server error during login.' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const userRes = await db.query('SELECT id, email, role, employee_id FROM users WHERE id = $1', [req.user.id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    const user = userRes.rows[0];
    let employeeData = null;
    if (user.employee_id) {
      const empRes = await db.query('SELECT * FROM employees WHERE id = $1', [user.employee_id]);
      if (empRes.rows.length > 0) employeeData = empRes.rows[0];
    }
    res.json({ success: true, user: { ...user, employee: employeeData } });
  } catch (err) {
    console.error('getMe error:', err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};
