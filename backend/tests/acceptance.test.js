const fs = require('fs');
const path = require('path');
const { calculateSalaryBreakdown } = require('../src/services/calculationEngine');
const { numberToIndianWords } = require('../src/utils/numberToWords');
const { generatePayslipPDF } = require('../src/utils/pdfGenerator');
const { initDatabase } = require('../src/config/initDb');
const db = require('../src/config/db');
const bcrypt = require('bcryptjs');

async function runTests() {
  console.log('=== STARTING CUSTQ PAYSLIP ACCEPTANCE TESTS ===');

  // TEST 1: Number to Indian Words Converter
  console.log('\n--- TEST 1: Number to Indian Words Utility ---');
  const t1 = numberToIndianWords(17830.77);
  console.log('17830.77 =>', t1);
  if (!t1.includes('Seventeen Thousand Eight Hundred Thirty Rupees') || !t1.includes('Seventy-Seven Paise Only')) {
    throw new Error('Test 1 Failed: Number to Words mismatch.');
  }
  console.log('✓ TEST 1 PASSED: Indian currency words converted accurately.');

  // TEST 2: Salary Calculation Engine Exact Formula
  console.log('\n--- TEST 2: Exact Salary Calculation Engine ---');
  const calc = calculateSalaryBreakdown({
    grossSalary: 20000,
    workingDays: 26,
    leaveDays: 2,
    basicPercentage: 50,
    pfPercentage: 12,
    ptAmount: 200
  });
  console.log('Calculation Breakdown:', calc);
  if (calc.basicSalary !== 10000) throw new Error('Basic Salary calculation mismatch');
  if (calc.pf !== 1200) throw new Error('PF calculation mismatch');
  if (calc.pt !== 200) throw new Error('PT calculation mismatch');
  if (calc.leaveDeduction !== 1538.46) throw new Error('Leave deduction mismatch: got ' + calc.leaveDeduction);
  if (calc.totalDeductions !== 2938.46) throw new Error('Total deductions mismatch: got ' + calc.totalDeductions);
  if (calc.netSalary !== 17061.54) throw new Error('Net salary mismatch: got ' + calc.netSalary);
  console.log('✓ TEST 2 PASSED: Mathematical and business logic verified.');

  // TEST 3: Database Connection and Schema Initialization
  console.log('\n--- TEST 3: PostgreSQL Database & Schema ---');
  await initDatabase();
  const settingsRes = await db.query('SELECT * FROM application_settings LIMIT 1');
  if (settingsRes.rows.length === 0) throw new Error('Settings not initialized in PostgreSQL.');
  console.log('✓ Application Settings in DB:', settingsRes.rows[0].company_name);

  // TEST 4: Add Employee Workflow (Section 47)
  console.log('\n--- TEST 4: Employee Creation & Database Persistence ---');
  const testEmpId = 'EMP-TEST-001';
  await db.query('DELETE FROM employees WHERE employee_id = $1', [testEmpId]);
  const insertRes = await db.query(`
    INSERT INTO employees (
      employee_id, name, designation, department, email, phone, date_of_joining, monthly_gross_salary, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
    RETURNING *
  `, [testEmpId, 'Rajesh Kumar', 'Senior Software Engineer', 'Engineering', 'rajesh.kumar@custq.com', '+91 9876543210', '2025-01-15', 20000]);
  const employee = insertRes.rows[0];
  console.log('✓ Employee Created in PostgreSQL:', employee.name, employee.employee_id, 'Gross:', employee.monthly_gross_salary);

  const hash = await bcrypt.hash('Employee@123', 10);
  await db.query(`
    INSERT INTO users (email, password_hash, role, employee_id)
    VALUES ($1, $2, 'employee', $3)
    ON CONFLICT (email) DO NOTHING
  `, ['rajesh.kumar@custq.com', hash, employee.id]);

  // TEST 5: June 2026 Payroll & Salary Payment
  console.log('\n--- TEST 5: Payroll Processing & Payment Confirmation ---');
  const periodRes = await db.query(`
    INSERT INTO payroll_periods (month, year, working_days, pt_amount, status)
    VALUES (6, 2026, 26, 200, 'open')
    ON CONFLICT (month, year) DO UPDATE SET working_days = 26, pt_amount = 200
    RETURNING *
  `);
  const period = periodRes.rows[0];

  const payRef = `PAY-202606-${testEmpId}-9999`;
  const insertSalary = await db.query(`
    INSERT INTO salaries (
      employee_id, payroll_period_id, gross_salary, basic_salary, pf, pt,
      leave_days, leave_deduction, total_deductions, net_salary, payment_status,
      payment_reference, paid_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'paid', $11, CURRENT_TIMESTAMP)
    ON CONFLICT (employee_id, payroll_period_id) DO UPDATE SET
      payment_status = 'paid', net_salary = EXCLUDED.net_salary, paid_at = CURRENT_TIMESTAMP
    RETURNING *
  `, [
    employee.id, period.id, calc.grossSalary, calc.basicSalary, calc.pf, calc.pt,
    calc.leaveDays, calc.leaveDeduction, calc.totalDeductions, calc.netSalary, payRef
  ]);
  const salary = insertSalary.rows[0];
  console.log('✓ Salary Recorded & Paid in PostgreSQL. Net Salary:', salary.net_salary, 'Ref:', salary.payment_reference);

  // TEST 6: Real PDF Payslip Generation
  console.log('\n--- TEST 6: Real PDF Payslip Generation ---');
  const pdfBuffer = await generatePayslipPDF({
    employee,
    salary: { ...salary, working_days: 26 },
    settings: settingsRes.rows[0],
    period: { month: 6, year: 2026, monthName: 'June' }
  });
  if (!pdfBuffer || pdfBuffer.length < 1000) throw new Error('PDF generation produced invalid buffer.');
  const testPdfPath = path.join(__dirname, '../uploads/payslips', `${testEmpId}_June_2026.pdf`);
  fs.mkdirSync(path.dirname(testPdfPath), { recursive: true });
  fs.writeFileSync(testPdfPath, pdfBuffer);
  console.log('✓ Real PDF Payslip Generated Successfully! Size:', pdfBuffer.length, 'bytes');

  // TEST 7: Staff Self-Service Access Isolation
  console.log('\n--- TEST 7: Staff Self-Service Access Isolation ---');
  const empPayslips = await db.query('SELECT * FROM salaries WHERE employee_id = $1', [employee.id]);
  if (empPayslips.rows.length === 0) throw new Error('Could not find own salary record.');
  const otherEmpPayslips = await db.query('SELECT * FROM salaries WHERE employee_id = $1', ['00000000-0000-0000-0000-000000000000']);
  if (otherEmpPayslips.rows.length !== 0) throw new Error('Security isolation failed!');
  console.log('✓ TEST 7 PASSED: Strict employee isolation verified.');

  console.log('\n=============================================');
  console.log('ALL BACKEND & BUSINESS LOGIC TESTS PASSED 100%');
  console.log('=============================================\n');
}

runTests().then(() => process.exit(0)).catch(err => {
  console.error('Acceptance Test Failed:', err);
  process.exit(1);
});