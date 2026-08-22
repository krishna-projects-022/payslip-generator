const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function initDatabase() {
  const adminDbConfig = {
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5432', 10),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    database: 'postgres'
  };

  const targetDbName = process.env.PGDATABASE || 'custq_payroll';

  const adminPool = new Pool(adminDbConfig);
  try {
    const checkDb = await adminPool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [targetDbName]
    );
    if (checkDb.rows.length === 0) {
      await adminPool.query(`CREATE DATABASE "${targetDbName}"`);
      console.log(`Database ${targetDbName} created successfully.`);
    }
  } catch (err) {
    console.error('Error verifying/creating database:', err.message);
  } finally {
    await adminPool.end();
  }

  const targetPool = new Pool({
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5432', 10),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    database: targetDbName
  });

  try {
    const schemaPath = path.join(__dirname, '../../../database/schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await targetPool.query(schemaSql);
      console.log('Schema executed successfully.');
    }

    const settingsCheck = await targetPool.query('SELECT COUNT(*) FROM application_settings');
    if (parseInt(settingsCheck.rows[0].count, 10) === 0) {
      await targetPool.query(`
        INSERT INTO application_settings (
          id, company_name, company_address, pt_amount, basic_percentage, pf_percentage, default_working_days
        ) VALUES (
          '00000000-0000-0000-0000-000000000001',
          'CUSTQ Software Services Pvt. Ltd.',
          '#5-5-1195, Plot No.8, Sri Ganesh Nagar Colony, Opp. Panama Godown, Vanasthalipuram, Hyderabad, Telangana - 500070',
          200,
          50,
          12,
          26
        )
      `);
      console.log('Default settings seeded.');
    }

    const adminCheck = await targetPool.query("SELECT * FROM users WHERE email = 'admin@custq.com'");
    if (adminCheck.rows.length === 0) {
      const hash = await bcrypt.hash('Admin@123', 10);
      await targetPool.query(`
        INSERT INTO users (id, email, password_hash, role)
        VALUES ('00000000-0000-0000-0000-000000000002', 'admin@custq.com', $1, 'admin')
      `, [hash]);
      console.log('Default admin user created: admin@custq.com / Admin@123');
    }
  } catch (err) {
    console.error('Error executing migration:', err);
  } finally {
    await targetPool.end();
  }
}

if (require.main === module) {
  initDatabase().then(() => {
    console.log('Database initialization complete.');
    process.exit(0);
  });
}

module.exports = { initDatabase };
