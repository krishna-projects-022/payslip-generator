class User {
  final String id;
  final String email;
  final String role;
  final String? employeeId;
  final Map<String, dynamic>? employee;

  User({
    required this.id,
    required this.email,
    required this.role,
    this.employeeId,
    this.employee,
  });

  bool get isAdmin => role == 'admin';
  bool get isEmployee => role == 'employee';

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] ?? '',
      email: json['email'] ?? '',
      role: json['role'] ?? 'employee',
      employeeId: json['employee_id'],
      employee: json['employee'] is Map<String, dynamic> ? json['employee'] : null,
    );
  }
}
