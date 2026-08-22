const app = require('../src/app');
const db = require('../src/config/db');

let server;
let baseUrl;

async function runHrLetterTest() {
  console.log('=== STARTING HR LETTERS (EXPERIENCE & RELIEVING) TEST ===');

  server = app.listen(0);
  const port = server.address().port;
  baseUrl = 'http://localhost:' + port;

  // 1. Login as Admin
  const loginRes = await fetch(baseUrl + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@custq.com', password: 'Admin@123' })
  });
  const { token } = await loginRes.json();
  console.log('✓ Admin login successful.');

  // 2. Generate Experience Letter
  const expRes = await fetch(baseUrl + '/api/hr-documents/generate', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      documentType: 'experience_letter',
      employeeName: 'G Sai Krishna',
      employeeId: 'CSQ021',
      designation: 'Team Leader',
      department: 'Web Development',
      joiningDate: '2023-01-15',
      relievingDate: '2024-06-30',
      experienceDuration: '1 Year, 5 Months',
      referenceNumber: 'CUSTQ/EXP/2026/TEST01',
      letterDate: '2026-06-30',
      contentHtml: '<p>This is to certify that <b>G Sai Krishna</b> (Employee ID: <b>CSQ021</b>) was employed with <b>CUSTQ SOFTWARE SERVICES Pvt. Ltd.</b> from <b>15 January 2023</b> to <b>30 June 2024</b>.</p><p>During his tenure as <b>Team Leader</b>, he led critical software engineering projects with utmost distinction.</p>',
      additionalRemarks: 'We found him to be sincere, dedicated and hardworking.'
    })
  });

  const expData = await expRes.json();
  console.log('Experience Letter API response:', expData.success, expData.document?.reference_number);
  if (!expData.success || !expData.document) throw new Error('Failed to generate Experience Letter');
  console.log('✓ Experience letter generated and saved in PostgreSQL.');

  // 3. Generate Relieving Letter
  const relRes = await fetch(baseUrl + '/api/hr-documents/generate', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      documentType: 'relieving_letter',
      employeeName: 'Diya Patel',
      employeeId: 'CSQ022',
      designation: 'Product Designer',
      department: 'Design & UI',
      joiningDate: '2023-03-01',
      relievingDate: '2024-06-30',
      referenceNumber: 'CUSTQ/REL/2026/TEST02',
      letterDate: '2026-06-30',
      contentHtml: '<p>This has reference to your resignation letter. You are hereby relieved from the services of <b>CUSTQ SOFTWARE SERVICES Pvt. Ltd.</b> as of <b>30 June 2024</b>.</p>',
      additionalRemarks: 'All company assets and clearances have been completed satisfactorily.'
    })
  });

  const relData = await relRes.json();
  console.log('Relieving Letter API response:', relData.success, relData.document?.reference_number);
  if (!relData.success || !relData.document) throw new Error('Failed to generate Relieving Letter');
  console.log('✓ Relieving letter generated and saved in PostgreSQL.');

  // 4. Test PDF Download
  const downRes = await fetch(baseUrl + '/api/hr-documents/download/' + expData.document.id + '?token=' + token);
  const pdfBuffer = await downRes.arrayBuffer();
  console.log('Experience PDF Download Status:', downRes.status, 'Size:', pdfBuffer.byteLength, 'bytes');
  console.log('Content-Disposition:', downRes.headers.get('content-disposition'));
  if (downRes.status !== 200 || pdfBuffer.byteLength < 1000) throw new Error('PDF download failed!');


  // 5. Test List All
  const listRes = await fetch(baseUrl + '/api/hr-documents', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const listData = await listRes.json();
  console.log('Total HR documents in list:', listData.count);
  if (listData.count < 2) throw new Error('HR document count mismatch');

  server.close();
  console.log('\n=== ALL HR LETTERS TESTS PASSED 100% ===\n');
}

runHrLetterTest().then(() => process.exit(0)).catch(err => {
  console.error(err);
  if (server) server.close();
  process.exit(1);
});
