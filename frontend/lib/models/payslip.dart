class Payslip {
  final String id;
  final String salaryId;
  final String employeeId;
  final String payslipNumber;
  final String? pdfPath;
  final String? employeeName;
  final String? empCode;
  final String? designation;
  final String? department;
  final double grossSalary;
  final double totalDeductions;
  final double netSalary;
  final String paymentStatus;
  final String? paidAt;
  final int month;
  final int year;
  final String monthName;

  Payslip({
    required this.id,
    required this.salaryId,
    required this.employeeId,
    required this.payslipNumber,
    this.pdfPath,
    this.employeeName,
    this.empCode,
    this.designation,
    this.department,
    required this.grossSalary,
    required this.totalDeductions,
    required this.netSalary,
    required this.paymentStatus,
    this.paidAt,
    required this.month,
    required this.year,
    required this.monthName,
  });

  factory Payslip.fromJson(Map<String, dynamic> json) {
    return Payslip(
      id: json['id'] ?? '',
      salaryId: json['salary_id'] ?? json['salaryId'] ?? '',
      employeeId: json['employee_id'] ?? json['employeeId'] ?? '',
      payslipNumber: json['payslip_number'] ?? json['payslipNumber'] ?? '',
      pdfPath: json['pdf_path'] ?? json['pdfPath'],
      employeeName: json['employee_name'],
      empCode: json['emp_code'] ?? json['employee_id'],
      designation: json['designation'],
      department: json['department'],
      grossSalary: (json['gross_salary'] is num) ? (json['gross_salary'] as num).toDouble() : 0.0,
      totalDeductions: (json['total_deductions'] is num) ? (json['total_deductions'] as num).toDouble() : 0.0,
      netSalary: (json['net_salary'] is num) ? (json['net_salary'] as num).toDouble() : 0.0,
      paymentStatus: json['payment_status'] ?? 'paid',
      paidAt: json['paid_at'],
      month: json['month'] ?? 1,
      year: json['year'] ?? 2026,
      monthName: json['monthName'] ?? '',
    );
  }
}
