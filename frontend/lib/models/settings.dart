class ApplicationSettings {
  final String id;
  final String companyName;
  final String companyAddress;
  final String? companyLogo;
  final String? signatureImage;
  final double ptAmount;
  final double basicPercentage;
  final double pfPercentage;
  final int defaultWorkingDays;
  final String currency;
  final String currencySymbol;
  final String payslipPrefix;

  ApplicationSettings({
    required this.id,
    required this.companyName,
    required this.companyAddress,
    this.companyLogo,
    this.signatureImage,
    required this.ptAmount,
    required this.basicPercentage,
    required this.pfPercentage,
    required this.defaultWorkingDays,
    required this.currency,
    required this.currencySymbol,
    required this.payslipPrefix,
  });

  factory ApplicationSettings.fromJson(Map<String, dynamic> json) {
    return ApplicationSettings(
      id: json['id'] ?? '',
      companyName: json['company_name'] ?? 'CUSTQ Software Services Pvt. Ltd.',
      companyAddress: json['company_address'] ?? '',
      companyLogo: json['company_logo'],
      signatureImage: json['signature_image'],
      ptAmount: (json['pt_amount'] is num) ? (json['pt_amount'] as num).toDouble() : 200.0,
      basicPercentage: (json['basic_percentage'] is num) ? (json['basic_percentage'] as num).toDouble() : 50.0,
      pfPercentage: (json['pf_percentage'] is num) ? (json['pf_percentage'] as num).toDouble() : 12.0,
      defaultWorkingDays: (json['default_working_days'] is num) ? (json['default_working_days'] as num).toInt() : 26,
      currency: json['currency'] ?? 'INR',
      currencySymbol: json['currency_symbol'] ?? '₹',
      payslipPrefix: json['payslip_prefix'] ?? 'CUSTQ-PS-',
    );
  }
}
