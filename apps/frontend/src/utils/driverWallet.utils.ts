export const MIN_DRIVER_WALLET_BALANCE = 100_000;

/** Không cho bật nhận cuốc khi số dư chưa tải hoặc dưới ngưỡng Backend quy định. */
export function canDriverGoOnline(balance: number | null): boolean {
  return Number.isFinite(balance) && balance !== null && balance >= MIN_DRIVER_WALLET_BALANCE;
}

