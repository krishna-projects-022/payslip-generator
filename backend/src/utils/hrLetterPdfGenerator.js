const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

function generateHrLetterPDF({ documentType, data, settings }) {
  return new Promise((resolve, reject) => {
    try {
      const margin = 50;

      const doc = new PDFDocument({
        size: 'A4',
        margin: margin,
        info: {
          Title: `${data.employee_name} - ${documentType === 'experience_letter' ? 'Experience Letter' : 'Relieving Letter'}`,
          Author: 'CUSTQ Software Services Pvt. Ltd.',
          Subject: documentType === 'experience_letter' ? 'Experience Certificate' : 'Relieving Certificate'
        }
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });

      const pageWidth = 595.28;
      const pageHeight = 841.89;
      const contentWidth = pageWidth - (margin * 2);

      // ───────────────────────────────────────────────
      // 1. LETTERHEAD — Company name, address & logo
      // ───────────────────────────────────────────────
      const topY = 42;

      // Logo (right side)
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
          doc.image(logoPath, pageWidth - margin - 150, topY, {
            fit: [150, 50],
            align: 'right'
          });
        } catch (e) {
          console.error('Error drawing logo image:', e.message);
        }
      }

      // Company name & address (left side)
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#000000');
      doc.text(settings?.company_name || 'CUSTQ SOFTWARE SERVICES Pvt. Ltd.', margin, topY);

      doc.fontSize(8.5).font('Helvetica').fillColor('#444444');
      doc.text('#5-5-1195, Plot no.8, Sri Ganesh Nagar Colony,', margin, topY + 18);
      doc.text('Opp. Panama Godown, Vanasthalipuram, Hyderabad, Telangana - 500070.', margin, topY + 29);
      doc.text('Website: www.custq.in  |  Email: hr@custq.in', margin, topY + 40);

      // Blue divider line
      const lineY = topY + 58;
      doc.lineWidth(1.5).strokeColor('#2563EB');
      doc.moveTo(margin, lineY).lineTo(pageWidth - margin, lineY).stroke();

      // ───────────────────────────────────────────────
      // 2. REFERENCE NUMBER & DATE
      // ───────────────────────────────────────────────
      const refY = lineY + 16;
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#111111');
      doc.text(`Ref: ${data.reference_number || 'CUSTQ/HR/2026/001'}`, margin, refY, { width: contentWidth / 2, align: 'left' });

      const dateStr = data.letter_date
        ? new Date(data.letter_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
        : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
      doc.text(`Date: ${dateStr}`, margin + (contentWidth / 2), refY, { width: contentWidth / 2, align: 'right' });

      // ───────────────────────────────────────────────
      // 3. DOCUMENT TITLE — Big, centered, underlined
      // ───────────────────────────────────────────────
      const titleY = refY + 40;
      const title = 'TO WHOMSOEVER IT MAY CONCERN';
      doc.fontSize(16).font('Helvetica-Bold').fillColor('#000000');
      doc.text(title, margin, titleY, { width: contentWidth, align: 'center', underline: true });

      // ───────────────────────────────────────────────
      // 4. BODY CONTENT — Larger font, proper spacing
      // ───────────────────────────────────────────────
      const bodyY = titleY + 45;
      const plainBody = stripHtml(data.content_html || '');
      const paragraphs = plainBody.split(/\n\n+/);

      doc.fontSize(11.5).font('Helvetica').fillColor('#1a1a1a');

      doc.y = bodyY;
      paragraphs.forEach((pText) => {
        const cleanP = pText.trim();
        if (cleanP) {
          doc.text(cleanP, margin, doc.y, {
            width: contentWidth,
            align: 'justify',
            lineGap: 4.5
          });
          doc.moveDown(0.9);
        }
      });

      // Additional remarks / note
      if (data.additional_remarks && data.additional_remarks.trim().length > 0) {
        doc.moveDown(0.3);
        doc.font('Helvetica-Oblique').fontSize(10.5).fillColor('#333333');
        doc.text(`Note: ${data.additional_remarks.trim()}`, margin, doc.y, {
          width: contentWidth,
          align: 'left',
          lineGap: 3
        });
      }

      // ───────────────────────────────────────────────
      // 5. WISHES LINE
      // ───────────────────────────────────────────────
      doc.moveDown(0.8);
      doc.fontSize(11.5).font('Helvetica').fillColor('#1a1a1a');
      const wishesText = 'We wish them all the best in their future endeavors.';
      // Only add if not already in the body
      const bodyLower = plainBody.toLowerCase();
      if (!bodyLower.includes('future endeavors') && !bodyLower.includes('future endeavours')) {
        doc.text(wishesText, margin, doc.y, {
          width: contentWidth,
          align: 'justify',
          lineGap: 4
        });
        doc.moveDown(0.5);
      }

      // ───────────────────────────────────────────────
      // 6. SIGNATURE BLOCK — Right-aligned, tight spacing
      // ───────────────────────────────────────────────
      doc.page.margins.bottom = 0; // allow full-page positioning

      const contentEndY = doc.y + 20;
      const sigBlockHeight = 125;
      const footerHeight = 35;
      const minSigY = pageHeight - margin - sigBlockHeight - footerHeight;
      // Place signature right after content, but never overflow page
      const sigY = Math.min(Math.max(contentEndY, minSigY), minSigY);

      // Signature stamp image
      let sigPath = path.join(__dirname, '../../uploads/custq_signature.png');
      if (settings && settings.signature_image) {
        const customSig = path.isAbsolute(settings.signature_image)
          ? settings.signature_image
          : path.join(__dirname, '../../', settings.signature_image);
        if (fs.existsSync(customSig)) {
          sigPath = customSig;
        }
      }

      const sigBoxWidth = 230;
      const sigBoxX = pageWidth - margin - sigBoxWidth;

      doc.fontSize(10.5).font('Helvetica-Bold').fillColor('#000000');
      doc.text('For CUSTQ SOFTWARE SERVICES Pvt. Ltd.', sigBoxX, sigY, {
        width: sigBoxWidth, align: 'center', lineBreak: false
      });

      if (fs.existsSync(sigPath)) {
        try {
          doc.image(sigPath, sigBoxX + (sigBoxWidth - 80) / 2, sigY + 16, {
            fit: [80, 80],
            align: 'center'
          });
        } catch (e) {
          console.error('Error embedding stamp image:', e.message);
        }
      }

      doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000');
      doc.text('Authorized Signatory', sigBoxX, sigY + 98, {
        width: sigBoxWidth, align: 'center', lineBreak: false
      });
      doc.fontSize(8.5).font('Helvetica').fillColor('#666666');
      doc.text('Human Resources Department', sigBoxX, sigY + 112, {
        width: sigBoxWidth, align: 'center', lineBreak: false
      });

      // ───────────────────────────────────────────────
      // 7. FOOTER — thin line + company address
      // ───────────────────────────────────────────────
      const footerY = pageHeight - margin - 20;
      doc.lineWidth(0.5).strokeColor('#CCCCCC');
      doc.moveTo(margin, footerY).lineTo(pageWidth - margin, footerY).stroke();

      doc.fontSize(7.5).font('Helvetica').fillColor('#888888');
      doc.text(
        'CUSTQ Software Services Pvt. Ltd. • Registered Office: Vanasthalipuram, Hyderabad - 500070 • www.custq.in',
        margin, footerY + 6,
        { width: contentWidth, align: 'center', lineBreak: false }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateHrLetterPDF, stripHtml };
