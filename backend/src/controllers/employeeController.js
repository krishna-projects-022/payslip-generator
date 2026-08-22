const db = require('../config/db');
const bcrypt = require('bcryptjs');

exports.getAllEmployees = async (req, res) => {
  try {
    const { search, department, status } = req.query;
    let queryText = 'SELECT * FROM employees WHERE 1=1';
    const params = [];

    if (search) {
      params.push(`%${search.trim()}%`);
      queryText += ` AND (name ILIKE $${params.length} OR employee_id ILIKE $${params.length} OR designation ILIKE $${params.length} OR department ILIKE $${params.length})`;
    }

    if (department && department !== 'All') {
      params.push(department);
      queryText += ` AND department = $${params.length}`;
    }

    if (status && status !== 'All') {
      params.push(status);
      queryText += ` AND status = $${params.length}`;
    }

    queryText += ' ORDER BY employee_id ASC';

    const result = await db.query(queryText, params);
    res.json({
      success: true,
      count: result.rows.length,
      employees: result.rows
    });
  } catch (err) {
    console.error('getAllEmployees error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve employees.' });
  }
};

exports.getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM employees WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    // Get salary history
    const historyRes = await db.query(`
      SELECT s.*, p.month, p.year, ps.id as payslip_id, ps.payslip_number
      FROM salaries s
      JOIN payroll_periods p ON s.payroll_period_id = p.id
      LEFT JOIN payslips ps ON ps.salary_id = s.id
      WHERE s.employee_id = $1
      ORDER BY p.year DESC, p.month DESC
    `, [id]);

    res.json({
      success: true,
      employee: result.rows[0],
      history: historyRes.rows
    });
  } catch (err) {
    console.error('getEmployeeById error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve employee details.' });
  }
};

exports.createEmployee = async (req, res) => {
  try {
    const {
      employee_id,
      name,
      designation,
      department,
      email,
      phone,
      date_of_joining,
      monthly_gross_salary,
      status = 'active',
      password
    } = req.body;

    if (!employee_id || !name || monthly_gross_salary === undefined) {
      return res.status(400).json({ success: false, message: 'Employee ID, Name, and Monthly Gross Salary are required.' });
    }

    // Check duplicate
    const checkDup = await db.query('SELECT id FROM employees WHERE employee_id = $1', [employee_id.trim()]);
    if (checkDup.rows.length > 0) {
      return res.status(400).json({ success: false, message: `Employee with ID '${employee_id}' already exists.` });
    }

    if (email) {
      const checkEmail = await db.query('SELECT id FROM employees WHERE LOWER(email) = LOWER($1)', [email.trim()]);
      if (checkEmail.rows.length > 0) {
        return res.status(400).json({ success: false, message: 'Email address already registered to another employee.' });
      }
    }

    const insertEmp = await db.query(`
      INSERT INTO employees (
        employee_id, name, designation, department, email, phone, date_of_joining, monthly_gross_salary, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      employee_id.trim(),
      name.trim(),
      designation ? designation.trim() : '',
      department ? department.trim() : '',
      email ? email.trim() : null,
      phone ? phone.trim() : '',
      date_of_joining || new Date(),
      Number(monthly_gross_salary) || 0,
      status
    ]);

    const createdEmp = insertEmp.rows[0];

    // Optionally create user account for employee self-service
    if (email) {
      const defaultPass = password || 'Welcome@123';
      const hash = await bcrypt.hash(defaultPass, 10);
      await db.query(`
        INSERT INTO users (email, password_hash, role, employee_id)
        VALUES ($1, $2, 'employee', $3)
        ON CONFLICT (email) DO NOTHING
      `, [email.trim(), hash, createdEmp.id]);
    }

    res.status(201).json({
      success: true,
      message: 'Employee created successfully.',
      employee: createdEmp
    });
  } catch (err) {
    console.error('createEmployee error:', err);
    res.status(500).json({ success: false, message: 'Failed to create employee: ' + err.message });
  }
};

exports.updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      designation,
      department,
      email,
      phone,
      date_of_joining,
      monthly_gross_salary,
      status
    } = req.body;

    const empRes = await db.query('SELECT * FROM employees WHERE id = $1', [id]);
    if (empRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    const updated = await db.query(`
      UPDATE employees SET
        name = COALESCE($1, name),
        designation = COALESCE($2, designation),
        department = COALESCE($3, department),
        email = COALESCE($4, email),
        phone = COALESCE($5, phone),
        date_of_joining = COALESCE($6, date_of_joining),
        monthly_gross_salary = COALESCE($7, monthly_gross_salary),
        status = COALESCE($8, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *
    `, [
      name,
      designation,
      department,
      email,
      phone,
      date_of_joining,
      monthly_gross_salary !== undefined ? Number(monthly_gross_salary) : null,
      status,
      id
    ]);

    res.json({
      success: true,
      message: 'Employee updated successfully.',
      employee: updated.rows[0]
    });
  } catch (err) {
    console.error('updateEmployee error:', err);
    res.status(500).json({ success: false, message: 'Failed to update employee.' });
  }
};

exports.deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM employees WHERE id = $1', [id]);
    res.json({ success: true, message: 'Employee deleted successfully.' });
  } catch (err) {
    console.error('deleteEmployee error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete employee.' });
  }
};
