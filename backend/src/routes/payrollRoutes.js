const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/payrollController');
const excelPayrollController = require('../controllers/excelPayrollController');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public template download or authenticated
router.get('/download-template', excelPayrollController.downloadTemplate);

router.use(verifyToken);

router.post('/calculate', payrollController.calculatePreview);
router.get('/period/:month/:year', payrollController.getPayrollForPeriod);
router.post('/pay', requireAdmin, payrollController.paySalary);
router.post('/bulk-pay', requireAdmin, payrollController.bulkPaySalaries);

// Excel Upload & Auto-generate Payslips
router.post('/upload-excel', requireAdmin, upload.single('excelFile'), excelPayrollController.uploadAndProcessExcel);

module.exports = router;
