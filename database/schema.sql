-- CUSTQ PAYSLIP GENERATOR DATABASE SCHEMA
-- Compatible with PostgreSQL 12+

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS application_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(255) NOT NULL DEFAULT 'CUSTQ Software Services Pvt. Ltd.',
    company_address TEXT NOT NULL DEFAULT '#5-5-1195, Plot No.8, Sri Ganesh Nagar Colony, Opp. Panama Godown, Vanasthalipuram, Hyderabad, Telangana - 500070',
    company_logo TEXT,
    signature_image TEXT,
    pt_amount NUMERIC(12,2) DEFAULT 200,
    basic_percentage NUMERIC(5,2) DEFAULT 50,
    pf_percentage NUMERIC(5,2) DEFAULT 12,
    default_working_days INTEGER DEFAULT 26,
    currency VARCHAR(10) DEFAULT 'INR',
    currency_symbol VARCHAR(10) DEFAULT '₹',
    payslip_prefix VARCHAR(20) DEFAULT 'CUSTQ-PS-',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    profile_photo TEXT,
    designation VARCHAR(150),
    department VARCHAR(150),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(30),
    date_of_joining DATE DEFAULT CURRENT_DATE,
    monthly_gross_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'employee',
    employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payroll_periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL CHECK (year >= 2000),
    working_days INTEGER NOT NULL DEFAULT 26,
    pt_amount NUMERIC(12,2) NOT NULL DEFAULT 200,
    status VARCHAR(20) DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(month, year)
);

CREATE TABLE IF NOT EXISTS salaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    payroll_period_id UUID NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
    gross_salary NUMERIC(12,2) NOT NULL,
    basic_salary NUMERIC(12,2) NOT NULL,
    pf NUMERIC(12,2) DEFAULT 0,
    pt NUMERIC(12,2) DEFAULT 200,
    leave_days NUMERIC(5,2) DEFAULT 0,
    leave_deduction NUMERIC(12,2) DEFAULT 0,
    tds NUMERIC(12,2) DEFAULT 0,
    other_deductions NUMERIC(12,2) DEFAULT 0,
    total_deductions NUMERIC(12,2) DEFAULT 0,
    net_salary NUMERIC(12,2) DEFAULT 0,
    payment_status VARCHAR(20) DEFAULT 'pending',
    payment_reference VARCHAR(100),
    paid_at TIMESTAMP,
    paid_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, payroll_period_id)
);

CREATE TABLE IF NOT EXISTS payslips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    salary_id UUID NOT NULL REFERENCES salaries(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    payslip_number VARCHAR(100) UNIQUE NOT NULL,
    pdf_path TEXT,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_dept ON employees(department);
CREATE INDEX IF NOT EXISTS idx_salaries_period ON salaries(payroll_period_id);
CREATE INDEX IF NOT EXISTS idx_salaries_employee ON salaries(employee_id);
CREATE INDEX IF NOT EXISTS idx_salaries_status ON salaries(payment_status);
CREATE INDEX IF NOT EXISTS idx_payslips_employee ON payslips(employee_id);
CREATE INDEX IF NOT EXISTS idx_payslips_salary ON payslips(salary_id);
