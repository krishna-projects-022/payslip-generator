const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', employeeController.getAllEmployees);
router.get('/:id', employeeController.getEmployeeById);
router.post('/', requireAdmin, employeeController.createEmployee);
router.put('/:id', requireAdmin, employeeController.updateEmployee);
router.delete('/:id', requireAdmin, employeeController.deleteEmployee);

module.exports = router;
