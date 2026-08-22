const API_BASE = 'http://localhost:5000/api';

let currentUser = null;
let authToken = localStorage.getItem('custq_token') || null;
let currentPayrollData = { items: [], summary: {}, period: {}, settings: {} };
let currentActiveItem = null;
let selectedRole = 'admin';

// Month names helper
const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Number to Indian Words in JS
function toIndianWords(amount) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convert2(n) {
    if (n < 20) return ones[n];
    const t = Math.floor(n / 10);
    const o = n % 10;
    return tens[t] + (o ? '-' + ones[o] : '');
  }

  function convert3(n) {
    const h = Math.floor(n / 100);
    const rem = n % 100;
    let res = '';
    if (h > 0) res += ones[h] + ' Hundred';
    if (rem > 0) res += (h > 0 ? ' ' : '') + convert2(rem);
    return res;
  }

  const num = Math.abs(Number(amount) || 0);
  const intPart = Math.floor(num);
  const paise = Math.round((num - intPart) * 100);

  const crore = Math.floor(intPart / 10000000);
  const lakh = Math.floor((intPart % 10000000) / 100000);
  const thousand = Math.floor((intPart % 100000) / 1000);
  const rem = intPart % 1000;

  let words = '';
  if (crore > 0) words += convert2(crore) + ' Crore ';
  if (lakh > 0) words += convert2(lakh) + ' Lakh ';
  if (thousand > 0) words += convert2(thousand) + ' Thousand ';
  if (rem > 0) words += convert3(rem);

  words = words.trim();
  if (!words) words = 'Zero';
  let res = words + ' Rupees';
  if (paise > 0) res += ' and ' + convert2(paise) + ' Paise';
  return res + ' Only';
}

function formatInr(val) {
  const n = Number(val) || 0;
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// API Helper
async function apiRequest(endpoint, method = 'GET', body = null) {
  const headers = {};
  if (authToken) headers['Authorization'] = 'Bearer ' + authToken;
  if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';

  const options = {
    method,
    headers,
    body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : null
  };

  try {
    const res = await fetch(API_BASE + endpoint, options);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed with status ' + res.status);
    return data;
  } catch (err) {
    showToast(err.message, 'error');
    throw err;
  }
}

// Toast
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast show ' + (type === 'error' ? 'toast-error' : '');
  setTimeout(() => { toast.className = 'toast'; }, 3500);
}

// INITIALIZATION
document.addEventListener('DOMContentLoaded', async () => {
  if (authToken) {
    try {
      const data = await apiRequest('/auth/me');
      if (data.success && data.user) {
        currentUser = data.user;
        setupUserInterface();
        return;
      }
    } catch (e) {
      localStorage.removeItem('custq_token');
      authToken = null;
    }
  }
  document.getElementById('loginModal').classList.add('active');
});

// AUTHENTICATION
function switchLoginRole(role) {
  selectedRole = role;
  const adminBtn = document.getElementById('adminTabBtn');
  const empBtn = document.getElementById('empTabBtn');
  const emailInput = document.getElementById('loginEmail');
  const passInput = document.getElementById('loginPassword');
  const hint = document.getElementById('credHint');

  if (role === 'admin') {
    adminBtn.classList.add('active');
    empBtn.classList.remove('active');
    emailInput.value = 'admin@custq.com';
    passInput.value = 'Admin@123';
    hint.innerHTML = 'Admin: <code>admin@custq.com</code> / <code>Admin@123</code>';
  } else {
    empBtn.classList.add('active');
    adminBtn.classList.remove('active');
    emailInput.value = 'aarav.sharma@custq.com';
    passInput.value = 'Employee@123';
    hint.innerHTML = 'Employee: <code>aarav.sharma@custq.com</code> / <code>Employee@123</code>';
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  try {
    const data = await apiRequest('/auth/login', 'POST', { email, password });
    if (data.success) {
      authToken = data.token;
      currentUser = data.user;
      localStorage.setItem('custq_token', authToken);
      document.getElementById('loginModal').classList.remove('active');
      setupUserInterface();
      showToast('Welcome, ' + (currentUser.employee?.name || currentUser.email) + '!');
    }
  } catch (err) {
    console.error('Login error:', err);
  }
}

function handleLogout() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('custq_token');
  document.getElementById('loginModal').classList.add('active');
}

function setupUserInterface() {
  document.getElementById('sidebarUserName').textContent = currentUser.employee?.name || currentUser.email.split('@')[0];
  document.getElementById('sidebarUserRole').textContent = currentUser.role === 'admin' ? 'Administrator' : 'Staff Employee';
  document.getElementById('sidebarUserAvatar').textContent = (currentUser.employee?.name || currentUser.email).substring(0, 2).toUpperCase();

  const isAdmin = currentUser.role === 'admin';
  const setDisplay = (id, show, displayType = 'inline-flex') => {
    const el = document.getElementById(id);
    if (el) el.style.display = show ? displayType : 'none';
  };
  setDisplay('navEmployees', isAdmin, 'flex');
  setDisplay('navPayslips', isAdmin, 'flex');
  setDisplay('navHrLetters', isAdmin, 'flex');
  setDisplay('navSettings', isAdmin, 'flex');
  setDisplay('btnTopExcel', isAdmin, 'inline-flex');
  setDisplay('btnTopExpLetter', isAdmin, 'inline-flex');
  setDisplay('btnTopRelLetter', isAdmin, 'inline-flex');
  setDisplay('btnTopAddEmp', isAdmin, 'inline-flex');
  setDisplay('btnTopBulkPay', isAdmin, 'inline-flex');
  setDisplay('btnTopBulkDownload', isAdmin, 'inline-flex');
  setDisplay('navSelfService', !isAdmin, 'flex');

  if (isAdmin) {
    navigateTo('salary');
    loadPayrollData();
  } else {
    navigateTo('selfservice');
    loadSelfServiceData();
  }
}

// NAVIGATION
function navigateTo(viewId) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.page-view').forEach(el => el.classList.remove('active'));

  if (viewId === 'salary') {
    document.querySelector('a[href="#salary"]').classList.add('active');
    document.getElementById('viewSalary').classList.add('active');
    document.getElementById('pageTitle').textContent = 'Monthly Payroll Processing';
    loadPayrollData();
  } else if (viewId === 'employees') {
    document.getElementById('navEmployees').classList.add('active');
    document.getElementById('viewEmployees').classList.add('active');
    document.getElementById('pageTitle').textContent = 'Employee Directory';
    loadEmployeesDirectory();
  } else if (viewId === 'payslips') {
    document.getElementById('navPayslips').classList.add('active');
    document.getElementById('viewPayslips').classList.add('active');
    document.getElementById('pageTitle').textContent = 'Payslip Archives';
    loadPayslipsHistory();
  } else if (viewId === 'hr-letters') {
    const nav = document.getElementById('navHrLetters');
    if (nav) nav.classList.add('active');
    const view = document.getElementById('viewHrLetters');
    if (view) view.classList.add('active');
    const title = document.getElementById('pageTitle');
    if (title) title.textContent = 'Experience & Relieving Letters';
    loadHrDocumentsHistory();
  } else if (viewId === 'selfservice') {
    const nav = document.getElementById('navSelfService');
    if (nav) nav.classList.add('active');
    const view = document.getElementById('viewSelfService');
    if (view) view.classList.add('active');
    const title = document.getElementById('pageTitle');
    if (title) title.textContent = 'My Salary & Payslips';
    loadSelfServiceData();
  }
}

// PERIOD & SALARY TABLE DATA
async function loadPayrollData() {
  const month = document.getElementById('selectMonth').value;
  const year = document.getElementById('selectYear').value;
  const workingDays = document.getElementById('inputWorkingDays').value;

  try {
    const data = await apiRequest(`/payroll/period/${month}/${year}?workingDays=${workingDays}`);
    if (data.success) {
      currentPayrollData = data;
      document.getElementById('inputWorkingDays').value = data.period.working_days || 26;
      updateSummaryCards(data.summary);
      renderSalaryTable(data.items);
    }
  } catch (err) {
    console.error('Error loading payroll data:', err);
  }
}

function onPeriodChange() {
  loadPayrollData();
}

function onWorkingDaysChange() {
  const wDays = parseInt(document.getElementById('inputWorkingDays').value, 10) || 26;
  currentPayrollData.items.forEach(item => {
    if (item.paymentStatus !== 'paid') {
      const daily = item.grossSalary / wDays;
      item.leaveDeduction = Number((daily * item.leaveDays).toFixed(2));
      item.totalDeductions = Number((item.pf + item.pt + item.leaveDeduction + item.tds + item.otherDeductions).toFixed(2));
      item.netSalary = Number(Math.max(0, item.grossSalary - item.totalDeductions).toFixed(2));
    }
  });
  recalculateLocalSummary();
  renderSalaryTable(currentPayrollData.items);
}

function onLeaveDaysInput(empId, val) {
  const leaveVal = Math.max(0, parseFloat(val) || 0);
  const wDays = parseInt(document.getElementById('inputWorkingDays').value, 10) || 26;

  const item = currentPayrollData.items.find(it => it.employee.id === empId);
  if (item && item.paymentStatus !== 'paid') {
    item.leaveDays = leaveVal;
    const daily = item.grossSalary / wDays;
    item.leaveDeduction = Number((daily * leaveVal).toFixed(2));
    item.totalDeductions = Number((item.pf + item.pt + item.leaveDeduction + item.tds + item.otherDeductions).toFixed(2));
    item.netSalary = Number(Math.max(0, item.grossSalary - item.totalDeductions).toFixed(2));

    // Update table row cells without full table re-render for smooth typing
    const row = document.getElementById('row-' + empId);
    if (row) {
      row.querySelector('.cell-leave-deduction').textContent = formatInr(item.leaveDeduction);
      row.querySelector('.cell-total-deductions').textContent = formatInr(item.totalDeductions);
      row.querySelector('.cell-net-salary').textContent = formatInr(item.netSalary);
    }
    recalculateLocalSummary();
  }
}

function recalculateLocalSummary() {
  let gross = 0, ded = 0, net = 0, paid = 0, pending = 0;
  currentPayrollData.items.forEach(it => {
    gross += it.grossSalary;
    ded += it.totalDeductions;
    net += it.netSalary;
    if (it.paymentStatus === 'paid') paid++;
    else pending++;
  });

  const sum = {
    totalEmployees: currentPayrollData.items.length,
    totalGrossSalary: gross,
    totalDeductions: ded,
    totalNetPay: net,
    paidCount: paid,
    pendingCount: pending
  };
  updateSummaryCards(sum);
}

function updateSummaryCards(sum) {
  document.getElementById('cardTotalEmployees').textContent = sum.totalEmployees || 0;
  document.getElementById('cardTotalGross').textContent = formatInr(sum.totalGrossSalary);
  document.getElementById('cardTotalDeductions').textContent = formatInr(sum.totalDeductions);
  document.getElementById('cardTotalNet').textContent = formatInr(sum.totalNetPay);
  document.getElementById('cardPaidCount').textContent = sum.paidCount || 0;
  document.getElementById('cardPendingCount').textContent = sum.pendingCount || 0;
}

function renderSalaryTable(items) {
  const tbody = document.getElementById('salaryTableBody');
  tbody.innerHTML = '';
  document.getElementById('tableRecordCount').textContent = items.length + ' records';

  items.forEach(item => {
    const isPaid = item.paymentStatus === 'paid';
    const tr = document.createElement('tr');
    tr.id = 'row-' + item.employee.id;

    tr.innerHTML = `
      <td>
        <div class="emp-cell">
          <div class="emp-avatar-sm">${item.employee.name.substring(0, 2).toUpperCase()}</div>
          <strong>${item.employee.name}</strong>
        </div>
      </td>
      <td><code>${item.employee.employee_id}</code></td>
      <td>${item.employee.designation}</td>
      <td>${item.employee.department}</td>
      <td><strong>${formatInr(item.grossSalary)}</strong></td>
      <td>${formatInr(item.basicSalary)}</td>
      <td>${formatInr(item.pf)}</td>
      <td>${formatInr(item.pt)}</td>
      <td>
        ${isPaid ? item.leaveDays + ' days' : `<input type="number" class="leave-input" value="${item.leaveDays}" min="0" max="31" step="0.5" oninput="onLeaveDaysInput('${item.employee.id}', this.value)">`}
      </td>
      <td class="cell-leave-deduction">${formatInr(item.leaveDeduction)}</td>
      <td class="cell-total-deductions"><strong>${formatInr(item.totalDeductions)}</strong></td>
      <td class="cell-net-salary"><strong style="color: var(--primary); font-size: 14px;">${formatInr(item.netSalary)}</strong></td>
      <td>
        <span class="badge ${isPaid ? 'badge-paid' : 'badge-pending'}">${isPaid ? 'Paid' : 'Pending'}</span>
      </td>
      <td>
        ${isPaid ? `
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-secondary btn-sm" onclick="openPayslipPreview('${item.payslipId || item.salaryId}')" title="View Payslip"><i class="fa-regular fa-eye"></i></button>
            <button class="btn btn-primary btn-sm" onclick="downloadPayslipDirect('${item.payslipId || item.salaryId}', '${item.employee.name}')" title="Download PDF"><i class="fa-solid fa-download"></i></button>
          </div>
        ` : `
          <button class="btn btn-pay" onclick="openPayConfirmation('${item.employee.id}')">
            <i class="fa-solid fa-credit-card"></i> PAY
          </button>
        `}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function applyFilters() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const dept = document.getElementById('filterDepartment').value;
  const status = document.getElementById('filterStatus').value;

  const filtered = currentPayrollData.items.filter(it => {
    const matchSearch = it.employee.name.toLowerCase().includes(search) ||
      it.employee.employee_id.toLowerCase().includes(search) ||
      it.employee.designation.toLowerCase().includes(search) ||
      it.employee.department.toLowerCase().includes(search);

    const matchDept = (dept === 'All' || it.employee.department === dept);
    const matchStatus = (status === 'All' || it.paymentStatus === status);

    return matchSearch && matchDept && matchStatus;
  });

  renderSalaryTable(filtered);
}

// PAY CONFIRMATION WORKFLOW (Sections 20, 21)
function openPayConfirmation(empId) {
  const item = currentPayrollData.items.find(it => it.employee.id === empId);
  if (!item) return;

  currentActiveItem = item;
  const m = parseInt(document.getElementById('selectMonth').value, 10);
  const y = document.getElementById('selectYear').value;

  document.getElementById('payModalEmpName').textContent = item.employee.name;
  document.getElementById('payModalEmpId').textContent = item.employee.employee_id + ' • ' + item.employee.designation;
  document.getElementById('payModalPeriod').textContent = monthNames[m] + ' ' + y;

  document.getElementById('payModalGross').textContent = formatInr(item.grossSalary);
  document.getElementById('payModalBasic').textContent = formatInr(item.basicSalary);
  document.getElementById('payModalPf').textContent = formatInr(item.pf);
  document.getElementById('payModalPt').textContent = formatInr(item.pt);
  document.getElementById('payModalLeaves').textContent = item.leaveDays + ' days';
  document.getElementById('payModalLeaveDeduction').textContent = formatInr(item.leaveDeduction);
  document.getElementById('payModalTotalDeductions').textContent = formatInr(item.totalDeductions);
  document.getElementById('payModalNetSalary').textContent = formatInr(item.netSalary);

  openModal('payConfirmModal');
}

async function executePayment() {
  if (!currentActiveItem) return;

  const m = parseInt(document.getElementById('selectMonth').value, 10);
  const y = parseInt(document.getElementById('selectYear').value, 10);
  const wDays = parseInt(document.getElementById('inputWorkingDays').value, 10) || 26;

  try {
    const res = await apiRequest('/payroll/pay', 'POST', {
      employeeId: currentActiveItem.employee.id,
      month: m,
      year: y,
      leaveDays: currentActiveItem.leaveDays,
      workingDays: wDays
    });

    if (res.success) {
      closeModal('payConfirmModal');
      showToast('Salary Paid Successfully! Payslip Generated.');
      await loadPayrollData();
      // Immediately open payslip preview for verification
      if (res.payslip) {
        openPayslipPreview(res.payslip.id);
      }
    }
  } catch (err) {
    console.error('Payment failed:', err);
  }
}

// BULK ACTIONS (Sections 30, 31)
async function handleBulkPay() {
  const m = parseInt(document.getElementById('selectMonth').value, 10);
  const y = parseInt(document.getElementById('selectYear').value, 10);
  const wDays = parseInt(document.getElementById('inputWorkingDays').value, 10) || 26;

  const leavesMap = {};
  currentPayrollData.items.forEach(it => {
    leavesMap[it.employee.id] = it.leaveDays;
  });

  if (!confirm(`Are you sure you want to process payroll and generate payslips for all employees for ${monthNames[m]} ${y}?`)) return;

  try {
    showToast('Processing bulk payroll and generating vector PDFs...');
    const res = await apiRequest('/payroll/bulk-pay', 'POST', {
      month: m,
      year: y,
      workingDays: wDays,
      leavesMap
    });

    if (res.success) {
      showToast(`Bulk Payroll Complete! Generated ${res.count} payslips.`);
      await loadPayrollData();
    }
  } catch (err) {
    console.error('Bulk pay error:', err);
  }
}

function handleBulkDownloadZip() {
  const m = parseInt(document.getElementById('selectMonth').value, 10);
  const y = parseInt(document.getElementById('selectYear').value, 10);
  const downloadUrl = `${API_BASE}/payslips/bulk-download/${m}/${y}?token=${authToken}`;

  fetch(downloadUrl, {
    headers: { 'Authorization': 'Bearer ' + authToken }
  })
  .then(res => {
    if (!res.ok) throw new Error('No paid payslips found to download for this month.');
    return res.blob();
  })
  .then(blob => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CUSTQ_Payslips_${monthNames[m]}_${y}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast('ZIP archive downloaded successfully.');
  })
  .catch(err => showToast(err.message, 'error'));
}

// PAYSLIP PREVIEW & PDF DOWNLOAD (Sections 24-29)
let currentPreviewPayslipId = null;



async function openPayslipPreview(id) {
  try {
    const data = await apiRequest('/payslips/' + id);
    if (!data.success) return;

    currentPreviewPayslipId = id;
    const ps = data.payslip;
    const set = data.settings || {};

    const gross = Number(ps.gross_salary) || 0;
    const basic = ps.basic_salary !== undefined ? Number(ps.basic_salary) : (gross * 0.5);
    const hra = ps.hra !== undefined ? Number(ps.hra) : (gross * 0.3);
    const otherAllowance = ps.other_allowances !== undefined ? Number(ps.other_allowances) : Math.max(0, gross - basic - hra);

    const lop = Number(ps.leave_deduction || 0);
    const pt = Number(ps.pt || 0);
    const pf = Number(ps.pf || 0);
    const tds = Number(ps.tds || 0);
    const totalDeductions = Number(ps.total_deductions || 0);
    const netSalary = Number(ps.net_salary || 0);

    const netWords = toIndianWords(netSalary).replace(' Only', ' only');

    const logoSrc = (set.company_logo && set.company_logo.length > 0)
      ? (API_BASE.replace('/api', '') + '/' + set.company_logo)
      : (API_BASE.replace('/api', '') + '/uploads/custq_logo.jpg');

    const sigSrc = (set.signature_image && set.signature_image.length > 0)
      ? (API_BASE.replace('/api', '') + '/' + set.signature_image)
      : (API_BASE.replace('/api', '') + '/uploads/custq_signature.png');


    const docHtml = `
      <div class="payslip-exact-doc" style="background:#ffffff; color:#000000; padding:40px; border-radius:4px; font-family:'Segoe UI', Arial, sans-serif; box-shadow:0 10px 25px rgba(0,0,0,0.2);">
        
        <!-- Header -->
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px;">
          <div style="text-align:left; margin-top:20px;">
            <div style="font-size:16px; font-weight:800; color:#000000; margin-bottom:4px;">CUSTQ SOFTWARE SERVICES Pvt. Ltd.</div>
            <div style="font-size:12px; color:#000000; line-height:1.4;">#5-5-1195, Plot no.8, Sri Ganesh Nagar Colony,<br>Opp. Panama Godown, Vanasthalipuram, Hyderabad, Telangana - 500070.</div>
          </div>
          <div style="text-align:right;">
            <img src="${logoSrc}" style="max-height:60px; max-width:200px; object-fit:contain;" alt="CUSTQ Logo">
          </div>
        </div>

        <!-- PAY SLIP Title -->
        <div style="text-align:center; font-size:14px; font-weight:800; letter-spacing:1px; margin-bottom:20px; color:#000000;">
          PAY SLIP
        </div>

        <!-- Employee Info Table -->
        <table style="width:100%; border-collapse:collapse; margin-bottom:24px; font-size:12.5px; border:1.5px solid #000000;">
          <tr>
            <td style="border:1px solid #000000; padding:6px 10px; font-weight:700; width:28%;">Name of the Employee</td>
            <td style="border:1px solid #000000; padding:6px 10px; text-align:center; width:36%;">${ps.employee_name}</td>
            <td style="border:1px solid #000000; padding:6px 10px; font-weight:700; text-align:center; width:18%;">Month</td>
            <td style="border:1px solid #000000; padding:6px 10px; text-align:center; width:18%;">${(ps.monthName || 'JUNE').toUpperCase()}</td>
          </tr>
          <tr>
            <td style="border:1px solid #000000; padding:6px 10px; font-weight:700;">Designation</td>
            <td style="border:1px solid #000000; padding:6px 10px; text-align:center;">${ps.designation}</td>
            <td style="border:1px solid #000000; padding:6px 10px; font-weight:700; text-align:center;">Year</td>
            <td style="border:1px solid #000000; padding:6px 10px; text-align:center;">${ps.year}</td>
          </tr>
          <tr>
            <td style="border:1px solid #000000; padding:6px 10px; font-weight:700;">Employee ID</td>
            <td style="border:1px solid #000000; padding:6px 10px; text-align:center;">${ps.emp_code}</td>
            <td style="border:1px solid #000000; padding:6px 10px; font-weight:700; text-align:center;">CL</td>
            <td style="border:1px solid #000000; padding:6px 10px; text-align:center;">${ps.leave_days || 0}</td>
          </tr>
          <tr>
            <td style="border:1px solid #000000; padding:6px 10px; font-weight:700;">Department</td>
            <td colspan="3" style="border:1px solid #000000; padding:6px 10px; text-align:center; text-transform:uppercase;">${ps.department}</td>
          </tr>
        </table>

        <!-- Earnings & Deductions Table -->
        <table style="width:100%; border-collapse:collapse; margin-bottom:20px; font-size:12.5px; border:1.5px solid #000000;">
          <thead>
            <tr>
              <th colspan="2" style="border:1px solid #000000; padding:8px; text-align:center; font-weight:800; width:50%;">EARNINGS  (A)</th>
              <th colspan="2" style="border:1px solid #000000; padding:8px; text-align:center; font-weight:800; width:50%;">DEDUCTIONS (B)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border:1px solid #000000; padding:6px 10px; font-weight:700; width:35%;">Basic+ DA</td>
              <td style="border:1px solid #000000; padding:6px 10px; text-align:right; width:15%;">${basic}</td>
              <td style="border:1px solid #000000; padding:6px 10px; font-weight:700; width:35%;">LOP</td>
              <td style="border:1px solid #000000; padding:6px 10px; text-align:right; width:15%;">${lop}</td>
            </tr>
            <tr>
              <td style="border:1px solid #000000; padding:6px 10px; font-weight:700;">HRA</td>
              <td style="border:1px solid #000000; padding:6px 10px; text-align:right;">${hra}</td>
              <td style="border:1px solid #000000; padding:6px 10px; font-weight:700;">P T</td>
              <td style="border:1px solid #000000; padding:6px 10px; text-align:right;">${pt}</td>
            </tr>
            <tr>
              <td style="border:1px solid #000000; padding:6px 10px; font-weight:700;">Other Allowance</td>
              <td style="border:1px solid #000000; padding:6px 10px; text-align:right;">${otherAllowance}</td>
              <td style="border:1px solid #000000; padding:6px 10px; font-weight:700;">P F</td>
              <td style="border:1px solid #000000; padding:6px 10px; text-align:right;">${pf}</td>
            </tr>
            <tr>
              <td style="border:1px solid #000000; padding:6px 10px;">&nbsp;</td>
              <td style="border:1px solid #000000; padding:6px 10px;">&nbsp;</td>
              <td style="border:1px solid #000000; padding:6px 10px; font-weight:700;">TDS</td>
              <td style="border:1px solid #000000; padding:6px 10px; text-align:right;">${tds}</td>
            </tr>
            <tr>
              <td style="border:1px solid #000000; padding:6px 10px;">&nbsp;</td>
              <td style="border:1px solid #000000; padding:6px 10px;">&nbsp;</td>
              <td style="border:1px solid #000000; padding:6px 10px; font-weight:700;">Total</td>
              <td style="border:1px solid #000000; padding:6px 10px; text-align:right;">${totalDeductions}</td>
            </tr>
            <tr>
              <td style="border:1px solid #000000; padding:6px 10px; font-weight:800;">Total</td>
              <td style="border:1px solid #000000; padding:6px 10px; text-align:right; font-weight:800;">${gross}</td>
              <td style="border:1px solid #000000; padding:6px 10px; font-weight:800;">NET PAY(A-B)</td>
              <td style="border:1px solid #000000; padding:6px 10px; text-align:right; font-weight:800;">${netSalary}</td>
            </tr>
          </tbody>
        </table>

        <!-- Net Pay in Words & Signature Section -->
        <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:20px;">
          <div style="font-size:12.5px; color:#000000; margin-left:6px; max-width:60%;">
            (Net Pay in Words: ${netWords}).
          </div>
          <div style="text-align:center; min-width:180px;">
            <div style="font-size:11px; font-weight:700; color:#000000; margin-bottom:4px;">For CUSTQ SOFTWARE SERVICES Pvt. Ltd.</div>
            <img src="${sigSrc}" style="max-height:85px; max-width:130px; object-fit:contain; margin:2px auto;" alt="Authorized Seal">
            <div style="font-size:11px; font-weight:700; color:#000000; margin-top:4px;">Authorized Signatory</div>
          </div>
        </div>

      </div>
    `;

    document.getElementById('payslipPreviewBody').innerHTML = docHtml;
    openModal('payslipPreviewModal');
  } catch (err) {
    console.error('Payslip preview error:', err);
  }
}



async function downloadPayslipDirect(id, empCode) {
  try {
    showToast('Preparing PDF download...');
    const url = `${API_BASE}/payslips/download/${id}?token=${authToken}`;
    const res = await fetch(url, {
      headers: authToken ? { 'Authorization': 'Bearer ' + authToken } : {}
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to download PDF');
    }

    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    const safeName = String(empCode || 'Employee').trim().replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_');
   a.download = `${safeName}_Payslip.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
    showToast('PDF downloaded successfully!');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// EXCEL UPLOAD & AUTO PAYSLIP GENERATION
function openExcelModal() {
  selectedExcelFile = null;
  const fileInput = document.getElementById('excelFileInput');
  if (fileInput) fileInput.value = '';
  const nameBox = document.getElementById('selectedExcelName');
  if (nameBox) nameBox.textContent = '';
  const btn = document.getElementById('btnProcessExcel');
  if (btn) btn.disabled = true;
  openModal('excelModal');
}

function onExcelFileSelected(input) {
  if (input.files && input.files[0]) {
    selectedExcelFile = input.files[0];
    const nameBox = document.getElementById('selectedExcelName');
    if (nameBox) nameBox.textContent = 'Selected: ' + selectedExcelFile.name;
    const btn = document.getElementById('btnProcessExcel');
    if (btn) btn.disabled = false;
  }
}

async function processExcelUpload() {
  if (!selectedExcelFile) return;

  const formData = new FormData();
  formData.append('excelFile', selectedExcelFile);

  const btn = document.getElementById('btnProcessExcel');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
  }

  try {
    showToast('Parsing spreadsheet and generating payslips...');
    const res = await apiRequest('/payroll/upload-excel', 'POST', formData);

    if (res.success) {
      closeModal('excelModal');
      lastExcelResult = res;
      showToast('Generated ' + res.count + ' payslips successfully!');
      displayExcelResults(res);
      await loadPayrollData();
    }
  } catch (err) {
    console.error('Excel upload error:', err);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-bolt"></i> Process & Generate Payslips';
    }
  }
}

function displayExcelResults(res) {
  const title = document.getElementById('excelResultTitle');
  if (title) title.textContent = 'Generated ' + res.count + ' Payslips for ' + res.monthName + ' ' + res.year;

  const tbody = document.getElementById('excelResultTableBody');
  if (tbody) {
    tbody.innerHTML = '';
    res.payslips.forEach(ps => {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td><code>' + ps.employee_id + '</code></td>' +
        '<td><strong>' + ps.name + '</strong></td>' +
        '<td>' + formatInr(ps.grossSalary) + '</td>' +
        '<td>' + ps.leaveDays + ' days</td>' +
        '<td>' + formatInr(ps.totalDeductions) + '</td>' +
        '<td><strong style="color: var(--primary);">' + formatInr(ps.netSalary) + '</strong></td>' +
        '<td>' +
          '<div style="display:flex; gap:6px;">' +
            '<button class="btn btn-secondary btn-sm" onclick="openPayslipPreview(\'' + ps.payslipId + '\')"><i class="fa-regular fa-eye"></i> View</button>' +
            '<button class="btn btn-primary btn-sm" onclick="downloadPayslipDirect(\'' + ps.payslipId + '\', \'' + ps.name + '\')"><i class="fa-solid fa-download"></i> PDF</button>' +
          '</div>' +
        '</td>';
      tbody.appendChild(tr);
    });
  }

  openModal('excelResultModal');
}

async function downloadZipFromExcelResult() {
  if (!lastExcelResult) return;
  const m = lastExcelResult.month;
  const y = lastExcelResult.year;
  const monthName = lastExcelResult.monthName || 'Payroll';

  try {
    showToast('Creating and packaging ZIP bundle...');
    const downloadUrl = `${API_BASE}/payslips/bulk-download/${m}/${y}?token=${authToken}`;
    const res = await fetch(downloadUrl, {
      headers: authToken ? { 'Authorization': 'Bearer ' + authToken } : {}
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Failed to generate ZIP archive.');
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CUSTQ_Payslips_${monthName}_${y}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    showToast('ZIP archive downloaded successfully!');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// MODAL UTILS
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('active');
}





// ==========================================
// HR DOCUMENTS: EXPERIENCE & RELIEVING LETTERS
// ==========================================
let currentActiveHrDoc = null;

function execEditorCmd(cmd) {
  document.execCommand(cmd, false, null);
}

function formatDateDisplay(dStr) {
  if (!dStr) return '';
  const d = new Date(dStr);
  if (isNaN(d.getTime())) return dStr;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

function calculateExpDuration() {
  const dojVal = document.getElementById('expDoj').value;
  const lwdVal = document.getElementById('expLwd').value;
  if (!dojVal || !lwdVal) return;

  const d1 = new Date(dojVal);
  const d2 = new Date(lwdVal);
  if (d2 < d1) return;

  let months = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
  let days = d2.getDate() - d1.getDate();
  if (days < 0) {
    months -= 1;
    days += 30;
  }
  const years = Math.floor(months / 12);
  const remMonths = months % 12;

  let str = '';
  if (years > 0) str += years + (years === 1 ? ' Year' : ' Years');
  if (remMonths > 0) str += (str ? ', ' : '') + remMonths + (remMonths === 1 ? ' Month' : ' Months');
  if (!str) str = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24))) + ' Days';

  document.getElementById('expDuration').value = str;
}

function openExperienceLetterModal() {
  const randNum = Math.floor(1000 + Math.random() * 9000);
  const year = new Date().getFullYear();
  document.getElementById('expRefNo').value = 'CUSTQ/EXP/' + year + '/' + randNum;
  document.getElementById('expLetterDate').value = new Date().toISOString().substring(0, 10);
  
  if (!document.getElementById('expEmpName').value) {
    document.getElementById('expEmpName').value = 'G Sai Krishna';
    document.getElementById('expEmpId').value = 'CSQ021';
    document.getElementById('expDesignation').value = 'Team Leader';
    document.getElementById('expDepartment').value = 'Web Development';
    document.getElementById('expDoj').value = '2023-01-15';
    document.getElementById('expLwd').value = '2024-06-30';
    document.getElementById('expRole').value = 'Full Stack Architect & Lead';
    calculateExpDuration();
  }

  resetExperienceLetterTemplate();
  openModal('experienceLetterModal');
}

function resetExperienceLetterTemplate() {
  const name = document.getElementById('expEmpName').value.trim() || 'The Employee';
  const empId = document.getElementById('expEmpId').value.trim() || 'CSQ001';
  const desig = document.getElementById('expDesignation').value.trim() || 'Software Engineer';
  const dept = document.getElementById('expDepartment').value.trim() || 'Web Development';
  const doj = formatDateDisplay(document.getElementById('expDoj').value) || 'Joining Date';
  const lwd = formatDateDisplay(document.getElementById('expLwd').value) || 'Relieving Date';
  const role = document.getElementById('expRole').value.trim() || desig;
  const duration = document.getElementById('expDuration').value.trim() || 'their tenure';
  const remarks = document.getElementById('expRemarks').value.trim() || 'During their tenure, we observed them to be sincere, dedicated, and hardworking with high professional standards.';

  const html = '<p>This is to certify that <b>' + name + '</b> (Employee ID: <b>' + empId + '</b>) was employed with <b>CUSTQ SOFTWARE SERVICES Pvt. Ltd.</b> from <b>' + doj + '</b> to <b>' + lwd + '</b>.</p>' +
    '<p>During their tenure of <b>' + duration + '</b>, they served in the capacity of <b>' + desig + '</b> in the <b>' + dept + '</b> department. Their role primarily encompassed responsibilities as <b>' + role + '</b>, handling critical architectural and client delivery milestones.</p>' +
    '<p>' + remarks + '</p>' +
    '<p>We appreciate their valuable contributions to the organization and wish them all success in their future endeavors.</p>';

  document.getElementById('expEditorBody').innerHTML = html;
}

function updateExperienceLetterTemplate() {
  // Realtime update only if user has not heavily modified
}

function openRelievingLetterModal() {
  const randNum = Math.floor(1000 + Math.random() * 9000);
  const year = new Date().getFullYear();
  document.getElementById('relRefNo').value = 'CUSTQ/REL/' + year + '/' + randNum;
  document.getElementById('relLetterDate').value = new Date().toISOString().substring(0, 10);

  if (!document.getElementById('relEmpName').value) {
    document.getElementById('relEmpName').value = 'Diya Patel';
    document.getElementById('relEmpId').value = 'CSQ022';
    document.getElementById('relDesignation').value = 'Product Designer';
    document.getElementById('relDepartment').value = 'Design & UI';
    document.getElementById('relDoj').value = '2023-03-01';
    document.getElementById('relLwd').value = '2024-06-30';
    document.getElementById('relRelievingDate').value = '2024-06-30';
  }

  resetRelievingLetterTemplate();
  openModal('relievingLetterModal');
}

function resetRelievingLetterTemplate() {
  const name = document.getElementById('relEmpName').value.trim() || 'The Employee';
  const empId = document.getElementById('relEmpId').value.trim() || 'CSQ002';
  const desig = document.getElementById('relDesignation').value.trim() || 'Product Designer';
  const dept = document.getElementById('relDepartment').value.trim() || 'Design';
  const doj = formatDateDisplay(document.getElementById('relDoj').value) || 'Joining Date';
  const relDate = formatDateDisplay(document.getElementById('relRelievingDate').value) || 'Relieving Date';
  const remarks = document.getElementById('relRemarks').value.trim() || 'All company assets, confidential documents, and outstanding accounts have been settled and cleared satisfactorily.';

  const html = '<p>This has reference to your resignation letter. We wish to inform you that your resignation has been accepted and you are hereby officially relieved from the services of <b>CUSTQ SOFTWARE SERVICES Pvt. Ltd.</b> effective from the closing hours of <b>' + relDate + '</b>.</p>' +
    '<p>We confirm that you were associated with us as <b>' + desig + '</b> in the <b>' + dept + '</b> department (Employee ID: <b>' + empId + '</b>) since <b>' + doj + '</b>.</p>' +
    '<p>' + remarks + '</p>' +
    '<p>We take this opportunity to thank you for your contributions during your association with CUSTQ and wish you the very best for your future career.</p>';

  document.getElementById('relEditorBody').innerHTML = html;
}

function updateRelievingLetterTemplate() {
  // Realtime hook
}

function renderA4HrLetterPreview(docData, settings = {}) {
  const isExp = docData.document_type === 'experience_letter';
  const title = isExp ? 'TO WHOMSOEVER IT MAY CONCERN' : 'RELIEVING LETTER';

  const logoSrc = (settings.company_logo && settings.company_logo.length > 0)
    ? (API_BASE.replace('/api', '') + '/' + settings.company_logo)
    : (API_BASE.replace('/api', '') + '/uploads/custq_logo.jpg');

  const sigSrc = (settings.signature_image && settings.signature_image.length > 0)
    ? (API_BASE.replace('/api', '') + '/' + settings.signature_image)
    : (API_BASE.replace('/api', '') + '/uploads/custq_signature.png');

  const dateStr = formatDateDisplay(docData.letter_date || new Date());

  return `
    <div class="hr-letter-sheet">
      <!-- HEADER & LOGO -->
      <div class="hr-letter-header">
        <div>
          <div class="hr-letter-company-title">${settings.company_name || 'CUSTQ SOFTWARE SERVICES Pvt. Ltd.'}</div>
          <div class="hr-letter-address">
            #5-5-1195, Plot no.8, Sri Ganesh Nagar Colony,<br>
            Opp. Panama Godown, Vanasthalipuram, Hyderabad, Telangana - 500070.<br>
            Website: www.custq.in | Email: hr@custq.in
          </div>
        </div>
        <div>
          <img src="${logoSrc}" style="max-height:55px; max-width:170px; object-fit:contain;" alt="CUSTQ Logo">
        </div>
      </div>

      <div class="hr-letter-divider"></div>

      <!-- REF & DATE -->
      <div class="hr-letter-ref-bar">
        <div>Ref: ${docData.reference_number || 'CUSTQ/HR/2026/001'}</div>
        <div>Date: ${dateStr}</div>
      </div>

      <!-- TITLE -->
      <div class="hr-letter-subject-title">${title}</div>

      <!-- BODY -->
      <div class="hr-letter-content-body">
        ${docData.content_html || ''}
      </div>

      ${docData.additional_remarks ? `<div style="font-size:11.5px; font-style:italic; margin-bottom:20px; color:#475569;">Note: ${docData.additional_remarks}</div>` : ''}

      <!-- SIGNATURE SECTION -->
      <div class="hr-letter-signature-section">
        <div class="hr-letter-sig-box">
          <div class="hr-letter-sig-company">For CUSTQ SOFTWARE SERVICES Pvt. Ltd.</div>
          <img src="${sigSrc}" class="hr-letter-stamp-img" alt="Seal & Signature">
          <div class="hr-letter-sig-title">Authorized Signatory</div>
          <div class="hr-letter-sig-dept">Human Resources Department</div>
        </div>
      </div>

      <!-- FOOTER -->
      <div class="hr-letter-footer-note">
        CUSTQ Software Services Pvt. Ltd. • Registered Office: Vanasthalipuram, Hyderabad - 500070 • www.custq.in
      </div>
    </div>
  `;
}

function previewExperienceLetterModal() {
  const docData = {
    document_type: 'experience_letter',
    employee_name: document.getElementById('expEmpName').value.trim(),
    employee_id_str: document.getElementById('expEmpId').value.trim(),
    reference_number: document.getElementById('expRefNo').value.trim(),
    letter_date: document.getElementById('expLetterDate').value,
    content_html: document.getElementById('expEditorBody').innerHTML,
    additional_remarks: document.getElementById('expRemarks').value.trim()
  };

  currentActiveHrDoc = docData;
  document.getElementById('hrLetterPreviewModalTitle').innerHTML = '<i class="fa-solid fa-award"></i> Experience Letter Preview';
  document.getElementById('hrLetterPreviewBody').innerHTML = renderA4HrLetterPreview(docData, currentPayrollData.settings || {});
  openModal('hrLetterPreviewModal');
}

function previewRelievingLetterModal() {
  const docData = {
    document_type: 'relieving_letter',
    employee_name: document.getElementById('relEmpName').value.trim(),
    employee_id_str: document.getElementById('relEmpId').value.trim(),
    reference_number: document.getElementById('relRefNo').value.trim(),
    letter_date: document.getElementById('relLetterDate').value,
    content_html: document.getElementById('relEditorBody').innerHTML,
    additional_remarks: document.getElementById('relRemarks').value.trim()
  };

  currentActiveHrDoc = docData;
  document.getElementById('hrLetterPreviewModalTitle').innerHTML = '<i class="fa-solid fa-door-open"></i> Relieving Letter Preview';
  document.getElementById('hrLetterPreviewBody').innerHTML = renderA4HrLetterPreview(docData, currentPayrollData.settings || {});
  openModal('hrLetterPreviewModal');
}

async function handleGenerateExperienceLetter(e) {
  e.preventDefault();
  const payload = {
    documentType: 'experience_letter',
    employeeName: document.getElementById('expEmpName').value.trim(),
    employeeId: document.getElementById('expEmpId').value.trim(),
    designation: document.getElementById('expDesignation').value.trim(),
    department: document.getElementById('expDepartment').value.trim(),
    joiningDate: document.getElementById('expDoj').value,
    relievingDate: document.getElementById('expLwd').value,
    experienceDuration: document.getElementById('expDuration').value.trim(),
    referenceNumber: document.getElementById('expRefNo').value.trim(),
    letterDate: document.getElementById('expLetterDate').value,
    contentHtml: document.getElementById('expEditorBody').innerHTML,
    additionalRemarks: document.getElementById('expRemarks').value.trim()
  };

  try {
    showToast('Generating Experience Letter PDF & saving...');
    const res = await apiRequest('/hr-documents/generate', 'POST', payload);
    if (res.success) {
      closeModal('experienceLetterModal');
      showToast('Experience Letter generated successfully!');
      currentActiveHrDoc = res.document;
      document.getElementById('hrLetterPreviewModalTitle').innerHTML = '<i class="fa-solid fa-award"></i> Experience Letter Generated';
      document.getElementById('hrLetterPreviewBody').innerHTML = renderA4HrLetterPreview(res.document, currentPayrollData.settings || {});
      openModal('hrLetterPreviewModal');
      loadHrDocumentsHistory();
    }
  } catch (err) {
    console.error('Error generating experience letter:', err);
  }
}

async function handleGenerateRelievingLetter(e) {
  e.preventDefault();
  const payload = {
    documentType: 'relieving_letter',
    employeeName: document.getElementById('relEmpName').value.trim(),
    employeeId: document.getElementById('relEmpId').value.trim(),
    designation: document.getElementById('relDesignation').value.trim(),
    department: document.getElementById('relDepartment').value.trim(),
    joiningDate: document.getElementById('relDoj').value,
    relievingDate: document.getElementById('relRelievingDate').value,
    referenceNumber: document.getElementById('relRefNo').value.trim(),
    letterDate: document.getElementById('relLetterDate').value,
    contentHtml: document.getElementById('relEditorBody').innerHTML,
    additionalRemarks: document.getElementById('relRemarks').value.trim()
  };

  try {
    showToast('Generating Relieving Letter PDF & saving...');
    const res = await apiRequest('/hr-documents/generate', 'POST', payload);
    if (res.success) {
      closeModal('relievingLetterModal');
      showToast('Relieving Letter generated successfully!');
      currentActiveHrDoc = res.document;
      document.getElementById('hrLetterPreviewModalTitle').innerHTML = '<i class="fa-solid fa-door-open"></i> Relieving Letter Generated';
      document.getElementById('hrLetterPreviewBody').innerHTML = renderA4HrLetterPreview(res.document, currentPayrollData.settings || {});
      openModal('hrLetterPreviewModal');
      loadHrDocumentsHistory();
    }
  } catch (err) {
    console.error('Error generating relieving letter:', err);
  }
}

async function loadHrDocumentsHistory() {
  const search = (document.getElementById('searchHrDocs')?.value || '').trim();
  const docType = document.getElementById('filterHrDocType')?.value || 'All';

  try {
    let url = '/hr-documents?';
    if (docType && docType !== 'All') url += 'documentType=' + encodeURIComponent(docType) + '&';
    if (search) url += 'search=' + encodeURIComponent(search);

    const data = await apiRequest(url);
    const tbody = document.getElementById('hrDocsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const countEl = document.getElementById('hrDocsCount');
    if (countEl) countEl.textContent = (data.count || 0) + ' documents';

    if (!data.documents || data.documents.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:30px; color:var(--text-dim);">No HR documents generated yet. Click "Generate Experience Letter" or "Generate Relieving Letter" above.</td></tr>';
      return;
    }

    data.documents.forEach(doc => {
      const isExp = doc.document_type === 'experience_letter';
      const badgeClass = isExp ? 'badge-paid' : 'badge-pending';
      const typeLabel = isExp ? 'Experience Letter' : 'Relieving Letter';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${doc.employee_name}</strong></td>
        <td><code>${doc.employee_id_str || '-'}</code></td>
        <td><span class="badge ${badgeClass}">${typeLabel}</span></td>
        <td><code>${doc.reference_number}</code></td>
        <td>${formatDateDisplay(doc.letter_date)}</td>
        <td>${new Date(doc.created_at).toLocaleDateString()}</td>
        <td>${doc.generated_by_email || 'Admin'}</td>
        <td>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-secondary btn-sm" onclick="viewHrDocumentModal('${doc.id}')" title="View Preview"><i class="fa-regular fa-eye"></i></button>
            <button class="btn btn-primary btn-sm" onclick="downloadHrDocumentDirect('${doc.id}', '${doc.employee_name}', '${doc.document_type}')" title="Download PDF"><i class="fa-solid fa-download"></i></button>
            <button class="btn btn-icon btn-sm" style="color:#ef4444;" onclick="deleteHrDocument('${doc.id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Error loading HR documents:', err);
  }
}

async function viewHrDocumentModal(id) {
  try {
    const res = await apiRequest('/hr-documents/' + id);
    if (res.success) {
      currentActiveHrDoc = res.document;
      const isExp = res.document.document_type === 'experience_letter';
      document.getElementById('hrLetterPreviewModalTitle').innerHTML = isExp
        ? '<i class="fa-solid fa-award"></i> Experience Letter'
        : '<i class="fa-solid fa-door-open"></i> Relieving Letter';
      document.getElementById('hrLetterPreviewBody').innerHTML = renderA4HrLetterPreview(res.document, res.settings || {});
      openModal('hrLetterPreviewModal');
    }
  } catch (err) {
    console.error(err);
  }
}

async function downloadHrDocumentDirect(id, empName, docType) {
  try {
    showToast('Downloading HR Document PDF...');
    const url = API_BASE + '/hr-documents/download/' + id + '?token=' + authToken;
    const res = await fetch(url, {
      headers: authToken ? { 'Authorization': 'Bearer ' + authToken } : {}
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to download PDF');
    }

    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    const cleanName = String(empName || 'Employee').trim().replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_');
    const typeLabel = docType === 'experience_letter' ? 'Experience_Letter' : 'Relieving_Letter';
    a.download = `${cleanName}_${typeLabel}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
    showToast('PDF downloaded successfully!');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function downloadCurrentHrLetterPdf() {
  if (currentActiveHrDoc && currentActiveHrDoc.id) {
    downloadHrDocumentDirect(currentActiveHrDoc.id, currentActiveHrDoc.employee_name, currentActiveHrDoc.document_type);
  } else {
    window.print();
  }
}

function printHrLetterDoc() {
  window.print();
}

async function deleteHrDocument(id) {
  if (!confirm('Are you sure you want to delete this HR document?')) return;
  try {
    const res = await apiRequest('/hr-documents/' + id, 'DELETE');
    if (res.success) {
      showToast('Document deleted successfully.');
      loadHrDocumentsHistory();
    }
  } catch (err) {
    console.error(err);
  }
}
