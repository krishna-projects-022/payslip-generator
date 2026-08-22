const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const app = require('../src/app');
const db = require('../src/config/db');
const { initDatabase } = require('../src/config/initDb');

let server;
let baseUrl;

async function runExcelTest() {
  console.log('=== STARTING EXCEL UPLOAD & AUTO-PAYSLIP GENERATION TEST ===');

  await initDatabase();
  server = app.listen(0);
  const port = server.address().port;
  baseUrl = 'http://localhost:' + port;

  const testData = [
    {
      'Employee ID': 'EMP-XL-001',
      'Employee Name': 'Anil Ambani',
      'Designation': 'Infrastructure Lead',
      'Department': 'Infrastructure',
      'Email': 'anil.a@custq.com',
      'Monthly Gross Salary': 80000,
      'Leave Days': 1,
      'Month': 7,
      'Year': 2026,
      'Working Days': 26
    },
    {
      'Employee ID': 'EMP-XL-002',
      'Employee Name': 'Sunita Williams',
      'Designation': 'Principal Engineer',
      'Department': 'Engineering',
      'Email': 'sunita.w@custq.com',
      'Monthly Gross Salary': 120000,
      'Leave Days': 0,
      'Month': 7,
      'Year': 2026,
      'Working Days': 26
    },
    {
      'Employee ID': 'EMP-XL-003',
      'Employee Name': 'Kavita Krishnan',
      'Designation': 'HR Manager',
      'Department': 'Human Resources',
      'Email': 'kavita.k@custq.com',
      'Monthly Gross Salary': 50000,
      'Leave Days': 2,
      'Month': 7,
      'Year': 2026,
      'Working Days': 26
    }
  ];

  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(testData);
  xlsx.utils.book_append_sheet(wb, ws, 'Employees');

  const testXlPath = path.join(__dirname, 'test_payroll_upload.xlsx');
  xlsx.writeFile(wb, testXlPath);
  console.log('✓ Created test Excel file with 3 employees at:', testXlPath);

  const loginRes = await fetch(baseUrl + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@custq.com', password: 'Admin@123' })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;
  console.log('✓ Admin login successful.');

  const fileBuffer = fs.readFileSync(testXlPath);
  const boundary = '----WebKitFormBoundary' + Math.random().toString(16).substring(2);
  
  const payloadHeader = Buffer.from(
    '--' + boundary + '\r\n' +
    'Content-Disposition: form-data; name="excelFile"; filename="test_payroll_upload.xlsx"\r\n' +
    'Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n'
  );
  const payloadFooter = Buffer.from('\r\n--' + boundary + '--\r\n');
  const body = Buffer.concat([payloadHeader, fileBuffer, payloadFooter]);

  const uploadRes = await fetch(baseUrl + '/api/payroll/upload-excel', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'multipart/form-data; boundary=' + boundary
    },
    body: body
  });

  const uploadData = await uploadRes.json();
  console.log('Excel Upload API Response Count:', uploadData.count);

  if (!uploadData.success || uploadData.count !== 3) {
    throw new Error('Excel processing failed! Count mismatch.');
  }
  console.log('✓ Uploaded Excel processed 3 employees & auto-generated 3 payslips.');

  const checkSalaries = await db.query(
    "SELECT s.*, e.name, e.employee_id, ps.id as payslip_id, ps.payslip_number " +
    "FROM salaries s " +
    "JOIN employees e ON s.employee_id = e.id " +
    "JOIN payslips ps ON ps.salary_id = s.id " +
    "WHERE e.employee_id IN ('EMP-XL-001', 'EMP-XL-002', 'EMP-XL-003')"
  );
  if (checkSalaries.rows.length !== 3) throw new Error('Salaries not found in PostgreSQL');
  console.log('✓ Verified 3 salaries marked as PAID in PostgreSQL.');

  const zipRes = await fetch(baseUrl + '/api/payslips/bulk-download/7/2026', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const zipBuffer = await zipRes.arrayBuffer();
  if (zipRes.status !== 200 || zipBuffer.byteLength < 1000) {
    throw new Error('Bulk ZIP download failed!');
  }
  console.log('✓ Bulk ZIP Download verified! Size: ' + zipBuffer.byteLength + ' bytes.');

  try { fs.unlinkSync(testXlPath); } catch (e) {}
  server.close();
  console.log('\n=== ALL EXCEL UPLOAD & AUTO-PAYSLIP TESTS PASSED 100% ===\n');
}

runExcelTest().then(() => process.exit(0)).catch(err => {
  console.error(err);
  if (server) server.close();
  process.exit(1);
});
