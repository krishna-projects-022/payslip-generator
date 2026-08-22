const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Read settings can be accessed by authenticated users
router.get('/', verifyToken, settingsController.getSettings);

// Settings mutation requires Admin
router.put('/', verifyToken, requireAdmin, settingsController.updateSettings);
router.post('/logo', verifyToken, requireAdmin, upload.single('logo'), settingsController.uploadLogo);
router.post('/signature', verifyToken, requireAdmin, upload.single('signature'), settingsController.uploadSignature);

module.exports = router;
