const db = require('../config/db');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const { generatePayslipPDF } = require('../utils/pdfGenerator');

const monthNames = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function parseMonthParam(monthParam) {
  if (!monthParam) return 6;
  const num = parseInt(monthParam, 10);
  if (!isNaN(num) && num >= 1 && num <= 12) return num;

  const str = String(monthParam).trim().toLowerCase();
  const idx = monthNames.findIndex(m => m.toLowerCase() === str);
  if (idx > 0) return idx;

  const shortNames = ['', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const shortIdx = shortNames.findIndex(s => str.startsWith(s));
  if (shortIdx > 0) return shortIdx;

  return 6;
}

exports.getAllPayslips = async (req, res) => {
  try {
    const { month, year, search } = req.query;
    let queryText = `
      SELECT ps.*, e.name as employee_name, e.employee_id as emp_code,
             e.designation, e.department, s.gross_salary, s.total_deductions,
             s.net_salary, s.payment_status, s.paid_at, p.month, p.year
      FROM payslips ps
      JOIN employees e ON ps.employee_id = e.id
      JOIN salaries s ON ps.salary_id = s.id
      JOIN payroll_periods p ON s.payroll_period_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (month) {
      params.push(parseMonthParam(month));
      queryText += ` AND p.month = $${params.length}`;
    }
    if (year) {
      params.push(parseInt(year, 10));
      queryText += ` AND p.year = $${params.length}`;
    }
    if (search) {
      params.push(`%${search.trim()}%`);
      queryText += ` AND (e.name ILIKE $${params.length} OR e.employee_id ILIKE $${params.length} OR ps.payslip_number ILIKE $${params.length})`;
    }

    queryText += ' ORDER BY p.year DESC, p.month DESC, e.employee_id ASC';

    const result = await db.query(queryText, params);
    res.json({
      success: true,
      count: result.rows.length,
      payslips: result.rows.map(row => ({
        ...row,
        monthName: monthNames[row.month] || 'JUNE'
      }))
    });
  } catch (err) {
    console.error('getAllPayslips error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve payslips.' });
  }
};

exports.getPayslipById = async (req, res) => {
  try {
    const { id } = req.params;
    const queryText = `
      SELECT ps.*, e.name as employee_name, e.employee_id as emp_code,
             e.designation, e.department, e.email, e.phone, e.date_of_joining,
             s.gross_salary, s.basic_salary, s.pf, s.pt, s.leave_days,
             s.leave_deduction, s.tds, s.other_deductions, s.total_deductions,
             s.net_salary, s.payment_status, s.payment_reference, s.paid_at,
             p.month, p.year, p.working_days
      FROM payslips ps
      JOIN employees e ON ps.employee_id = e.id
      JOIN salaries s ON ps.salary_id = s.id
      JOIN payroll_periods p ON s.payroll_period_id = p.id
      WHERE ps.id = $1 OR ps.salary_id = $1
    `;
    const result = await db.query(queryText, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Payslip not found.' });
    }

    const payslip = result.rows[0];
    const settingsRes = await db.query('SELECT * FROM application_settings LIMIT 1');
    const settings = settingsRes.rows[0] || {};

    res.json({
      success: true,
      payslip: {
        ...payslip,
        monthName: monthNames[payslip.month] || 'JUNE'
      },
      settings
    });
  } catch (err) {
    console.error('getPayslipById error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve payslip details.' });
  }
};

exports.downloadPayslipPdf = async (req, res) => {
  try {
    const { id } = req.params;
    const queryText = `
      SELECT ps.*, e.name as employee_name, e.employee_id as emp_code,
             e.designation, e.department, e.email, e.phone, e.date_of_joining,
             s.gross_salary, s.basic_salary, s.pf, s.pt, s.leave_days,
             s.leave_deduction, s.tds, s.other_deductions, s.total_deductions,
             s.net_salary, s.payment_status, s.payment_reference, s.paid_at,
             p.month, p.year, p.working_days
      FROM payslips ps
      JOIN employees e ON ps.employee_id = e.id
      JOIN salaries s ON ps.salary_id = s.id
      JOIN payroll_periods p ON s.payroll_period_id = p.id
      WHERE ps.id = $1 OR ps.salary_id = $1
    `;
    const result = await db.query(queryText, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Payslip not found.' });
    }

    const row = result.rows[0];
    const settingsRes = await db.query('SELECT * FROM application_settings LIMIT 1');
    const settings = settingsRes.rows[0] || {};

    const monthStr = monthNames[row.month] || 'JUNE';

    const pdfBuffer = await generatePayslipPDF({
      employee: {
        name: row.employee_name,
        employee_id: row.emp_code,
        designation: row.designation,
        department: row.department,
        cl: row.leave_days || 0
      },
      salary: {
        ...row,
        monthName: monthStr,
        year: row.year
      },
      settings,
      period: {
        month: row.month,
        year: row.year,
        monthName: monthStr
      }
    });

    const empNameClean = String(row.employee_name || row.emp_code || 'Employee').trim().replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_');
   const filename = `${empNameClean}_${monthStr}_${row.year}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('downloadPayslipPdf error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate payslip PDF.' });
  }
};

exports.bulkDownloadZip = async (req, res) => {
  try {
    const { month, year } = req.params;
    const m = parseMonthParam(month);
    const y = parseInt(year, 10) || 2024;

    const queryText = `
      SELECT ps.*, e.name as employee_name, e.employee_id as emp_code,
             e.designation, e.department, e.date_of_joining,
             s.gross_salary, s.basic_salary, s.pf, s.pt, s.leave_days,
             s.leave_deduction, s.tds, s.other_deductions, s.total_deductions,
             s.net_salary, s.payment_reference, p.month, p.year, p.working_days
      FROM payslips ps
      JOIN employees e ON ps.employee_id = e.id
      JOIN salaries s ON ps.salary_id = s.id
      JOIN payroll_periods p ON s.payroll_period_id = p.id
      WHERE p.month = $1 AND p.year = $2
      ORDER BY e.employee_id ASC
    `;

    const result = await db.query(queryText, [m, y]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No payslips found for the selected period.' });
    }

    const settingsRes = await db.query('SELECT * FROM application_settings LIMIT 1');
    const settings = settingsRes.rows[0] || {};
    const monthStr = (monthNames[m] || 'JUNE').toUpperCase();

    const zipFilename = `CUSTQ_Payslips_${monthStr}_${y}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    for (const row of result.rows) {
      const pdfBuffer = await generatePayslipPDF({
        employee: {
          name: row.employee_name,
          employee_id: row.emp_code,
          designation: row.designation,
          department: row.department,
          cl: row.leave_days || 0
        },
        salary: {
          ...row,
          monthName: monthStr,
          year: y
        },
        settings,
        period: { month: m, year: y, monthName: monthStr }
      });

      const empNameClean = String(row.employee_name || row.emp_code || 'Employee').trim().replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_');
   const pdfName = `${empNameClean}_${monthStr}_${y}.pdf`;
      archive.append(pdfBuffer, { name: pdfName });
    }

    await archive.finalize();
  } catch (err) {
    console.error('bulkDownloadZip error:', err);
    res.status(500).json({ success: false, message: 'Failed to create payslips ZIP.' });
  }
};
