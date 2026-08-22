import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/theme/app_theme.dart';
import 'services/auth_service.dart';
import 'services/payroll_service.dart';
import 'services/employee_service.dart';
import 'services/payslip_service.dart';
import 'services/settings_service.dart';
import 'screens/login_screen.dart';
import 'screens/main_layout.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthService()),
        ChangeNotifierProvider(create: (_) => PayrollService()),
        ChangeNotifierProvider(create: (_) => EmployeeService()),
        ChangeNotifierProvider(create: (_) => PayslipService()),
        ChangeNotifierProvider(create: (_) => SettingsService()),
      ],
      child: const CustqPayslipApp(),
    ),
  );
}

class CustqPayslipApp extends StatelessWidget {
  const CustqPayslipApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'CUSTQ Payslip Generator',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      home: Consumer<AuthService>(
        builder: (context, auth, _) {
          return auth.isAuthenticated ? const MainLayout() : const LoginScreen();
        },
      ),
    );
  }
}
