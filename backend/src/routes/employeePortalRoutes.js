const express = require('express');
const router = express.Router();
const employeePortalController = require('../controllers/employeePortalController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);
router.get('/my-payslips', employeePortalController.getMyPayslips);
router.get('/my-salary-history', employeePortalController.getMySalaryHistory);

module.exports = router;
