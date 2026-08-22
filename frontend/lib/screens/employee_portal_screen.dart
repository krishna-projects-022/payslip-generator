import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/utils/currency_formatter.dart';
import '../services/payslip_service.dart';
import '../models/payslip.dart';

class EmployeePortalScreen extends StatefulWidget {
  const EmployeePortalScreen({super.key});

  @override
  State<EmployeePortalScreen> createState() => _EmployeePortalScreenState();
}

class _EmployeePortalScreenState extends State<EmployeePortalScreen> {
  List<Payslip> _myPayslips = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final list = await context.read<PayslipService>().fetchMyPayslips();
    if (mounted) setState(() { _myPayslips = list; _loading = false; });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('My Salary & Payslips', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 16),
                  if (_myPayslips.isEmpty)
                    const Center(child: Text('No payslips available for your account yet.', style: TextStyle(color: Colors.grey)))
                  else
                    Expanded(
                      child: ListView.builder(
                        itemCount: _myPayslips.length,
                        itemBuilder: (ctx, i) {
                          final ps = _myPayslips[i];
                          return Card(
                            child: ListTile(
                              title: Text(ps.payslipNumber, style: const TextStyle(fontWeight: FontWeight.bold)),
                              subtitle: Text('Period: ${ps.monthName} ${ps.year}'),
                              trailing: Text(CurrencyFormatter.format(ps.netSalary), style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.greenAccent)),
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
