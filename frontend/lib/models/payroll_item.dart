import 'employee.dart';

class PayrollItem {
  final Employee employee;
  final String? salaryId;
  final double grossSalary;
  final double basicSalary;
  final double pf;
  final double pt;
  double leaveDays;
  double leaveDeduction;
  double tds;
  double otherDeductions;
  double totalDeductions;
  double netSalary;
  String paymentStatus;
  String? paymentReference;
  String? paidAt;
  String? payslipId;
  String? payslipNumber;

  PayrollItem({
    required this.employee,
    this.salaryId,
    required this.grossSalary,
    required this.basicSalary,
    required this.pf,
    required this.pt,
    required this.leaveDays,
    required this.leaveDeduction,
    required this.tds,
    required this.otherDeductions,
    required this.totalDeductions,
    required this.netSalary,
    required this.paymentStatus,
    this.paymentReference,
    this.paidAt,
    this.payslipId,
    this.payslipNumber,
  });

  bool get isPaid => paymentStatus == 'paid';

  void recalculate(int workingDays) {
    final daily = grossSalary / (workingDays > 0 ? workingDays : 26);
    leaveDeduction = double.parse((daily * leaveDays).toStringAsFixed(2));
    totalDeductions = double.parse((pf + pt + leaveDeduction + tds + otherDeductions).toStringAsFixed(2));
    netSalary = double.parse((grossSalary - totalDeductions).clamp(0.0, double.infinity).toStringAsFixed(2));
  }

  factory PayrollItem.fromJson(Map<String, dynamic> json) {
    return PayrollItem(
      employee: Employee.fromJson(json['employee']),
      salaryId: json['salaryId'],
      grossSalary: (json['grossSalary'] as num).toDouble(),
      basicSalary: (json['basicSalary'] as num).toDouble(),
      pf: (json['pf'] as num).toDouble(),
      pt: (json['pt'] as num).toDouble(),
      leaveDays: (json['leaveDays'] as num).toDouble(),
      leaveDeduction: (json['leaveDeduction'] as num).toDouble(),
      tds: (json['tds'] as num).toDouble(),
      otherDeductions: (json['otherDeductions'] as num).toDouble(),
      totalDeductions: (json['totalDeductions'] as num).toDouble(),
      netSalary: (json['netSalary'] as num).toDouble(),
      paymentStatus: json['paymentStatus'] ?? 'pending',
      paymentReference: json['paymentReference'],
      paidAt: json['paidAt'],
      payslipId: json['payslipId'],
      payslipNumber: json['payslipNumber'],
    );
  }
}
