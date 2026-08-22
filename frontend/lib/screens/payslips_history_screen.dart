import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/utils/currency_formatter.dart';
import '../services/payslip_service.dart';

class PayslipsHistoryScreen extends StatefulWidget {
  const PayslipsHistoryScreen({super.key});

  @override
  State<PayslipsHistoryScreen> createState() => _PayslipsHistoryScreenState();
}

class _PayslipsHistoryScreenState extends State<PayslipsHistoryScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<PayslipService>().fetchPayslips();
    });
  }

  @override
  Widget build(BuildContext context) {
    final psService = context.watch<PayslipService>();
    return Scaffold(
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Payslips Archives', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
            const SizedBox(height: 16),
            Expanded(
              child: ListView.builder(
                itemCount: psService.payslips.length,
                itemBuilder: (ctx, i) {
                  final ps = psService.payslips[i];
                  return Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      title: Text(ps.payslipNumber, style: const TextStyle(fontWeight: FontWeight.bold)),
                      subtitle: Text('${ps.employeeName} • ${ps.monthName} ${ps.year}'),
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
