const db = require('../config/db');

const monthNames = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

exports.getMyPayslips = async (req, res) => {
  try {
    if (!req.user || !req.user.employee_id) {
      return res.status(403).json({ success: false, message: 'User account is not mapped to an employee record.' });
    }

    const employeeId = req.user.employee_id;

    const queryText = `
      SELECT ps.*, e.name as employee_name, e.employee_id as emp_code,
             e.designation, e.department, s.gross_salary, s.total_deductions,
             s.net_salary, s.payment_status, s.paid_at, s.payment_reference,
             p.month, p.year
      FROM payslips ps
      JOIN employees e ON ps.employee_id = e.id
      JOIN salaries s ON ps.salary_id = s.id
      JOIN payroll_periods p ON s.payroll_period_id = p.id
      WHERE ps.employee_id = $1
      ORDER BY p.year DESC, p.month DESC
    `;

    const result = await db.query(queryText, [employeeId]);
    res.json({
      success: true,
      count: result.rows.length,
      payslips: result.rows.map(row => ({
        ...row,
        monthName: monthNames[row.month]
      }))
    });
  } catch (err) {
    console.error('getMyPayslips error:', err);
    res.status(500).json({ success: false, message: 'Failed to load employee payslips.' });
  }
};

exports.getMySalaryHistory = async (req, res) => {
  try {
    if (!req.user || !req.user.employee_id) {
      return res.status(403).json({ success: false, message: 'User is not mapped to an employee.' });
    }

    const employeeId = req.user.employee_id;
    const queryText = `
      SELECT s.*, p.month, p.year, ps.id as payslip_id, ps.payslip_number
      FROM salaries s
      JOIN payroll_periods p ON s.payroll_period_id = p.id
      LEFT JOIN payslips ps ON ps.salary_id = s.id
      WHERE s.employee_id = $1
      ORDER BY p.year DESC, p.month DESC
    `;

    const result = await db.query(queryText, [employeeId]);
    res.json({
      success: true,
      history: result.rows.map(row => ({
        ...row,
        monthName: monthNames[row.month]
      }))
    });
  } catch (err) {
    console.error('getMySalaryHistory error:', err);
    res.status(500).json({ success: false, message: 'Failed to load salary history.' });
  }
};
