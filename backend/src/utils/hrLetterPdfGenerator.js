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
      // Create A4 document with single page guarantee
      const doc = new PDFDocument({
        size: 'A4',
        margin: 45,
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
      const margin = 45;
      const contentWidth = pageWidth - (margin * 2);

      // 1. TOP HEADER & LOGO (Exact Top Alignment)
      const topY = 40;

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
          doc.image(logoPath, pageWidth - margin - 160, topY, {
            fit: [160, 52],
            align: 'right'
          });
        } catch (e) {
          console.error('Error drawing logo image:', e.message);
        }
      }

      // Company Info (Left Aligned)
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000');
      doc.text(settings?.company_name || 'CUSTQ SOFTWARE SERVICES Pvt. Ltd.', margin, topY);

      doc.fontSize(8.5).font('Helvetica').fillColor('#334155');
      doc.text('#5-5-1195, Plot no.8, Sri Ganesh Nagar Colony,', margin, topY + 16);
      doc.text('Opp. Panama Godown, Vanasthalipuram, Hyderabad, Telangana - 500070.', margin, topY + 28);
      doc.text('Website: www.custq.in  |  Email: hr@custq.in', margin, topY + 40);

      // Elegant dividing line
      const lineY = topY + 56;
      doc.lineWidth(1.2).strokeColor('#2563EB');
      doc.moveTo(margin, lineY).lineTo(pageWidth - margin, lineY).stroke();

      // 2. REFERENCE NUMBER & DATE
      const refY = lineY + 12;
      doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0F172A');
      doc.text(`Ref: ${data.reference_number || 'CUSTQ/HR/2026/001'}`, margin, refY, { width: contentWidth / 2, align: 'left' });

      const dateStr = data.letter_date
        ? new Date(data.letter_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
        : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
      doc.font('Helvetica-Bold').text(`Date: ${dateStr}`, margin + (contentWidth / 2), refY, { width: contentWidth / 2, align: 'right' });

      // 3. DOCUMENT TITLE
      const titleY = refY + 28;
      const title = documentType === 'experience_letter' ? 'TO WHOMSOEVER IT MAY CONCERN' : 'RELIEVING LETTER';
      doc.fontSize(12.5).font('Helvetica-Bold').fillColor('#000000');
      doc.text(title, margin, titleY, { width: contentWidth, align: 'center', underline: true });

      // 4. BODY CONTENT
      let bodyY = titleY + 28;
      const plainBody = stripHtml(data.content_html || '');
      const paragraphs = plainBody.split(/\n\n+/);

      doc.fontSize(10).font('Helvetica').fillColor('#1E293B').lineGap(3.5);

      doc.y = bodyY;
      paragraphs.forEach((pText) => {
        const cleanP = pText.trim();
        if (cleanP) {
          doc.text(cleanP, margin, doc.y, {
            width: contentWidth,
            align: 'justify',
            lineGap: 3.5
          });
          doc.moveDown(0.7);
        }
      });

      if (data.additional_remarks && data.additional_remarks.trim().length > 0) {
        doc.font('Helvetica-Oblique').text(`Note: ${data.additional_remarks.trim()}`, margin, doc.y, {
          width: contentWidth,
          align: 'left'
        });
      }

      // 5. CLOSING & OFFICIAL SIGNATURE / STAMP
      // Signature block height = ~130px (text+stamp+labels), Footer = ~30px
      // Place signature 30px below the last content line, but never overflow page
      doc.page.margins.bottom = 0; // allow writing near bottom

      const contentEndY = doc.y + 12; // 12px gap after last paragraph
      const sigBlockHeight = 130;   // "For..." + stamp + labels
      const footerHeight = 30;
      const minSigY = pageHeight - margin - sigBlockHeight - footerHeight; // must fit on page
      const sigY = Math.max(contentEndY, minSigY);

      // Locate signature stamp image
      let sigPath = path.join(__dirname, '../../uploads/custq_signature.png');
      if (settings && settings.signature_image) {
        const customSig = path.isAbsolute(settings.signature_image)
          ? settings.signature_image
          : path.join(__dirname, '../../', settings.signature_image);
        if (fs.existsSync(customSig)) {
          sigPath = customSig;
        }
      }

      const sigBoxWidth = 220;
      const sigBoxX = pageWidth - margin - sigBoxWidth;

      doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#000000');
      doc.text('For CUSTQ SOFTWARE SERVICES Pvt. Ltd.', sigBoxX, sigY, { width: sigBoxWidth, align: 'center', lineBreak: false });

      if (fs.existsSync(sigPath)) {
        try {
          doc.image(sigPath, sigBoxX + (sigBoxWidth - 75) / 2, sigY + 14, {
            fit: [75, 75],
            align: 'center'
          });
        } catch (e) {
          console.error('Error embedding stamp image:', e.message);
        }
      }

      doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000');
      doc.text('Authorized Signatory', sigBoxX, sigY + 94, { width: sigBoxWidth, align: 'center', lineBreak: false });
      doc.fontSize(8).font('Helvetica').fillColor('#64748B');
      doc.text('Human Resources Department', sigBoxX, sigY + 106, { width: sigBoxWidth, align: 'center', lineBreak: false });

      // 6. FOOTER — fixed 22px below signature block bottom
      const footerY = sigY + sigBlockHeight + 8;
      doc.lineWidth(0.5).strokeColor('#CBD5E1');
      doc.moveTo(margin, footerY).lineTo(pageWidth - margin, footerY).stroke();

      doc.fontSize(8).font('Helvetica').fillColor('#64748B');
      doc.text(
        'CUSTQ Software Services Pvt. Ltd. • Registered Office: Vanasthalipuram, Hyderabad - 500070 • www.custq.in',
        margin, footerY + 7,
        { width: contentWidth, align: 'center', lineBreak: false }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateHrLetterPDF, stripHtml };


