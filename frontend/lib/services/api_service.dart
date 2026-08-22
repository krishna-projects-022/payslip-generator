import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  String? _token;

  Future<void> setToken(String token) async {
    _token = token;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('jwt_token', token);
  }

  Future<String?> getToken() async {
    if (_token != null) return _token;
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('jwt_token');
    return _token;
  }

  Future<void> clearToken() async {
    _token = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('jwt_token');
  }

  Map<String, String> _headers([bool isJson = true]) {
    final headers = <String, String>{};
    if (isJson) headers['Content-Type'] = 'application/json';
    if (_token != null) headers['Authorization'] = 'Bearer $_token';
    return headers;
  }

  Future<dynamic> get(String url) async {
    await getToken();
    final res = await http.get(Uri.parse(url), headers: _headers());
    return _handleResponse(res);
  }

  Future<dynamic> post(String url, Map<String, dynamic> body) async {
    await getToken();
    final res = await http.post(Uri.parse(url), headers: _headers(), body: jsonEncode(body));
    return _handleResponse(res);
  }

  Future<dynamic> put(String url, Map<String, dynamic> body) async {
    await getToken();
    final res = await http.put(Uri.parse(url), headers: _headers(), body: jsonEncode(body));
    return _handleResponse(res);
  }

  Future<dynamic> delete(String url) async {
    await getToken();
    final res = await http.delete(Uri.parse(url), headers: _headers());
    return _handleResponse(res);
  }

  dynamic _handleResponse(http.Response res) {
    final data = jsonDecode(res.body);
    if (res.statusCode >= 200 && res.statusCode < 300) {
      return data;
    } else {
      throw Exception(data['message'] ?? 'Request failed with code ${res.statusCode}');
    }
  }
}
