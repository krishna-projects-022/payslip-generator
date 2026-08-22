# CUSTQ PAYSLIP GENERATOR

A standalone, production-ready, enterprise-grade **Payroll & Payslip Generator Application** built for **CUSTQ Software Services Pvt. Ltd.**

---

## 🏢 Company Profile
* **Organization**: CUSTQ Software Services Pvt. Ltd.
* **Address**: #5-5-1195, Plot No.8, Sri Ganesh Nagar Colony, Opp. Panama Godown, Vanasthalipuram, Hyderabad, Telangana - 500070
* **Platform**: CUSTQ Payslip Generator

---

## ⚙️ Technology Stack & Architecture

```
payslip-generator/
│
├── frontend/
│   ├── lib/
│   │   ├── core/theme/         # Material 3 Luxury Dark SaaS Theme (Slate 900 / Indigo / Violet)
│   │   ├── core/constants/     # REST Endpoints
│   │   ├── core/utils/         # Indian Currency Formatter
│   │   ├── models/             # User, Employee, PayrollItem, Payslip, Settings
│   │   ├── services/           # Auth, Payroll, Employee, Payslip, Settings Services
│   │   └── screens/            # Single-Page Payroll, Employees, Payslips, Self-Service
│   ├── web/                    # Interactive SaaS Web Client (HTML5 / CSS3 / Vanilla ES6)
│   └── pubspec.yaml
│
├── backend/
│   ├── src/
│   │   ├── config/             # PostgreSQL Pool & DB Migration runner
│   │   ├── controllers/        # Auth, Employee, Payroll, Payslip, Settings, EmployeePortal
│   │   ├── services/           # Calculation Engine, PDF Generator (PDFKit), Archiver ZIP
│   │   ├── middleware/         # JWT Auth, RBAC (Admin/Employee), Multer Uploads
│   │   ├── utils/              # Indian Currency Number-to-Words Converter
│   │   ├── app.js              # Express API Server + Web App Host
│   │   └── server.js           # Server bootstrap & DB initializer
│   ├── tests/
│   │   ├── acceptance.test.js  # Business Logic & Calculation Test Suite
│   │   └── e2e.test.js         # Full 27-Step End-to-End Acceptance Test
│   └── package.json
│
├── database/
│   ├── schema.sql              # Exact PostgreSQL schema matching requirements
│   └── seed.sql                # Default CUSTQ settings & seeded admin
│
└── README.md
```

---

## 🚀 Quick Start Guide

### 1. Database Setup (PostgreSQL)
Ensure PostgreSQL is running locally on port `5432` with user `postgres` / password `postgres` (or configure `backend/.env`).

### 2. Install & Start Backend
```bash
cd backend
npm install
npm run migrate      # Creates database, tables, and seeds initial data
node src/server.js   # Starts the server on http://localhost:5000
```

### 3. Access Application
Open **`http://localhost:5000`** in any web browser.

---

## 🔑 Default Credentials

| Role | Email | Password | Access Scope |
|---|---|---|---|
| **Administrator** | `admin@custq.com` | `Admin@123` | Full Payroll, Employees, Settings, Bulk Actions |
| **Employee (Self-Service)** | `aarav.sharma@custq.com` | `Employee@123` | Strictly Own Payslips & Salary History |
| **Employee (New Added)** | `priya.sundaram@custq.com` | `Welcome@123` | Strictly Own Payslips & Salary History |

---

## 🧮 Salary Calculation Engine Rules

1. **Monthly Gross Salary**: Entered per employee (e.g. ₹20,000.00).
2. **Basic Pay**: Automatically calculated as **50% of Gross Salary** (`Gross * 0.50` = ₹10,000.00).
3. **Provident Fund (PF)**: Automatically calculated as **12% of Basic Pay** (`Basic * 0.12` = ₹1,200.00).
4. **Professional Tax (PT)**: Configurable, default is **₹200.00**.
5. **Daily Salary**: `Gross Salary / Working Days` (e.g. `20000 / 26` = ₹769.23/day).
6. **Leave Deduction (LOP)**: `Daily Salary * Leave Days` (e.g. 2 days = ₹1,538.46).
7. **Total Deductions**: `PF + PT + Leave Deduction + TDS + Other Deductions` (₹2,938.46).
8. **Net Salary**: `Gross Salary - Total Deductions` (₹17,061.54).
9. **Net Pay in Words**: Automatically formatted using the Indian Currency Words Utility (*"Seventeen Thousand Sixty-One Rupees and Fifty-Four Paise Only"*).

---

## 📄 Real Vector PDF Payslip Structure
Each generated PDF includes:
* **Header**: Company Logo, Organization Name, Official Address, Pay Period.
* **Employee Details Grid**: Name, Employee ID, Designation, Department, Date of Joining, Working Days, Leave Days, Payment Reference.
* **Two-Column Earnings & Deductions Table**: Itemized Basic + DA, HRA, Other Allowances vs PF, PT, LOP / Leave Deduction, TDS.
* **Net Salary Payable Box**: Figures + Exact Currency in Words.
* **Bottom-Right Section**: Uploaded Employee Signature image with caption *"Employee Signature"*.

---

## 🧪 Verification & Acceptance Tests
Run the automated acceptance test suite covering all 27 requirements from Section 47:

```bash
cd backend
npm test
node tests/e2e.test.js
```

All test suites verify:
- ✅ Accurate mathematical formula calculations
- ✅ High-precision Indian currency words conversion
- ✅ Real PostgreSQL CRUD & foreign key integrity
- ✅ Single-page payroll workflow with inline leave recalculation
- ✅ Payment status transition to PAID with unique payment references
- ✅ Real vector PDF generation with company logo and signature
- ✅ Bulk generation & ZIP packaging
- ✅ Strict RBAC and Employee Self-Service data isolation
