const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { numberToIndianWords } = require('./numberToWords');

function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return '0';
  const val = Number(num);
  if (Number.isInteger(val)) {
    return val.toString();
  }
  return val.toFixed(2);
}

function generatePayslipPDF({ employee, salary, settings, period }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        info: {
          Title: `Payslip - ${employee.employee_id || employee.emp_code} - ${period?.monthName || ''} ${period?.year || ''}`,
          Author: 'CUSTQ Software Services Pvt. Ltd.',
          Subject: 'Monthly Salary Pay Slip'
        }
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });

      const pageWidth = 595.28;
      const margin = 45;
      const contentWidth = pageWidth - (margin * 2);

      // 1. TOP HEADER & LOGO
      let currentY = 50;

      // Locate uploaded official logo image
      let logoPath = path.join(__dirname, '../../uploads/custq_logo.jpg');
      if (settings && settings.company_logo) {
        const customLogo = path.isAbsolute(settings.company_logo)
          ? settings.company_logo
          : path.join(__dirname, '../../', settings.company_logo);
        if (fs.existsSync(customLogo)) {
          logoPath = customLogo;
        }
      }

      if (fs.existsSync(logoPath)) {
        try {
          doc.image(logoPath, pageWidth - margin - 170, currentY - 10, {
            fit: [170, 65],
            align: 'right'
          });
        } catch (e) {
          console.error('Error drawing logo image:', e.message);
        }
      }

      // Company Info (Left Aligned)
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000');
      doc.text(settings?.company_name || 'CUSTQ SOFTWARE SERVICES Pvt. Ltd.', margin, currentY + 50);

      doc.fontSize(9.5).font('Helvetica').fillColor('#000000');
      doc.text('#5-5-1195, Plot no.8, Sri Ganesh Nagar Colony,', margin, doc.y + 3);
      doc.text('Opp. Panama Godown, Vanasthalipuram, Hyderabad, Telangana - 500070.', margin, doc.y + 3);

      currentY = doc.y + 22;

      // 2. "PAY SLIP" TITLE (Centered, Bold)
      doc.fontSize(11.5).font('Helvetica-Bold').fillColor('#000000');
      doc.text('PAY SLIP', margin, currentY, { width: contentWidth, align: 'center' });

      currentY += 22;

      // 3. EMPLOYEE DETAILS TABLE (Exact 4-column bordered grid matching image)
      const empTableWidth = contentWidth;
      const colW1 = 160;
      const colW2 = 175;
      const colW3 = 85;
      const colW4 = empTableWidth - colW1 - colW2 - colW3;

      const rowH = 19;
      doc.lineWidth(1).strokeColor('#000000');

      const empRows = [
        [
          { text: 'Name of the Employee', bold: true, width: colW1, align: 'left' },
          { text: employee.name || employee.employee_name || '', bold: false, width: colW2, align: 'center' },
          { text: 'Month', bold: true, width: colW3, align: 'center' },
          { text: (period?.monthName || salary.monthName || 'JUNE').toUpperCase(), bold: false, width: colW4, align: 'center' }
        ],
        [
          { text: 'Designation', bold: true, width: colW1, align: 'left' },
          { text: employee.designation || '', bold: false, width: colW2, align: 'center' },
          { text: 'Year', bold: true, width: colW3, align: 'center' },
          { text: String(period?.year || salary.year || 2024), bold: false, width: colW4, align: 'center' }
        ],
        [
          { text: 'Employee ID', bold: true, width: colW1, align: 'left' },
          { text: employee.employee_id || employee.emp_code || '', bold: false, width: colW2, align: 'center' },
          { text: 'CL', bold: true, width: colW3, align: 'center' },
          { text: String(salary.leave_days !== undefined ? salary.leave_days : (employee.cl || 0)), bold: false, width: colW4, align: 'center' }
        ],
        [
          { text: 'Department', bold: true, width: colW1, align: 'left' },
          { text: (employee.department || '').toUpperCase(), bold: false, width: colW2 + colW3 + colW4, align: 'center' }
        ]
      ];

      let tableY = currentY;
      empRows.forEach((r) => {
        let curX = margin;
        r.forEach((cell) => {
          doc.rect(curX, tableY, cell.width, rowH).stroke();
          doc.fontSize(9.5).font(cell.bold ? 'Helvetica-Bold' : 'Helvetica').fillColor('#000000');
          doc.text(cell.text, curX + 6, tableY + 5, {
            width: cell.width - 12,
            align: cell.align || 'left'
          });
          curX += cell.width;
        });
        tableY += rowH;
      });

      currentY = tableY + 25;

      // 4. EARNINGS & DEDUCTIONS TABLE (Exact table matching image)
      const halfW = empTableWidth / 2;
      const itemColW = halfW - 65;
      const amtColW = 65;

      const headerH = 22;
      doc.rect(margin, currentY, halfW, headerH).stroke();
      doc.rect(margin + halfW, currentY, halfW, headerH).stroke();

      doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000');
      doc.text('EARNINGS  (A)', margin, currentY + 6, { width: halfW, align: 'center' });
      doc.text('DEDUCTIONS (B)', margin + halfW, currentY + 6, { width: halfW, align: 'center' });

      currentY += headerH;

      const gross = Number(salary.gross_salary || employee.monthly_gross_salary || 0);
      const basic = salary.basic_salary !== undefined ? Number(salary.basic_salary) : (gross * 0.5);
      const hra = salary.hra !== undefined ? Number(salary.hra) : (gross * 0.3);
      const otherAllowance = salary.other_allowances !== undefined ? Number(salary.other_allowances) : Math.max(0, gross - basic - hra);

      const lop = Number(salary.leave_deduction || salary.lop || 0);
      const pt = Number(salary.pt !== undefined ? salary.pt : 0);
      const pf = Number(salary.pf !== undefined ? salary.pf : 0);
      const tds = Number(salary.tds !== undefined ? salary.tds : 0);
      const totalDeductions = Number(salary.total_deductions !== undefined ? salary.total_deductions : (lop + pt + pf + tds));
      const netPay = Number(salary.net_salary !== undefined ? salary.net_salary : (gross - totalDeductions));

      const earningsData = [
        { label: 'Basic+ DA', amount: formatNumber(basic), bold: true },
        { label: 'HRA', amount: formatNumber(hra), bold: true },
        { label: 'Other Allowance', amount: formatNumber(otherAllowance), bold: true },
        { label: '', amount: '', bold: false },
        { label: '', amount: '', bold: false }
      ];

      const deductionsData = [
        { label: 'LOP', amount: formatNumber(lop), bold: true },
        { label: 'P T', amount: formatNumber(pt), bold: true },
        { label: 'P F', amount: formatNumber(pf), bold: true },
        { label: 'TDS', amount: formatNumber(tds), bold: true },
        { label: 'Total', amount: formatNumber(totalDeductions), bold: true }
      ];

      const tableRowH = 19;
      for (let i = 0; i < 5; i++) {
        const rowY = currentY + (i * tableRowH);

        doc.rect(margin, rowY, itemColW, tableRowH).stroke();
        doc.rect(margin + itemColW, rowY, amtColW, tableRowH).stroke();

        if (earningsData[i].label) {
          doc.fontSize(9.5).font(earningsData[i].bold ? 'Helvetica-Bold' : 'Helvetica').fillColor('#000000');
          doc.text(earningsData[i].label, margin + 6, rowY + 5);
          doc.font('Helvetica').text(earningsData[i].amount, margin + itemColW, rowY + 5, { width: amtColW - 6, align: 'right' });
        }

        doc.rect(margin + halfW, rowY, itemColW, tableRowH).stroke();
        doc.rect(margin + halfW + itemColW, rowY, amtColW, tableRowH).stroke();

        if (deductionsData[i].label) {
          doc.fontSize(9.5).font(deductionsData[i].bold ? 'Helvetica-Bold' : 'Helvetica').fillColor('#000000');
          doc.text(deductionsData[i].label, margin + halfW + 6, rowY + 5);
          doc.font('Helvetica').text(deductionsData[i].amount, margin + halfW + itemColW, rowY + 5, { width: amtColW - 6, align: 'right' });
        }
      }

      currentY += (5 * tableRowH);

      // Summary Footer Row (Total Earnings & NET PAY)
      doc.rect(margin, currentY, itemColW, tableRowH).stroke();
      doc.rect(margin + itemColW, currentY, amtColW, tableRowH).stroke();

      doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#000000');
      doc.text('Total', margin + 6, currentY + 5);
      doc.text(formatNumber(gross), margin + itemColW, currentY + 5, { width: amtColW - 6, align: 'right' });

      doc.rect(margin + halfW, currentY, itemColW, tableRowH).stroke();
      doc.rect(margin + halfW + itemColW, currentY, amtColW, tableRowH).stroke();

      doc.text('NET PAY(A-B)', margin + halfW + 6, currentY + 5);
      doc.text(formatNumber(netPay), margin + halfW + itemColW, currentY + 5, { width: amtColW - 6, align: 'right' });

      currentY += tableRowH + 35;

      // 5. NET PAY IN WORDS
      const rawWords = numberToIndianWords(netPay);
      let wordsFormatted = rawWords.replace(' Only', ' only');
      const inWordsText = `(Net Pay in Words: ${wordsFormatted}).`;

      doc.fontSize(10).font('Helvetica').fillColor('#000000');
      doc.text(inWordsText, margin + 20, currentY);

      // 6. OFFICIAL STAMP & SIGNATURE AT BOTTOM
      const sigY = currentY + 40;
      let sigPath = path.join(__dirname, '../../uploads/custq_signature.png');
      if (settings && settings.signature_image) {
        const customSig = path.isAbsolute(settings.signature_image)
          ? settings.signature_image
          : path.join(__dirname, '../../', settings.signature_image);
        if (fs.existsSync(customSig)) {
          sigPath = customSig;
        }
      }

      if (fs.existsSync(sigPath)) {
        try {
          doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#000000');
          doc.text('For CUSTQ SOFTWARE SERVICES Pvt. Ltd.', pageWidth - margin - 200, sigY, { width: 200, align: 'center' });

          doc.image(sigPath, pageWidth - margin - 150, sigY + 15, {
            fit: [100, 100],
            align: 'center'
          });

          doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000');
          doc.text('Authorized Signatory', pageWidth - margin - 200, sigY + 118, { width: 200, align: 'center' });
        } catch (e) {
          console.error('Error embedding signature image:', e.message);
        }
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generatePayslipPDF };

