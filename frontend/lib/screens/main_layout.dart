import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/theme/app_theme.dart';
import '../services/auth_service.dart';
import 'salary_screen.dart';
import 'employees_screen.dart';
import 'payslips_history_screen.dart';
import 'employee_portal_screen.dart';

class MainLayout extends StatefulWidget {
  const MainLayout({super.key});

  @override
  State<MainLayout> createState() => _MainLayoutState();
}

class _MainLayoutState extends State<MainLayout> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthService>().currentUser;
    final isAdmin = user?.isAdmin ?? false;

    final List<Widget> pages = isAdmin
        ? [
            const SalaryScreen(),
            const EmployeesScreen(),
            const PayslipsHistoryScreen(),
          ]
        : [
            const EmployeePortalScreen(),
          ];

    return Scaffold(
      body: Row(
        children: [
          Container(
            width: 250,
            decoration: const BoxDecoration(
              color: AppTheme.surface,
              border: Border(right: BorderSide(color: AppTheme.border)),
            ),
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Row(
                    children: [
                      Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(colors: [AppTheme.primary, AppTheme.secondary]),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(Icons.bolt, color: Colors.white, size: 20),
                      ),
                      const SizedBox(width: 10),
                      const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('CUSTQ', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                          Text('PAYROLL', style: TextStyle(color: AppTheme.primary, fontSize: 10, fontWeight: FontWeight.w700)),
                        ],
                      ),
                    ],
                  ),
                ),
                const Divider(height: 1),
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 10),
                    children: isAdmin
                        ? [
                            _navItem(0, Icons.calculate_outlined, 'Salary & Payroll'),
                            _navItem(1, Icons.people_alt_outlined, 'Employees'),
                            _navItem(2, Icons.receipt_long_outlined, 'Payslips History'),
                          ]
                        : [
                            _navItem(0, Icons.account_balance_wallet_outlined, 'My Payslips'),
                          ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      CircleAvatar(
                        backgroundColor: AppTheme.primary,
                        radius: 16,
                        child: Text(
                          (user?.employee?['name'] ?? user?.email ?? 'A').substring(0, 1).toUpperCase(),
                          style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(user?.employee?['name'] ?? 'Admin', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold), overflow: TextOverflow.ellipsis),
                            Text(isAdmin ? 'Administrator' : 'Employee', style: const TextStyle(fontSize: 10, color: AppTheme.textMuted)),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.logout, size: 18, color: AppTheme.textMuted),
                        onPressed: () => context.read<AuthService>().logout(),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Expanded(child: pages[_currentIndex.clamp(0, pages.length - 1)]),
        ],
      ),
    );
  }

  Widget _navItem(int index, IconData icon, String label) {
    final active = _currentIndex == index;
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: ListTile(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        selected: active,
        selectedTileColor: AppTheme.primary.withOpacity(0.15),
        leading: Icon(icon, color: active ? AppTheme.primaryLight : AppTheme.textMuted, size: 20),
        title: Text(label, style: TextStyle(color: active ? Colors.white : AppTheme.textSecondary, fontWeight: active ? FontWeight.w700 : FontWeight.w500, fontSize: 13.5)),
        onTap: () => setState(() => _currentIndex = index),
      ),
    );
  }
}
