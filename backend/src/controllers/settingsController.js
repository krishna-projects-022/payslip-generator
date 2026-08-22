const db = require('../config/db');

exports.getSettings = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM application_settings LIMIT 1');
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Settings not found.' });
    }
    res.json({ success: true, settings: result.rows[0] });
  } catch (err) {
    console.error('getSettings error:', err);
    res.status(500).json({ success: false, message: 'Failed to load settings.' });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const {
      company_name,
      company_address,
      pt_amount,
      basic_percentage,
      pf_percentage,
      default_working_days,
      currency,
      currency_symbol,
      payslip_prefix
    } = req.body;

    const result = await db.query(`
      UPDATE application_settings SET
        company_name = COALESCE($1, company_name),
        company_address = COALESCE($2, company_address),
        pt_amount = COALESCE($3, pt_amount),
        basic_percentage = COALESCE($4, basic_percentage),
        pf_percentage = COALESCE($5, pf_percentage),
        default_working_days = COALESCE($6, default_working_days),
        currency = COALESCE($7, currency),
        currency_symbol = COALESCE($8, currency_symbol),
        payslip_prefix = COALESCE($9, payslip_prefix),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = (SELECT id FROM application_settings LIMIT 1)
      RETURNING *
    `, [
      company_name,
      company_address,
      pt_amount !== undefined ? Number(pt_amount) : null,
      basic_percentage !== undefined ? Number(basic_percentage) : null,
      pf_percentage !== undefined ? Number(pf_percentage) : null,
      default_working_days !== undefined ? parseInt(default_working_days, 10) : null,
      currency,
      currency_symbol,
      payslip_prefix
    ]);

    res.json({
      success: true,
      message: 'Settings updated successfully.',
      settings: result.rows[0]
    });
  } catch (err) {
    console.error('updateSettings error:', err);
    res.status(500).json({ success: false, message: 'Failed to update settings.' });
  }
};

exports.uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No logo file provided.' });
    }

    const relativePath = 'uploads/' + req.file.filename;
    const result = await db.query(`
      UPDATE application_settings
      SET company_logo = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = (SELECT id FROM application_settings LIMIT 1)
      RETURNING *
    `, [relativePath]);

    res.json({
      success: true,
      message: 'Company logo uploaded and saved successfully.',
      settings: result.rows[0]
    });
  } catch (err) {
    console.error('uploadLogo error:', err);
    res.status(500).json({ success: false, message: 'Failed to upload logo.' });
  }
};

exports.uploadSignature = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No signature file provided.' });
    }

    const relativePath = 'uploads/' + req.file.filename;
    const result = await db.query(`
      UPDATE application_settings
      SET signature_image = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = (SELECT id FROM application_settings LIMIT 1)
      RETURNING *
    `, [relativePath]);

    res.json({
      success: true,
      message: 'Employee signature uploaded and saved successfully.',
      settings: result.rows[0]
    });
  } catch (err) {
    console.error('uploadSignature error:', err);
    res.status(500).json({ success: false, message: 'Failed to upload signature.' });
  }
};
