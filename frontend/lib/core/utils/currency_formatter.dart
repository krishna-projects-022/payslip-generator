import 'package:intl/intl.dart';

class CurrencyFormatter {
  static final NumberFormat _inrFormat = NumberFormat.currency(
    locale: 'en_IN',
    symbol: '₹',
    decimalDigits: 2,
  );

  static String format(dynamic amount) {
    if (amount == null) return '₹0.00';
    final num val = num.tryParse(amount.toString()) ?? 0;
    return _inrFormat.format(val);
  }

  static String formatPlain(dynamic amount) {
    if (amount == null) return '0.00';
    final num val = num.tryParse(amount.toString()) ?? 0;
    return val.toStringAsFixed(2);
  }
}
