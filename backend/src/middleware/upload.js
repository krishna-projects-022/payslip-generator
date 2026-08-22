const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Use temp directory for file uploads in serverless / Vercel to avoid EROFS errors
const isVercel = !!(process.env.VERCEL || process.env.NOW_BUILDER);
let uploadDir = path.join(__dirname, '../../uploads');

if (isVercel) {
  uploadDir = path.join(os.tmpdir(), 'uploads');
}

try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (e) {
  console.warn('Failed to create upload directory, falling back to OS temp dir:', e.message);
  uploadDir = path.join(os.tmpdir(), 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, (file.fieldname || 'upload') + '-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.png', '.jpg', '.jpeg', '.webp', '.xlsx', '.xls', '.csv'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Supported file formats: PNG, JPG, JPEG, WEBP, XLSX, XLS, CSV'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
  fileFilter: fileFilter
});

module.exports = upload;
