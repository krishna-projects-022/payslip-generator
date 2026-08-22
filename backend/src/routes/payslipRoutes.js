const express = require('express');
const router = express.Router();
const payslipController = require('../controllers/payslipController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// Allow public or authenticated download with token query param if needed
router.get('/download/:id', payslipController.downloadPayslipPdf);
router.get('/bulk-download/:month/:year', verifyToken, requireAdmin, payslipController.bulkDownloadZip);

router.use(verifyToken);
router.get('/', payslipController.getAllPayslips);
router.get('/:id', payslipController.getPayslipById);

module.exports = router;
