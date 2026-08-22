const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { generatePayslipPDF } = require('../utils/pdfGenerator');

const monthNames = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function cleanNumber(val, defaultVal = 0) {
  if (val === null || val === undefined) return defaultVal;
  if (typeof val === 'number') return isNaN(val) ? defaultVal : val;
  const str = String(val).replace(/[₹$,\s]/g, '').trim();
  const n = parseFloat(str);
  return isNaN(n) ? defaultVal : n;
}

function parseFlexibleExcelRows(filePath) {
  const workbook = xlsx.readFile(filePath);
  const rows = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rawGrid = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (!rawGrid || rawGrid.length === 0) continue;

    // Search for header row in top 20 rows
    let headerRowIdx = -1;
    for (let r = 0; r < Math.min(20, rawGrid.length); r++) {
      const row = rawGrid[r];
      if (!Array.isArray(row)) continue;
      const joined = row.map(c => String(c).toLowerCase().trim()).join(' ');
      if (
        joined.includes('name') ||
        joined.includes('employee') ||
        joined.includes('emp') ||
        joined.includes('salary') ||
        joined.includes('gross') ||
        joined.includes('designation') ||
        joined.includes('dept') ||
        joined.includes('ctc') ||
        joined.includes('basic')
      ) {
        headerRowIdx = r;
        break;
      }
    }

    if (headerRowIdx === -1) headerRowIdx = 0;

    const headers = rawGrid[headerRowIdx].map(h => String(h || '').trim());
    console.log(`Sheet '${sheetName}': Detected Header Row ${headerRowIdx} ->`, headers);

    for (let r = headerRowIdx + 1; r < rawGrid.length; r++) {
      const row = rawGrid[r];
      if (!Array.isArray(row)) continue;

      // Skip completely empty rows
      const hasAnyValue = row.some(cell => String(cell).trim() !== '');
      if (!hasAnyValue) continue;

      const obj = { __sheetName: sheetName };
      headers.forEach((headerName, colIdx) => {
        if (headerName) {
          obj[headerName] = row[colIdx] !== undefined ? row[colIdx] : '';
        } else {
          obj[`col_${colIdx}`] = row[colIdx] !== undefined ? row[colIdx] : '';
        }
      });
      rows.push(obj);
    }
  }

  return rows;
}

function getVal(row, possibleKeys, defaultVal = null) {
  const normKeys = possibleKeys.map(k => k.toLowerCase().replace(/[^a-z0-9]/g, ''));
  for (const rowKey of Object.keys(row)) {
    const normRowKey = rowKey.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normKeys.includes(normRowKey)) {
      const v = row[rowKey];
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        return v;
      }
    }
  }
  return defaultVal;
}


exports.downloadTemplate = async (req, res) => {
  try {
    const sampleData = [
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
        'Name of the Employee': 'Priya Sundaram',
        'Designation': 'Software Engineer',
        'Department': 'ENGINEERING',
        'Month': 'JUNE',
        'Year': 2024,
        'CL': 1,
        'Basic+ DA': 15000,
        'HRA': 9000,
        'Other Allowance': 6000,
        'Total Earnings': 30000,
        'LOP': 1153.85,
        'P T': 200,
        'P F': 1800,
        'TDS': 0,
        'Total Deductions': 3153.85,
        'NET PAY(A-B)': 26846.15
      }
    ];

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(sampleData);
    xlsx.utils.book_append_sheet(wb, ws, 'CUSTQ_Payroll');

    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="CUSTQ_Payroll_Template.xlsx"');
    res.send(buffer);
  } catch (err) {
    console.error('Template download error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate Excel template.' });
  }
};

exports.uploadAndProcessExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No Excel file uploaded.' });
    }

    const filePath = req.file.path;
    const rows = parseFlexibleExcelRows(filePath);
    console.log(`Total raw rows parsed from Excel: ${rows.length}`);

    if (!rows || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No data rows found in the uploaded Excel file.' });
    }

    const settingsRes = await db.query('SELECT * FROM application_settings LIMIT 1');
    const settings = settingsRes.rows[0] || {};
    const defaultPasswordHash = await bcrypt.hash('Welcome@123', 10);

    const payslipDir = path.join(__dirname, '../../uploads/payslips');
    if (!fs.existsSync(payslipDir)) fs.mkdirSync(payslipDir, { recursive: true });

    const results = [];
    let targetMonthNum = 6;
    let targetYear = 2024;
    let targetMonthName = 'JUNE';

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      let empId = getVal(row, ['Employee ID', 'Emp ID', 'Employee Code', 'Emp Code', 'ID', 'Code', 'SNo', 'SlNo']);
      let name = getVal(row, ['Name of the Employee', 'Employee Name', 'Name', 'Full Name', 'Staff Name']);

      // If empId is missing but name exists, generate CSQ00X
      if (!empId && name) {
        empId = `CSQ${String(i + 1).padStart(3, '0')}`;
      }

      // If name is missing, try looking for any non-numeric string column
      if (!name) {
        for (const [k, v] of Object.entries(row)) {
          if (typeof v === 'string' && v.trim().length > 2 && isNaN(v)) {
            name = v.trim();
            break;
          }
        }
      }

      if (!name) {
        console.log(`Skipping row ${i} - no name found:`, row);
        continue;
      }

      empId = String(empId || `CSQ${String(i + 1).padStart(3, '0')}`).trim();
      name = String(name).trim();

      const designation = String(getVal(row, ['Designation', 'Role', 'Position', 'Desig'], 'Team Member')).trim();
      const department = String(getVal(row, ['Department', 'Dept', 'Division'], 'WEB DEVELOPMENT')).trim();
      const email = String(getVal(row, ['Email', 'Email Address', 'Mail'], `${empId.toLowerCase()}@custq.com`)).trim();
      const phone = String(getVal(row, ['Phone', 'Mobile', 'Contact'], '')).trim();
      const cl = cleanNumber(getVal(row, ['CL', 'Deductible Leaves', 'Leaves Taken', 'Leave Days', 'Leaves', 'Leave', 'LOP Days']), 0);

      // Month & Year handling (checks column first, then sheet name e.g. "May", "June")
      let rawMonth = getVal(row, ['Month', 'Payroll Month', 'Period Month']);
      if (!rawMonth && row.__sheetName) {
        rawMonth = row.__sheetName;
      }
      if (!rawMonth) rawMonth = 'JUNE';

      let monthNum = 6;
      let monthStr = 'JUNE';
      if (typeof rawMonth === 'number' && rawMonth >= 1 && rawMonth <= 12) {
        monthNum = rawMonth;
        monthStr = (monthNames[monthNum] || 'JUNE').toUpperCase();
      } else {
        const foundIdx = monthNames.findIndex(m => m.toLowerCase() === String(rawMonth).toLowerCase().trim());
        if (foundIdx > 0) {
          monthNum = foundIdx;
          monthStr = monthNames[foundIdx].toUpperCase();
        } else {
          monthStr = String(rawMonth || 'JUNE').toUpperCase();
        }
      }

      const year = parseInt(getVal(row, ['Year', 'Payroll Year'], 2024), 10) || 2024;
      targetMonthNum = monthNum;
      targetYear = year;
      targetMonthName = monthStr;

      // Earnings line items
      let basic = getVal(row, ['Basic Pay (50%)', 'Basic Pay', 'Basic+ DA', 'Basic + DA', 'Basic DA', 'Basic']);
      let hra = getVal(row, ['HRA', 'House Rent Allowance']);
      let otherAllowance = getVal(row, ['Other Allowance', 'Other Allowances', 'Special Allowance', 'Allowance']);
      let totalEarnings = getVal(row, ['Monthly CTC', 'Total Earnings', 'Total Gross', 'Gross Salary', 'Gross', 'Monthly Gross Salary', 'Total', 'Take Home Salary']);

      if (totalEarnings !== null) {
        totalEarnings = cleanNumber(totalEarnings, 22000);
      } else if (basic !== null && hra !== null) {
        totalEarnings = cleanNumber(basic) + cleanNumber(hra) + cleanNumber(otherAllowance, 0);
      } else {
        totalEarnings = 22000;
      }

      if (basic !== null) basic = cleanNumber(basic);
      else basic = totalEarnings * 0.5;

      if (hra !== null) hra = cleanNumber(hra);
      else hra = totalEarnings * 0.3;

      if (otherAllowance !== null) otherAllowance = cleanNumber(otherAllowance);
      else otherAllowance = Math.max(0, totalEarnings - basic - hra);

      // Deductions line items
      let lop = getVal(row, ['Leave Deduction', 'LOP', 'LOP / Leave Deduction', 'Leave Deductions']);
      let pt = getVal(row, ['P T', 'PT', 'Professional Tax']);
      let pf = getVal(row, ['PF (12% of Basic)', 'P F', 'PF', 'Provident Fund']);
      let tds = getVal(row, ['TDS', 'Tax']);
      let totalDeductions = getVal(row, ['Total Deductions', 'Total Deduction']);
      let netPay = getVal(row, ['Take Home Salary', 'NET PAY(A-B)', 'NET PAY', 'Net Pay', 'Net Salary']);


      if (lop !== null) {
        lop = cleanNumber(lop);
      } else {
        const daily = totalEarnings / 26;
        lop = Number((daily * cl).toFixed(2));
      }

      if (pt !== null) pt = cleanNumber(pt);
      else pt = 0;

      if (pf !== null) pf = cleanNumber(pf);
      else pf = 0;

      if (tds !== null) tds = cleanNumber(tds);
      else tds = 0;

      if (totalDeductions !== null) {
        totalDeductions = cleanNumber(totalDeductions);
      } else {
        totalDeductions = Number((lop + pt + pf + tds).toFixed(2));
      }

      if (netPay !== null) {
        netPay = cleanNumber(netPay);
      } else {
        netPay = Number((totalEarnings - totalDeductions).toFixed(2));
      }

      // 1. Upsert Employee in PostgreSQL
      const empRes = await db.query(`
        INSERT INTO employees (
          employee_id, name, designation, department, email, phone, monthly_gross_salary, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
        ON CONFLICT (employee_id) DO UPDATE SET
          name = EXCLUDED.name,
          designation = EXCLUDED.designation,
          department = EXCLUDED.department,
          monthly_gross_salary = EXCLUDED.monthly_gross_salary
        RETURNING *
      `, [empId, name, designation, department, email, phone, totalEarnings]);

      const employee = empRes.rows[0];

      if (email) {
        await db.query(`
          INSERT INTO users (email, password_hash, role, employee_id)
          VALUES ($1, $2, 'employee', $3)
          ON CONFLICT (email) DO UPDATE SET employee_id = EXCLUDED.employee_id
        `, [email, defaultPasswordHash, employee.id]);
      }

      // 2. Ensure Payroll Period
      const periodRes = await db.query(`
        INSERT INTO payroll_periods (month, year, working_days, pt_amount, status)
        VALUES ($1, $2, 26, $3, 'open')
        ON CONFLICT (month, year) DO NOTHING
        RETURNING *
      `, [monthNum, year, pt]);

      let period = periodRes.rows[0];
      if (!period) {
        const pGet = await db.query('SELECT * FROM payroll_periods WHERE month = $1 AND year = $2', [monthNum, year]);
        period = pGet.rows[0];
      }

      const paymentRef = `PAY-${year}${String(monthNum).padStart(2, '0')}-${employee.employee_id}-${Math.floor(1000 + Math.random() * 9000)}`;

      // 3. Save Salary Record
      const insertSalary = await db.query(`
        INSERT INTO salaries (
          employee_id, payroll_period_id, gross_salary, basic_salary, pf, pt,
          leave_days, leave_deduction, tds, other_deductions, total_deductions,
          net_salary, payment_status, payment_reference, paid_at, paid_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'paid', $13, CURRENT_TIMESTAMP, $14
        )
        ON CONFLICT (employee_id, payroll_period_id) DO UPDATE SET
          gross_salary = EXCLUDED.gross_salary,
          basic_salary = EXCLUDED.basic_salary,
          pf = EXCLUDED.pf,
          pt = EXCLUDED.pt,
          leave_days = EXCLUDED.leave_days,
          leave_deduction = EXCLUDED.leave_deduction,
          tds = EXCLUDED.tds,
          other_deductions = EXCLUDED.other_deductions,
          total_deductions = EXCLUDED.total_deductions,
          net_salary = EXCLUDED.net_salary,
          payment_status = 'paid',
          paid_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `, [
        employee.id, period.id, totalEarnings, basic, pf, pt,
        cl, lop, tds, otherAllowance, totalDeductions,
        netPay, paymentRef, req.user ? req.user.id : null
      ]);

      const salaryRecord = insertSalary.rows[0];

      // 4. Generate EXACT Payslip PDF
      const prefix = settings.payslip_prefix || 'CUSTQ-PS-';
      const payslipNumber = `${prefix}${year}${String(monthNum).padStart(2, '0')}-${employee.employee_id}`;
      const empNameClean = String(employee.name || employee.employee_id || 'Employee').trim().replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_');
   const pdfFilename = `${empNameClean}_${monthStr}_${year}.pdf`;
      const pdfRelativePath = `uploads/payslips/${pdfFilename}`;
      const pdfFullPath = path.join(payslipDir, pdfFilename);

      const pdfBuffer = await generatePayslipPDF({
        employee: {
          ...employee,
          cl
        },
        salary: {
          ...salaryRecord,
          hra,
          other_allowances: otherAllowance,
          monthName: monthStr,
          year
        },
        settings,
        period: {
          month: monthNum,
          year,
          monthName: monthStr
        }
      });

      fs.writeFileSync(pdfFullPath, pdfBuffer);

      // 5. Upsert Payslip Record
      const psRes = await db.query(`
        INSERT INTO payslips (salary_id, employee_id, payslip_number, pdf_path, generated_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        ON CONFLICT (payslip_number) DO UPDATE
        SET pdf_path = EXCLUDED.pdf_path, generated_at = CURRENT_TIMESTAMP
        RETURNING *
      `, [salaryRecord.id, employee.id, payslipNumber, pdfRelativePath]);

      results.push({
        employee_id: employee.employee_id,
        name: employee.name,
        designation: employee.designation,
        department: employee.department,
        month: monthStr,
        year,
        cl,
        grossSalary: totalEarnings,
        basic,
        hra,
        otherAllowance,
        lop,
        pt,
        pf,
        tds,
        totalDeductions,
        netSalary: netPay,
        payslipId: psRes.rows[0].id,
        payslipNumber,
        pdfFilename
      });
    }

    try { fs.unlinkSync(filePath); } catch (e) {}

    console.log(`Successfully processed ${results.length} payslips.`);

    res.json({
      success: true,
      message: `Successfully processed Excel and generated ${results.length} payslips!`,
      count: results.length,
      month: targetMonthNum,
      year: targetYear,
      monthName: targetMonthName,
      bulkDownloadZipUrl: `/api/payslips/bulk-download/${targetMonthNum}/${targetYear}`,
      payslips: results
    });
  } catch (err) {
    console.error('Excel processing error:', err);
    res.status(500).json({ success: false, message: 'Failed to process Excel: ' + err.message });
  }
};
