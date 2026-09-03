const db = require('../config/db');
const path = require('path');
const fs = require('fs');
const { generateHrLetterPDF } = require('../utils/hrLetterPdfGenerator');

function cleanFilename(name) {
  return String(name || 'Employee').trim().replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_');
}

function parseToIsoDate(dStr) {
  if (!dStr) return null;
  const s = String(dStr).trim();
  if (!s) return null;

  // DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // YYYY-MM-DD
  const ymdMatch = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return d.toISOString().substring(0, 10);
  }
  return null;
}

exports.getAllDocuments = async (req, res) => {
  try {
    const { documentType, search } = req.query;
    let queryText = `
      SELECT d.*, u.email as generated_by_email
      FROM hr_documents d
      LEFT JOIN users u ON d.generated_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (documentType && documentType !== 'All') {
      params.push(documentType);
      queryText += ` AND d.document_type = $${params.length}`;
    }
    if (search) {
      params.push(`%${search.trim()}%`);
      queryText += ` AND (d.employee_name ILIKE $${params.length} OR d.employee_id_str ILIKE $${params.length} OR d.reference_number ILIKE $${params.length})`;
    }

    queryText += ' ORDER BY d.created_at DESC';

    const result = await db.query(queryText, params);
    res.json({
      success: true,
      count: result.rows.length,
      documents: result.rows
    });
  } catch (err) {
    console.error('getAllDocuments error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve HR documents: ' + err.message });
  }
};

exports.getDocumentById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM hr_documents WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const settingsRes = await db.query('SELECT * FROM application_settings LIMIT 1');
    res.json({
      success: true,
      document: result.rows[0],
      settings: settingsRes.rows[0] || {}
    });
  } catch (err) {
    console.error('getDocumentById error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch document: ' + err.message });
  }
};

exports.generateAndSaveDocument = async (req, res) => {
  try {
    const {
      documentType, // 'experience_letter' or 'relieving_letter'
      employeeName,
      employeeId,
      designation,
      department,
      joiningDate,
      relievingDate,
      experienceDuration,
      referenceNumber,
      letterDate,
      contentHtml,
      additionalRemarks
    } = req.body;

    if (!employeeName) {
      return res.status(400).json({ success: false, message: 'Employee name is required.' });
    }

    const docType = documentType === 'relieving_letter' ? 'relieving_letter' : 'experience_letter';
    const typeLabel = docType === 'experience_letter' ? 'Experience_Letter' : 'Relieving_Letter';
    const refNo = referenceNumber && referenceNumber.trim().length > 0
      ? referenceNumber.trim()
      : `CUSTQ/${docType === 'experience_letter' ? 'EXP' : 'REL'}/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`;

    const settingsRes = await db.query('SELECT * FROM application_settings LIMIT 1');
    const settings = settingsRes.rows[0] || {};

    const hrDocDir = path.join(__dirname, '../../uploads/hr_documents');
    try {
      if (!fs.existsSync(hrDocDir)) fs.mkdirSync(hrDocDir, { recursive: true });
    } catch (e) {
      console.warn('Could not create HR documents directory, assuming read-only filesystem:', e.message);
    }

    const safeName = cleanFilename(employeeName);
    const pdfFilename = `${safeName}_${typeLabel}_${Date.now()}.pdf`;
    const pdfRelativePath = `uploads/hr_documents/${pdfFilename}`;
    const pdfFullPath = path.join(hrDocDir, pdfFilename);

    const isoLetterDate = parseToIsoDate(letterDate) || new Date().toISOString().substring(0, 10);
    const isoJoiningDate = parseToIsoDate(joiningDate);
    const isoRelievingDate = parseToIsoDate(relievingDate);

    const docData = {
      employee_name: employeeName,
      employee_id_str: employeeId || '',
      designation: designation || '',
      department: department || '',
      reference_number: refNo,
      letter_date: isoLetterDate,
      joining_date: isoJoiningDate,
      relieving_date: isoRelievingDate,
      experience_duration: experienceDuration || '',
      content_html: contentHtml || '',
      additional_remarks: additionalRemarks || ''
    };

    const pdfBuffer = await generateHrLetterPDF({
      documentType: docType,
      data: docData,
      settings
    });

    try {
      fs.writeFileSync(pdfFullPath, pdfBuffer);
    } catch (e) {
      console.warn('Could not write HR document PDF to disk, skipping file write:', e.message);
    }

    const insertRes = await db.query(`
      INSERT INTO hr_documents (
        document_type, employee_id_str, employee_name, designation, department,
        reference_number, letter_date, joining_date, relieving_date, experience_duration,
        content_html, additional_remarks, pdf_path, generated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (reference_number) DO UPDATE SET
        employee_name = EXCLUDED.employee_name,
        designation = EXCLUDED.designation,
        department = EXCLUDED.department,
        letter_date = EXCLUDED.letter_date,
        joining_date = EXCLUDED.joining_date,
        relieving_date = EXCLUDED.relieving_date,
        experience_duration = EXCLUDED.experience_duration,
        content_html = EXCLUDED.content_html,
        additional_remarks = EXCLUDED.additional_remarks,
        pdf_path = EXCLUDED.pdf_path,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      docType, docData.employee_id_str, docData.employee_name, docData.designation, docData.department,
      refNo, docData.letter_date, docData.joining_date, docData.relieving_date, docData.experience_duration,
      docData.content_html, docData.additional_remarks, pdfRelativePath, req.user ? req.user.id : null
    ]);

    const createdDoc = insertRes.rows[0];

    res.json({
      success: true,
      message: `${docType === 'experience_letter' ? 'Experience Letter' : 'Relieving Letter'} generated successfully!`,
      document: createdDoc,
      pdfUrl: `/api/hr-documents/download/${createdDoc.id}`
    });
  } catch (err) {
    console.error('generateAndSaveDocument error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate document: ' + err.message });
  }
};

exports.downloadDocumentPdf = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM hr_documents WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const docRow = result.rows[0];
    const settingsRes = await db.query('SELECT * FROM application_settings LIMIT 1');
    const settings = settingsRes.rows[0] || {};

    const pdfBuffer = await generateHrLetterPDF({
      documentType: docRow.document_type,
      data: docRow,
      settings
    });

    const safeName = cleanFilename(docRow.employee_name);
    const typeLabel = docRow.document_type === 'experience_letter' ? 'Experience_Letter' : 'Relieving_Letter';
    const downloadFilename = `${safeName}_${typeLabel}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('downloadDocumentPdf error:', err);
    res.status(500).json({ success: false, message: 'Failed to download PDF: ' + err.message });
  }
};

exports.deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const docRes = await db.query('SELECT pdf_path FROM hr_documents WHERE id = $1', [id]);
    if (docRes.rows.length > 0 && docRes.rows[0].pdf_path) {
      const fullPath = path.join(__dirname, '../../', docRes.rows[0].pdf_path);
      try { if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath); } catch (e) {}
    }
    await db.query('DELETE FROM hr_documents WHERE id = $1', [id]);
    res.json({ success: true, message: 'Document deleted successfully.' });
  } catch (err) {
    console.error('deleteDocument error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete document: ' + err.message });
  }
};
