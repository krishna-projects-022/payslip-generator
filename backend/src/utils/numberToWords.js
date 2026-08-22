const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function convertTwoDigits(n) {
  if (n < 20) return ones[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return tens[t] + (o ? '-' + ones[o] : '');
}

function convertThreeDigits(n) {
  const h = Math.floor(n / 100);
  const rem = n % 100;
  let res = '';
  if (h > 0) {
    res += ones[h] + ' Hundred';
    if (rem > 0) res += ' ';
  }
  if (rem > 0) {
    res += convertTwoDigits(rem);
  }
  return res;
}

function numberToIndianWords(amount) {
  if (amount === 0 || isNaN(amount)) return 'Zero Rupees Only';

  const num = Math.abs(Number(amount));
  const integerPart = Math.floor(num);
  const paise = Math.round((num - integerPart) * 100);

  let crore = Math.floor(integerPart / 10000000);
  let lakh = Math.floor((integerPart % 10000000) / 100000);
  let thousand = Math.floor((integerPart % 100000) / 1000);
  let remainder = integerPart % 1000;

  let words = '';

  if (crore > 0) {
    words += convertTwoDigits(crore) + ' Crore ';
  }
  if (lakh > 0) {
    words += convertTwoDigits(lakh) + ' Lakh ';
  }
  if (thousand > 0) {
    words += convertTwoDigits(thousand) + ' Thousand ';
  }
  if (remainder > 0) {
    words += convertThreeDigits(remainder);
  }

  words = words.trim();
  if (!words) words = 'Zero';

  let result = words + ' Rupees';
  if (paise > 0) {
    result += ' and ' + convertTwoDigits(paise) + ' Paise';
  }
  result += ' Only';

  return result;
}

module.exports = { numberToIndianWords };
