import 'package:flutter/foundation.dart';
import '../core/constants/api_constants.dart';
import '../models/settings.dart';
import 'api_service.dart';

class SettingsService extends ChangeNotifier {
  final ApiService _api = ApiService();
  ApplicationSettings? _settings;
  bool _isLoading = false;

  ApplicationSettings? get settings => _settings;
  bool get isLoading => _isLoading;

  Future<void> fetchSettings() async {
    _isLoading = true;
    notifyListeners();
    try {
      final res = await _api.get(ApiConstants.settings);
      if (res['success'] == true && res['settings'] != null) {
        _settings = ApplicationSettings.fromJson(res['settings']);
      }
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> updateSettings(Map<String, dynamic> data) async {
    final res = await _api.put(ApiConstants.settings, data);
    if (res['success'] == true && res['settings'] != null) {
      _settings = ApplicationSettings.fromJson(res['settings']);
      notifyListeners();
    }
  }
}
