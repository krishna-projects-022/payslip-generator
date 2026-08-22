const express = require('express');
const router = express.Router();
const hrCtrl = require('../controllers/hrDocumentController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

router.get('/', verifyToken, requireAdmin, hrCtrl.getAllDocuments);
router.get('/:id', verifyToken, requireAdmin, hrCtrl.getDocumentById);
router.post('/generate', verifyToken, requireAdmin, hrCtrl.generateAndSaveDocument);
router.get('/download/:id', verifyToken, hrCtrl.downloadDocumentPdf);
router.delete('/:id', verifyToken, requireAdmin, hrCtrl.deleteDocument);

module.exports = router;
