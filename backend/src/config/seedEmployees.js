const db = require('./db');
const bcrypt = require('bcryptjs');

const sampleEmployees = [
  { id: 'EMP001', name: 'Aarav Sharma', designation: 'Senior Software Engineer', department: 'Engineering', email: 'aarav.sharma@custq.com', phone: '+91 98112 34501', salary: 75000, doj: '2023-03-15' },
  { id: 'EMP002', name: 'Diya Patel', designation: 'Product Designer', department: 'Design', email: 'diya.patel@custq.com', phone: '+91 98112 34502', salary: 60000, doj: '2023-06-01' },
  { id: 'EMP003', name: 'Rohan Verma', designation: 'QA Lead', department: 'Quality Assurance', email: 'rohan.verma@custq.com', phone: '+91 98112 34503', salary: 55000, doj: '2022-11-20' },
  { id: 'EMP004', name: 'Ananya Reddy', designation: 'HR Specialist', department: 'Human Resources', email: 'ananya.reddy@custq.com', phone: '+91 98112 34504', salary: 45000, doj: '2024-01-10' },
  { id: 'EMP005', name: 'Vikram Sengupta', designation: 'DevOps Engineer', department: 'Infrastructure', email: 'vikram.s@custq.com', phone: '+91 98112 34505', salary: 85000, doj: '2022-04-18' },
  { id: 'EMP006', name: 'Pooja Iyer', designation: 'Frontend Developer', department: 'Engineering', email: 'pooja.iyer@custq.com', phone: '+91 98112 34506', salary: 50000, doj: '2024-02-01' },
  { id: 'EMP007', name: 'Siddharth Rao', designation: 'Backend Architect', department: 'Engineering', email: 'siddharth.rao@custq.com', phone: '+91 98112 34507', salary: 110000, doj: '2021-08-15' },
  { id: 'EMP008', name: 'Sneha Kulkarni', designation: 'Business Analyst', department: 'Product', email: 'sneha.k@custq.com', phone: '+91 98112 34508', salary: 48000, doj: '2023-09-01' },
  { id: 'EMP009', name: 'Karan Mehra', designation: 'Marketing Manager', department: 'Marketing', email: 'karan.m@custq.com', phone: '+91 98112 34509', salary: 65000, doj: '2023-01-12' },
  { id: 'EMP010', name: 'Nisha Gupta', designation: 'Account Executive', department: 'Sales', email: 'nisha.g@custq.com', phone: '+91 98112 34510', salary: 42000, doj: '2024-05-10' },
  { id: 'EMP011', name: 'Aditya Joshi', designation: 'Mobile App Developer', department: 'Engineering', email: 'aditya.j@custq.com', phone: '+91 98112 34511', salary: 52000, doj: '2023-10-05' },
  { id: 'EMP012', name: 'Meera Nair', designation: 'Technical Support Lead', department: 'Customer Support', email: 'meera.n@custq.com', phone: '+91 98112 34512', salary: 38000, doj: '2024-03-20' },
  { id: 'EMP013', name: 'Gaurav Deshmukh', designation: 'Data Engineer', department: 'Data', email: 'gaurav.d@custq.com', phone: '+91 98112 34513', salary: 72000, doj: '2022-07-01' },
  { id: 'EMP014', name: 'Tanvi Agarwal', designation: 'Content Strategist', department: 'Marketing', email: 'tanvi.a@custq.com', phone: '+91 98112 34514', salary: 40000, doj: '2024-04-15' },
  { id: 'EMP015', name: 'Harish Choudhary', designation: 'Operations Specialist', department: 'Operations', email: 'harish.c@custq.com', phone: '+91 98112 34515', salary: 35000, doj: '2023-12-01' }
];

async function seedEmployees() {
  console.log('Seeding employees into PostgreSQL...');
  const defaultPassword = 'Employee@123';
  const hash = await bcrypt.hash(defaultPassword, 10);

  for (const emp of sampleEmployees) {
    const res = await db.query(`
      INSERT INTO employees (
        employee_id, name, designation, department, email, phone, date_of_joining, monthly_gross_salary, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
      ON CONFLICT (employee_id) DO UPDATE SET
        name = EXCLUDED.name,
        designation = EXCLUDED.designation,
        department = EXCLUDED.department,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        monthly_gross_salary = EXCLUDED.monthly_gross_salary
      RETURNING id, email
    `, [emp.id, emp.name, emp.designation, emp.department, emp.email, emp.phone, emp.doj, emp.salary]);

    const created = res.rows[0];
    if (created && created.email) {
      await db.query(`
        INSERT INTO users (email, password_hash, role, employee_id)
        VALUES ($1, $2, 'employee', $3)
        ON CONFLICT (email) DO UPDATE SET employee_id = EXCLUDED.employee_id
      `, [created.email, hash, created.id]);
    }
  }

  console.log(`Successfully seeded ${sampleEmployees.length} active employees with login accounts.`);
}

if (require.main === module) {
  seedEmployees().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { seedEmployees };
