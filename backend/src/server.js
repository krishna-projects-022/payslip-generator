const app = require('./app');
const { initDatabase } = require('./config/initDb');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    console.log('Initializing database schema...');
    await initDatabase();
    console.log('Database ready.');

    app.listen(PORT, () => {
      console.log(`==================================================`);
      console.log(`  CUSTQ PAYSLIP GENERATOR BACKEND RUNNING`);
      console.log(`  Server listening on: http://localhost:${PORT}`);
      console.log(`  Health check: http://localhost:${PORT}/api/health`);
      console.log(`==================================================`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
