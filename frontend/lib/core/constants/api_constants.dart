class ApiConstants {
  static const String baseUrl = 'http://localhost:5000/api';
  
  // Auth
  static const String login = '$baseUrl/auth/login';
  static const String me = '$baseUrl/auth/me';

  // Employees
  static const String employees = '$baseUrl/employees';

  // Payroll
  static const String payrollCalculate = '$baseUrl/payroll/calculate';
  static const String payrollPeriod = '$baseUrl/payroll/period';
  static const String payrollPay = '$baseUrl/payroll/pay';
  static const String payrollBulkPay = '$baseUrl/payroll/bulk-pay';

  // Payslips
  static const String payslips = '$baseUrl/payslips';
  static const String payslipDownload = '$baseUrl/payslips/download';
  static const String payslipsBulkDownload = '$baseUrl/payslips/bulk-download';

  // Settings
  static const String settings = '$baseUrl/settings';
  static const String uploadLogo = '$baseUrl/settings/logo';
  static const String uploadSignature = '$baseUrl/settings/signature';

  // Staff Portal
  static const String myPayslips = '$baseUrl/employee-portal/my-payslips';
  static const String mySalaryHistory = '$baseUrl/employee-portal/my-salary-history';
}
