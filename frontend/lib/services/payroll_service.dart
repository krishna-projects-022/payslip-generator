import 'package:flutter/foundation.dart';
import '../core/constants/api_constants.dart';
import '../models/payroll_item.dart';
import '../models/settings.dart';
import 'api_service.dart';

class PayrollService extends ChangeNotifier {
  final ApiService _api = ApiService();
  List<PayrollItem> _items = [];
  Map<String, dynamic> _summary = {};
  Map<String, dynamic> _period = {};
  ApplicationSettings? _settings;
  bool _isLoading = false;

  List<PayrollItem> get items => _items;
  Map<String, dynamic> get summary => _summary;
  Map<String, dynamic> get period => _period;
  ApplicationSettings? get settings => _settings;
  bool get isLoading => _isLoading;

  Future<void> fetchPayrollForPeriod({
    required int month,
    required int year,
    int? workingDays,
    double? ptAmount,
  }) async {
    _isLoading = true;
    notifyListeners();

    try {
      String url = '${ApiConstants.payrollPeriod}/$month/$year';
      final params = <String>[];
      if (workingDays != null) params.add('workingDays=$workingDays');
      if (ptAmount != null) params.add('ptAmount=$ptAmount');
      if (params.isNotEmpty) url += '?' + params.join('&');

      final res = await _api.get(url);
      if (res['success'] == true) {
        _period = res['period'] ?? {};
        _summary = res['summary'] ?? {};
        if (res['settings'] != null) {
          _settings = ApplicationSettings.fromJson(res['settings']);
        }
        final rawItems = (res['items'] as List?) ?? [];
        _items = rawItems.map((j) => PayrollItem.fromJson(j)).toList();
      }
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<Map<String, dynamic>> paySingleSalary({
    required String employeeId,
    required int month,
    required int year,
    required double leaveDays,
    required int workingDays,
  }) async {
    final res = await _api.post(ApiConstants.payrollPay, {
      'employeeId': employeeId,
      'month': month,
      'year': year,
      'leaveDays': leaveDays,
      'workingDays': workingDays,
    });
    return res;
  }

  Future<Map<String, dynamic>> bulkPayAll({
    required int month,
    required int year,
    required int workingDays,
    required Map<String, double> leavesMap,
  }) async {
    final res = await _api.post(ApiConstants.payrollBulkPay, {
      'month': month,
      'year': year,
      'workingDays': workingDays,
      'leavesMap': leavesMap,
    });
    return res;
  }
}
