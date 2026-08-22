import 'package:flutter/foundation.dart';
import '../core/constants/api_constants.dart';
import '../models/payslip.dart';
import 'api_service.dart';

class PayslipService extends ChangeNotifier {
  final ApiService _api = ApiService();
  List<Payslip> _payslips = [];
  bool _isLoading = false;

  List<Payslip> get payslips => _payslips;
  bool get isLoading => _isLoading;

  Future<void> fetchPayslips({int? month, int? year, String? search}) async {
    _isLoading = true;
    notifyListeners();
    try {
      String url = ApiConstants.payslips;
      final params = <String>[];
      if (month != null) params.add('month=$month');
      if (year != null) params.add('year=$year');
      if (search != null && search.isNotEmpty) params.add('search=${Uri.encodeComponent(search)}');
      if (params.isNotEmpty) url += '?' + params.join('&');

      final res = await _api.get(url);
      if (res['success'] == true) {
        final raw = (res['payslips'] as List?) ?? [];
        _payslips = raw.map((j) => Payslip.fromJson(j)).toList();
      }
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<List<Payslip>> fetchMyPayslips() async {
    _isLoading = true;
    notifyListeners();
    try {
      final res = await _api.get(ApiConstants.myPayslips);
      if (res['success'] == true) {
        final raw = (res['payslips'] as List?) ?? [];
        return raw.map((j) => Payslip.fromJson(j)).toList();
      }
      return [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
