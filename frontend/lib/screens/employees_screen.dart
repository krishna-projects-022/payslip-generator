import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/utils/currency_formatter.dart';
import '../services/employee_service.dart';

class EmployeesScreen extends StatefulWidget {
  const EmployeesScreen({super.key});

  @override
  State<EmployeesScreen> createState() => _EmployeesScreenState();
}

class _EmployeesScreenState extends State<EmployeesScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<EmployeeService>().fetchEmployees();
    });
  }

  @override
  Widget build(BuildContext context) {
    final empService = context.watch<EmployeeService>();
    return Scaffold(
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Employee Directory', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
            const SizedBox(height: 16),
            Expanded(
              child: ListView.builder(
                itemCount: empService.employees.length,
                itemBuilder: (ctx, i) {
                  final emp = empService.employees[i];
                  return Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      title: Text(emp.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                      subtitle: Text('${emp.employeeId} • ${emp.designation} (${emp.department})'),
                      trailing: Text(CurrencyFormatter.format(emp.monthlyGrossSalary), style: const TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
