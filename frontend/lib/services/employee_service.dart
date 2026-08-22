import 'package:flutter/foundation.dart';
import '../core/constants/api_constants.dart';
import '../models/employee.dart';
import 'api_service.dart';

class EmployeeService extends ChangeNotifier {
  final ApiService _api = ApiService();
  List<Employee> _employees = [];
  bool _isLoading = false;

  List<Employee> get employees => _employees;
  bool get isLoading => _isLoading;

  Future<void> fetchEmployees({String? search, String? department, String? status}) async {
    _isLoading = true;
    notifyListeners();
    try {
      String url = ApiConstants.employees;
      final params = <String>[];
      if (search != null && search.isNotEmpty) params.add('search=${Uri.encodeComponent(search)}');
      if (department != null && department != 'All') params.add('department=${Uri.encodeComponent(department)}');
      if (status != null && status != 'All') params.add('status=${Uri.encodeComponent(status)}');
      if (params.isNotEmpty) url += '?' + params.join('&');

      final res = await _api.get(url);
      if (res['success'] == true) {
        final raw = (res['employees'] as List?) ?? [];
        _employees = raw.map((j) => Employee.fromJson(j)).toList();
      }
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<Employee> addEmployee(Map<String, dynamic> data) async {
    final res = await _api.post(ApiConstants.employees, data);
    final emp = Employee.fromJson(res['employee']);
    _employees.add(emp);
    notifyListeners();
    return emp;
  }

  Future<void> updateEmployee(String id, Map<String, dynamic> data) async {
    final res = await _api.put('${ApiConstants.employees}/$id', data);
    final updated = Employee.fromJson(res['employee']);
    final index = _employees.indexWhere((e) => e.id == id);
    if (index != -1) {
      _employees[index] = updated;
      notifyListeners();
    }
  }

  Future<void> deleteEmployee(String id) async {
    await _api.delete('${ApiConstants.employees}/$id');
    _employees.removeWhere((e) => e.id == id);
    notifyListeners();
  }
}
