/**
 * Format số tiền sang định dạng Việt Nam Đồng (VND)
 * Ví dụ: 25000 -> "25.000 ₫"
 */
export function formatCurrency(amount?: number | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '0 ₫';
  }
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace('VND', '₫')
    .trim();
}
