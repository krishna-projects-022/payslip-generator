const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

async function testUploadAndZip() {
  const testData = [
    {
      'Employee ID': 'CSQ021',
      'Name of the Employee': 'G Sai Krishna',
      'Designation': 'Team Leader',
      'Department': 'WEB DEVELOPMENT',
      'Month': 'JUNE',
      'Year': 2024,
      'CL': 0,
      'Basic+ DA': 11000,
      'HRA': 6600,
      'Other Allowance': 4400,
      'Total Earnings': 22000,
      'LOP': 0,
      'P T': 0,
      'P F': 0,
      'TDS': 0,
      'Total Deductions': 0,
      'NET PAY(A-B)': 22000
    },
    {
      'Employee ID': 'CSQ022',
      'Name of the Employee': 'Diya Patel',
      'Designation': 'Product Designer',
      'Department': 'DESIGN',
      'Month': 'JUNE',
      'Year': 2024,
      'CL': 1,
      'Basic+ DA': 25000,
      'HRA': 15000,
      'Other Allowance': 10000,
      'Total Earnings': 50000,
      'LOP': 1923.08,
      'P T': 200,
      'P F': 3000,
      'TDS': 0,
      'Total Deductions': 5123.08,
      'NET PAY(A-B)': 44876.92
    }
  ];

  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(testData);
  xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
  const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

  // 1. Login
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@custq.com', password: 'Admin@123' })
  });
  const { token } = await loginRes.json();

  // 2. Upload
  const boundary = '----WebKitFormBoundary' + Math.random().toString(16).substring(2);
  const head = Buffer.from(
    '--' + boundary + '\r\n' +
    'Content-Disposition: form-data; name="excelFile"; filename="CUSTQ_Payroll.xlsx"\r\n' +
    'Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n'
  );
  const foot = Buffer.from('\r\n--' + boundary + '--\r\n');
  const body = Buffer.concat([head, buf, foot]);

  const upRes = await fetch('http://localhost:5000/api/payroll/upload-excel', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'multipart/form-data; boundary=' + boundary
    },
    body
  });

  const upData = await upRes.json();
  console.log('Upload Result:', upData);

  // 3. Test Bulk ZIP Download
  const zipRes = await fetch('http://localhost:5000/api/payslips/bulk-download/6/2024?token=' + token);
  const zipBuf = await zipRes.arrayBuffer();
  console.log('ZIP Status:', zipRes.status, 'ZIP Buffer Size:', zipBuf.byteLength);

  if (upData.count === 2 && zipRes.status === 200 && zipBuf.byteLength > 1000) {
    console.log('✓ TEST PASSED: Excel parsed 2 rows, generated 2 payslips & ZIP is downloadable!');
  } else {
    throw new Error('Test verification failed!');
  }
}

testUploadAndZip().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
