const db = require('../config/db');
const { calculateSalaryBreakdown } = require('../services/calculationEngine');
const { generatePayslipPDF } = require('../utils/pdfGenerator');
const fs = require('fs');
const path = require('path');

const monthNames = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

async function getOrCreatePeriod(month, year, workingDays, ptAmount) {
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);

  const existing = await db.query(
    'SELECT * FROM payroll_periods WHERE month = $1 AND year = $2',
    [m, y]
  );

  if (existing.rows.length > 0) {
    if (workingDays !== undefined || ptAmount !== undefined) {
      const updateRes = await db.query(`
        UPDATE payroll_periods
        SET working_days = COALESCE($1, working_days),
            pt_amount = COALESCE($2, pt_amount)
        WHERE id = $3
        RETURNING *
      `, [workingDays ? parseInt(workingDays, 10) : null, ptAmount !== undefined ? Number(ptAmount) : null, existing.rows[0].id]);
      return updateRes.rows[0];
    }
    return existing.rows[0];
  }

  // Get default from settings
  const settingsRes = await db.query('SELECT * FROM application_settings LIMIT 1');
  const settings = settingsRes.rows[0] || {};
  const wDays = workingDays ? parseInt(workingDays, 10) : (settings.default_working_days || 26);
  const pt = ptAmount !== undefined ? Number(ptAmount) : (settings.pt_amount || 200);

  const insertRes = await db.query(`
    INSERT INTO payroll_periods (month, year, working_days, pt_amount, status)
    VALUES ($1, $2, $3, $4, 'open')
    RETURNING *
  `, [m, y, wDays, pt]);

  return insertRes.rows[0];
}

exports.getPayrollForPeriod = async (req, res) => {
  try {
    const { month, year } = req.params;
    const { workingDays, ptAmount } = req.query;

    const m = parseInt(month, 10);
    const y = parseInt(year, 10);

    if (!m || !y || m < 1 || m > 12 || y < 2000) {
      return res.status(400).json({ success: false, message: 'Invalid month or year provided.' });
    }

    const period = await getOrCreatePeriod(m, y, workingDays, ptAmount);
    const settingsRes = await db.query('SELECT * FROM application_settings LIMIT 1');
    const settings = settingsRes.rows[0] || {};

    // Get all active employees
    const employeesRes = await db.query(`
      SELECT * FROM employees
      WHERE status = 'active'
      ORDER BY employee_id ASC
    `);

    // Get existing salaries recorded for this period
    const salariesRes = await db.query(`
      SELECT s.*, ps.id as payslip_id, ps.payslip_number, ps.pdf_path
      FROM salaries s
      LEFT JOIN payslips ps ON ps.salary_id = s.id
      WHERE s.payroll_period_id = $1
    `, [period.id]);

    const salaryMap = new Map();
    salariesRes.rows.forEach(s => salaryMap.set(s.employee_id, s));

    const payrollItems = employeesRes.rows.map(emp => {
      const existingSalary = salaryMap.get(emp.id);

      if (existingSalary) {
        return {
          employee: emp,
          salaryId: existingSalary.id,
          grossSalary: Number(existingSalary.gross_salary),
          basicSalary: Number(existingSalary.basic_salary),
          pf: Number(existingSalary.pf),
          pt: Number(existingSalary.pt),
          leaveDays: Number(existingSalary.leave_days),
          leaveDeduction: Number(existingSalary.leave_deduction),
          tds: Number(existingSalary.tds),
          otherDeductions: Number(existingSalary.other_deductions),
          totalDeductions: Number(existingSalary.total_deductions),
          netSalary: Number(existingSalary.net_salary),
          paymentStatus: existingSalary.payment_status,
          paymentReference: existingSalary.payment_reference,
          paidAt: existingSalary.paid_at,
          payslipId: existingSalary.payslip_id,
          payslipNumber: existingSalary.payslip_number
        };
      }

      // Compute standard default breakdown
      const breakdown = calculateSalaryBreakdown({
        grossSalary: Number(emp.monthly_gross_salary) || 0,
        leaveDays: 0,
        workingDays: period.working_days || 26,
        basicPercentage: settings.basic_percentage || 50,
        pfPercentage: settings.pf_percentage || 12,
        ptAmount: period.pt_amount !== undefined ? period.pt_amount : 200
      });

      return {
        employee: emp,
        salaryId: null,
        grossSalary: breakdown.grossSalary,
        basicSalary: breakdown.basicSalary,
        pf: breakdown.pf,
        pt: breakdown.pt,
        leaveDays: breakdown.leaveDays,
        leaveDeduction: breakdown.leaveDeduction,
        tds: breakdown.tds,
        otherDeductions: breakdown.otherDeductions,
        totalDeductions: breakdown.totalDeductions,
        netSalary: breakdown.netSalary,
        paymentStatus: 'pending',
        paymentReference: null,
        paidAt: null,
        payslipId: null,
        payslipNumber: null
      };
    });

    // Compute Summary Stats
    const totalEmployees = payrollItems.length;
    let totalGrossSalary = 0;
    let totalDeductions = 0;
    let totalNetPay = 0;
    let paidCount = 0;
    let pendingCount = 0;

    payrollItems.forEach(item => {
      totalGrossSalary += item.grossSalary;
      totalDeductions += item.totalDeductions;
      totalNetPay += item.netSalary;
      if (item.paymentStatus === 'paid') {
        paidCount++;
      } else {
        pendingCount++;
      }
    });

    res.json({
      success: true,
      period: {
        ...period,
        monthName: monthNames[period.month]
      },
      summary: {
        totalEmployees,
        totalGrossSalary: Number(totalGrossSalary.toFixed(2)),
        totalDeductions: Number(totalDeductions.toFixed(2)),
        totalNetPay: Number(totalNetPay.toFixed(2)),
        paidCount,
        pendingCount
      },
      settings,
      items: payrollItems
    });
  } catch (err) {
    console.error('getPayrollForPeriod error:', err);
    res.status(500).json({ success: false, message: 'Failed to load payroll period data.' });
  }
};

exports.calculatePreview = async (req, res) => {
  try {
    const { grossSalary, leaveDays, workingDays, ptAmount } = req.body;
    const settingsRes = await db.query('SELECT * FROM application_settings LIMIT 1');
    const settings = settingsRes.rows[0] || {};

    const breakdown = calculateSalaryBreakdown({
      grossSalary,
      leaveDays,
      workingDays: workingDays || settings.default_working_days || 26,
      basicPercentage: settings.basic_percentage || 50,
      pfPercentage: settings.pf_percentage || 12,
      ptAmount: ptAmount !== undefined ? ptAmount : (settings.pt_amount || 200)
    });

    res.json({ success: true, breakdown });
  } catch (err) {
    console.error('calculatePreview error:', err);
    res.status(500).json({ success: false, message: 'Calculation error.' });
  }
};

exports.paySalary = async (req, res) => {
  try {
    const { employeeId, month, year, leaveDays, workingDays, ptAmount, tds = 0, otherDeductions = 0 } = req.body;

    if (!employeeId || !month || !year) {
      return res.status(400).json({ success: false, message: 'employeeId, month, and year are required.' });
    }

    const empRes = await db.query('SELECT * FROM employees WHERE id = $1', [employeeId]);
    if (empRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }
    const employee = empRes.rows[0];

    const period = await getOrCreatePeriod(month, year, workingDays, ptAmount);
    const settingsRes = await db.query('SELECT * FROM application_settings LIMIT 1');
    const settings = settingsRes.rows[0] || {};

    // Calculate official final numbers
    const breakdown = calculateSalaryBreakdown({
      grossSalary: Number(employee.monthly_gross_salary),
      leaveDays: Number(leaveDays) || 0,
      workingDays: period.working_days,
      basicPercentage: settings.basic_percentage || 50,
      pfPercentage: settings.pf_percentage || 12,
      ptAmount: period.pt_amount,
      tds,
      otherDeductions
    });

    // Check if already paid
    const existingSalary = await db.query(
      'SELECT * FROM salaries WHERE employee_id = $1 AND payroll_period_id = $2',
      [employee.id, period.id]
    );

    const paymentRef = `PAY-${period.year}${String(period.month).padStart(2, '0')}-${employee.employee_id}-${Math.floor(1000 + Math.random() * 9000)}`;

    let salaryRecord;
    if (existingSalary.rows.length > 0) {
      const updateSalary = await db.query(`
        UPDATE salaries SET
          gross_salary = $1,
          basic_salary = $2,
          pf = $3,
          pt = $4,
          leave_days = $5,
          leave_deduction = $6,
          tds = $7,
          other_deductions = $8,
          total_deductions = $9,
          net_salary = $10,
          payment_status = 'paid',
          payment_reference = COALESCE(payment_reference, $11),
          paid_at = CURRENT_TIMESTAMP,
          paid_by = $12,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $13
        RETURNING *
      `, [
        breakdown.grossSalary,
        breakdown.basicSalary,
        breakdown.pf,
        breakdown.pt,
        breakdown.leaveDays,
        breakdown.leaveDeduction,
        breakdown.tds,
        breakdown.otherDeductions,
        breakdown.totalDeductions,
        breakdown.netSalary,
        paymentRef,
        req.user ? req.user.id : null,
        existingSalary.rows[0].id
      ]);
      salaryRecord = updateSalary.rows[0];
    } else {
      const insertSalary = await db.query(`
        INSERT INTO salaries (
          employee_id, payroll_period_id, gross_salary, basic_salary, pf, pt,
          leave_days, leave_deduction, tds, other_deductions, total_deductions,
          net_salary, payment_status, payment_reference, paid_at, paid_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'paid', $13, CURRENT_TIMESTAMP, $14
        )
        RETURNING *
      `, [
        employee.id,
        period.id,
        breakdown.grossSalary,
        breakdown.basicSalary,
        breakdown.pf,
        breakdown.pt,
        breakdown.leaveDays,
        breakdown.leaveDeduction,
        breakdown.tds,
        breakdown.otherDeductions,
        breakdown.totalDeductions,
        breakdown.netSalary,
        paymentRef,
        req.user ? req.user.id : null
      ]);
      salaryRecord = insertSalary.rows[0];
    }

    // Generate Payslip
    const prefix = settings.payslip_prefix || 'CUSTQ-PS-';
    const payslipNumber = `${prefix}${period.year}${String(period.month).padStart(2, '0')}-${employee.employee_id}`;
    const payslipDir = path.join(__dirname, '../../uploads/payslips');
    if (!fs.existsSync(payslipDir)) {
      fs.mkdirSync(payslipDir, { recursive: true });
    }

    const pdfFilename = `${employee.employee_id}_${monthNames[period.month]}_${period.year}.pdf`;
    const pdfRelativePath = `uploads/payslips/${pdfFilename}`;
    const pdfFullPath = path.join(payslipDir, pdfFilename);

    const pdfBuffer = await generatePayslipPDF({
      employee,
      salary: { ...salaryRecord, working_days: period.working_days },
      settings,
      period: { ...period, monthName: monthNames[period.month] }
    });

    fs.writeFileSync(pdfFullPath, pdfBuffer);

    // Upsert payslip record
    const payslipRes = await db.query(`
      INSERT INTO payslips (salary_id, employee_id, payslip_number, pdf_path, generated_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      ON CONFLICT (payslip_number) DO UPDATE
      SET pdf_path = EXCLUDED.pdf_path, generated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [salaryRecord.id, employee.id, payslipNumber, pdfRelativePath]);

    res.json({
      success: true,
      message: 'Salary paid successfully.',
      salary: salaryRecord,
      payslip: payslipRes.rows[0]
    });
  } catch (err) {
    console.error('paySalary error:', err);
    res.status(500).json({ success: false, message: 'Failed to process salary payment: ' + err.message });
  }
};

exports.bulkPaySalaries = async (req, res) => {
  try {
    const { month, year, workingDays, ptAmount, leavesMap = {} } = req.body;

    const m = parseInt(month, 10);
    const y = parseInt(year, 10);

    const period = await getOrCreatePeriod(m, y, workingDays, ptAmount);
    const settingsRes = await db.query('SELECT * FROM application_settings LIMIT 1');
    const settings = settingsRes.rows[0] || {};

    const employeesRes = await db.query("SELECT * FROM employees WHERE status = 'active' ORDER BY employee_id ASC");
    const employees = employeesRes.rows;

    const processed = [];
    const payslipDir = path.join(__dirname, '../../uploads/payslips');
    if (!fs.existsSync(payslipDir)) fs.mkdirSync(payslipDir, { recursive: true });

    for (const emp of employees) {
      const leaveDays = Number(leavesMap[emp.id]) || 0;
      const breakdown = calculateSalaryBreakdown({
        grossSalary: Number(emp.monthly_gross_salary),
        leaveDays,
        workingDays: period.working_days,
        basicPercentage: settings.basic_percentage || 50,
        pfPercentage: settings.pf_percentage || 12,
        ptAmount: period.pt_amount
      });

      const paymentRef = `PAY-${period.year}${String(period.month).padStart(2, '0')}-${emp.employee_id}-${Math.floor(1000 + Math.random() * 9000)}`;

      const insertSalary = await db.query(`
        INSERT INTO salaries (
          employee_id, payroll_period_id, gross_salary, basic_salary, pf, pt,
          leave_days, leave_deduction, total_deductions, net_salary, payment_status,
          payment_reference, paid_at, paid_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'paid', $11, CURRENT_TIMESTAMP, $12
        )
        ON CONFLICT (employee_id, payroll_period_id) DO UPDATE SET
          gross_salary = EXCLUDED.gross_salary,
          basic_salary = EXCLUDED.basic_salary,
          pf = EXCLUDED.pf,
          pt = EXCLUDED.pt,
          leave_days = EXCLUDED.leave_days,
          leave_deduction = EXCLUDED.leave_deduction,
          total_deductions = EXCLUDED.total_deductions,
          net_salary = EXCLUDED.net_salary,
          payment_status = 'paid',
          paid_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `, [
        emp.id, period.id, breakdown.grossSalary, breakdown.basicSalary,
        breakdown.pf, breakdown.pt, breakdown.leaveDays, breakdown.leaveDeduction,
        breakdown.totalDeductions, breakdown.netSalary, paymentRef, req.user ? req.user.id : null
      ]);

      const salaryRecord = insertSalary.rows[0];
      const prefix = settings.payslip_prefix || 'CUSTQ-PS-';
      const payslipNumber = `${prefix}${period.year}${String(period.month).padStart(2, '0')}-${emp.employee_id}`;
      const pdfFilename = `${emp.employee_id}_${monthNames[period.month]}_${period.year}.pdf`;
      const pdfRelativePath = `uploads/payslips/${pdfFilename}`;
      const pdfFullPath = path.join(payslipDir, pdfFilename);

      const pdfBuffer = await generatePayslipPDF({
        employee: emp,
        salary: { ...salaryRecord, working_days: period.working_days },
        settings,
        period: { ...period, monthName: monthNames[period.month] }
      });

      fs.writeFileSync(pdfFullPath, pdfBuffer);

      await db.query(`
        INSERT INTO payslips (salary_id, employee_id, payslip_number, pdf_path, generated_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        ON CONFLICT (payslip_number) DO UPDATE
        SET pdf_path = EXCLUDED.pdf_path, generated_at = CURRENT_TIMESTAMP
      `, [salaryRecord.id, emp.id, payslipNumber, pdfRelativePath]);

      processed.push({
        employee_id: emp.employee_id,
        name: emp.name,
        netSalary: salaryRecord.net_salary,
        payslipNumber
      });
    }

    res.json({
      success: true,
      message: `Successfully processed bulk payroll and generated ${processed.length} payslips.`,
      count: processed.length,
      processed
    });
  } catch (err) {
    console.error('bulkPaySalaries error:', err);
    res.status(500).json({ success: false, message: 'Failed to process bulk payroll.' });
  }
};
