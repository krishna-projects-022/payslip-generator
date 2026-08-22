const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const payrollRoutes = require('./routes/payrollRoutes');
const payslipRoutes = require('./routes/payslipRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const employeePortalRoutes = require('./routes/employeePortalRoutes');
const hrDocumentRoutes = require('./routes/hrDocumentRoutes');

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static uploaded files (logos, signatures, payslips)
const os = require('os');
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/uploads', express.static(path.join(os.tmpdir(), 'uploads')));

// Serve Frontend Web App
app.use(express.static(path.join(__dirname, '../../frontend/web')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'CUSTQ Payslip Generator API',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/payslips', payslipRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/employee-portal', employeePortalRoutes);
app.use('/api/hr-documents', hrDocumentRoutes);


// Fallback for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/web/index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled API Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

module.exports = app;
