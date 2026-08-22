import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/theme/app_theme.dart';
import '../core/utils/currency_formatter.dart';
import '../services/payroll_service.dart';
import '../models/payroll_item.dart';

class SalaryScreen extends StatefulWidget {
  const SalaryScreen({super.key});

  @override
  State<SalaryScreen> createState() => _SalaryScreenState();
}

class _SalaryScreenState extends State<SalaryScreen> {
  int _selectedMonth = 6;
  int _selectedYear = 2026;
  int _workingDays = 26;
  String _search = '';
  String _selectedDept = 'All';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadData();
    });
  }

  void _loadData() {
    context.read<PayrollService>().fetchPayrollForPeriod(
      month: _selectedMonth,
      year: _selectedYear,
      workingDays: _workingDays,
    );
  }

  @override
  Widget build(BuildContext context) {
    final payroll = context.watch<PayrollService>();
    final summary = payroll.summary;
    final items = payroll.items.where((it) {
      final matchSearch = it.employee.name.toLowerCase().contains(_search.toLowerCase()) ||
          it.employee.employeeId.toLowerCase().contains(_search.toLowerCase());
      final matchDept = _selectedDept == 'All' || it.employee.department == _selectedDept;
      return matchSearch && matchDept;
    }).toList();

    return Scaffold(
      body: payroll.isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Monthly Payroll Processing', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
                          Text('CUSTQ Software Services Pvt. Ltd.', style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                        ],
                      ),
                      Row(
                        children: [
                          _buildMonthDropdown(),
                          const SizedBox(width: 10),
                          _buildYearDropdown(),
                          const SizedBox(width: 10),
                          _buildWorkingDaysField(),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      _summaryCard('Total Employees', summary['totalEmployees']?.toString() ?? '0', Icons.people, AppTheme.accent),
                      const SizedBox(width: 12),
                      _summaryCard('Total Gross', CurrencyFormatter.format(summary['totalGrossSalary']), Icons.monetization_on, AppTheme.primary),
                      const SizedBox(width: 12),
                      _summaryCard('Total Deductions', CurrencyFormatter.format(summary['totalDeductions']), Icons.money_off, AppTheme.warning),
                      const SizedBox(width: 12),
                      _summaryCard('Total Net Pay', CurrencyFormatter.format(summary['totalNetPay']), Icons.account_balance, AppTheme.success),
                    ],
                  ),
                  const SizedBox(height: 24),
                  Container(
                    decoration: BoxDecoration(
                      color: AppTheme.surface,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppTheme.border),
                    ),
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('Payroll Sheet (${items.length} records)', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                            SizedBox(
                              width: 250,
                              height: 38,
                              child: TextField(
                                onChanged: (v) => setState(() => _search = v),
                                decoration: const InputDecoration(
                                  hintText: 'Search employee...',
                                  prefixIcon: Icon(Icons.search, size: 18),
                                  contentPadding: EdgeInsets.zero,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          child: DataTable(
                            columns: const [
                              DataColumn(label: Text('Employee')),
                              DataColumn(label: Text('ID')),
                              DataColumn(label: Text('Designation')),
                              DataColumn(label: Text('Gross Salary')),
                              DataColumn(label: Text('Basic (50%)')),
                              DataColumn(label: Text('PF (12%)')),
                              DataColumn(label: Text('PT')),
                              DataColumn(label: Text('Leaves')),
                              DataColumn(label: Text('Leave Ded.')),
                              DataColumn(label: Text('Total Ded.')),
                              DataColumn(label: Text('Net Pay')),
                              DataColumn(label: Text('Status')),
                              DataColumn(label: Text('Action')),
                            ],
                            rows: items.map((it) {
                              return DataRow(
                                cells: [
                                  DataCell(Text(it.employee.name, style: const TextStyle(fontWeight: FontWeight.w600))),
                                  DataCell(Text(it.employee.employeeId)),
                                  DataCell(Text(it.employee.designation)),
                                  DataCell(Text(CurrencyFormatter.format(it.grossSalary))),
                                  DataCell(Text(CurrencyFormatter.format(it.basicSalary))),
                                  DataCell(Text(CurrencyFormatter.format(it.pf))),
                                  DataCell(Text(CurrencyFormatter.format(it.pt))),
                                  DataCell(
                                    it.isPaid
                                        ? Text('${it.leaveDays}')
                                        : SizedBox(
                                            width: 50,
                                            height: 30,
                                            child: TextField(
                                              keyboardType: TextInputType.number,
                                              textAlign: TextAlign.center,
                                              decoration: const InputDecoration(contentPadding: EdgeInsets.all(4)),
                                              controller: TextEditingController(text: it.leaveDays.toString()),
                                              onSubmitted: (v) {
                                                setState(() {
                                                  it.leaveDays = double.tryParse(v) ?? 0.0;
                                                  it.recalculate(_workingDays);
                                                });
                                              },
                                            ),
                                          ),
                                  ),
                                  DataCell(Text(CurrencyFormatter.format(it.leaveDeduction))),
                                  DataCell(Text(CurrencyFormatter.format(it.totalDeductions))),
                                  DataCell(Text(CurrencyFormatter.format(it.netSalary), style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primaryLight))),
                                  DataCell(
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: it.isPaid ? AppTheme.success.withOpacity(0.15) : AppTheme.warning.withOpacity(0.15),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(it.isPaid ? 'PAID' : 'PENDING', style: TextStyle(color: it.isPaid ? AppTheme.success : AppTheme.warning, fontSize: 11, fontWeight: FontWeight.bold)),
                                    ),
                                  ),
                                  DataCell(
                                    it.isPaid
                                        ? const Text('Paid ✓', style: TextStyle(color: AppTheme.success, fontSize: 12))
                                        : ElevatedButton(
                                            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary, padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6)),
                                            onPressed: () => _confirmPay(it),
                                            child: const Text('PAY', style: TextStyle(fontSize: 11)),
                                          ),
                                  ),
                                ],
                              );
                            }).toList(),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _summaryCard(String title, String val, IconData icon, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppTheme.border)),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: color.withOpacity(0.15), borderRadius: BorderRadius.circular(10)),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 11, color: AppTheme.textMuted, fontWeight: FontWeight.bold)),
                Text(val, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMonthDropdown() {
    return DropdownButton<int>(
      value: _selectedMonth,
      dropdownColor: AppTheme.surface,
      items: List.generate(12, (i) => DropdownMenuItem(value: i + 1, child: Text(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i]))),
      onChanged: (v) {
        if (v != null) {
          setState(() => _selectedMonth = v);
          _loadData();
        }
      },
    );
  }

  Widget _buildYearDropdown() {
    return DropdownButton<int>(
      value: _selectedYear,
      dropdownColor: AppTheme.surface,
      items: [2025, 2026, 2027].map((y) => DropdownMenuItem(value: y, child: Text('$y'))).toList(),
      onChanged: (v) {
        if (v != null) {
          setState(() => _selectedYear = v);
          _loadData();
        }
      },
    );
  }

  Widget _buildWorkingDaysField() {
    return SizedBox(
      width: 70,
      height: 38,
      child: TextField(
        keyboardType: TextInputType.number,
        textAlign: TextAlign.center,
        decoration: const InputDecoration(labelText: 'Days', contentPadding: EdgeInsets.all(4)),
        controller: TextEditingController(text: '$_workingDays'),
        onSubmitted: (v) {
          setState(() {
            _workingDays = int.tryParse(v) ?? 26;
            _loadData();
          });
        },
      ),
    );
  }

  void _confirmPay(PayrollItem item) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Confirm Salary Payment'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Employee: ${item.employee.name} (${item.employee.employeeId})'),
            const SizedBox(height: 8),
            Text('Gross Salary: ${CurrencyFormatter.format(item.grossSalary)}'),
            Text('Leave Days: ${item.leaveDays}'),
            Text('Total Deductions: ${CurrencyFormatter.format(item.totalDeductions)}'),
            const Divider(),
            Text('Net Salary: ${CurrencyFormatter.format(item.netSalary)}', style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primaryLight, fontSize: 16)),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              await context.read<PayrollService>().paySingleSalary(
                    employeeId: item.employee.id,
                    month: _selectedMonth,
                    year: _selectedYear,
                    leaveDays: item.leaveDays,
                    workingDays: _workingDays,
                  );
              _loadData();
            },
            child: const Text('Confirm & Pay'),
          ),
        ],
      ),
    );
  }
}
