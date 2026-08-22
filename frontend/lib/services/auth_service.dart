import 'package:flutter/foundation.dart';
import '../core/constants/api_constants.dart';
import '../models/user.dart';
import 'api_service.dart';

class AuthService extends ChangeNotifier {
  final ApiService _api = ApiService();
  User? _currentUser;
  bool _isLoading = false;

  User? get currentUser => _currentUser;
  bool get isAuthenticated => _currentUser != null;
  bool get isLoading => _isLoading;

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    notifyListeners();
    try {
      final res = await _api.post(ApiConstants.login, {
        'email': email.trim(),
        'password': password,
      });

      if (res['success'] == true) {
        await _api.setToken(res['token']);
        _currentUser = User.fromJson(res['user']);
        _isLoading = false;
        notifyListeners();
        return true;
      }
      _isLoading = false;
      notifyListeners();
      return false;
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  Future<void> logout() async {
    await _api.clearToken();
    _currentUser = null;
    notifyListeners();
  }
}
