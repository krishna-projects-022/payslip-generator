class Employee {
  final String id;
  final String employeeId;
  final String name;
  final String? profilePhoto;
  final String designation;
  final String department;
  final String? email;
  final String? phone;
  final String? dateOfJoining;
  final double monthlyGrossSalary;
  final String status;

  Employee({
    required this.id,
    required this.employeeId,
    required this.name,
    this.profilePhoto,
    required this.designation,
    required this.department,
    this.email,
    this.phone,
    this.dateOfJoining,
    required this.monthlyGrossSalary,
    required this.status,
  });

  factory Employee.fromJson(Map<String, dynamic> json) {
    return Employee(
      id: json['id'] ?? '',
      employeeId: json['employee_id'] ?? '',
      name: json['name'] ?? '',
      profilePhoto: json['profile_photo'],
      designation: json['designation'] ?? '',
      department: json['department'] ?? '',
      email: json['email'],
      phone: json['phone'],
      dateOfJoining: json['date_of_joining']?.toString(),
      monthlyGrossSalary: (json['monthly_gross_salary'] is num)
          ? (json['monthly_gross_salary'] as num).toDouble()
          : double.tryParse(json['monthly_gross_salary']?.toString() ?? '0') ?? 0.0,
      status: json['status'] ?? 'active',
    );
  }
}
