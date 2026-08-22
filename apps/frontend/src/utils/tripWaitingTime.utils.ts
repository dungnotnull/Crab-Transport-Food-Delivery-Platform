/** Tính thời gian chờ từ thời điểm tạo chuyến, dùng localStorage để chống clock skew và giữ giá trị khi reload. */
export function getTripSearchElapsedSeconds(
  createdAt: string | undefined,
  currentTimeMs = Date.now(),
): number {
  if (!createdAt) return 0;
  
  let clientStartMs = 0;
  const storageKey = `crab_trip_start_${createdAt}`;
  
  if (typeof localStorage !== 'undefined') {
    clientStartMs = parseInt(localStorage.getItem(storageKey) || '0', 10);
  }
  
  if (!clientStartMs) {
    const serverStartMs = Date.parse(createdAt);
    let elapsedMs = currentTimeMs - serverStartMs;
    
    // Nếu bị lệch thời gian (Server lớn hơn Client) hoặc quá cũ (vượt quá 1 ngày), reset bộ đếm về 0.
    if (!Number.isFinite(serverStartMs) || elapsedMs < 0 || elapsedMs > 86400000) {
      elapsedMs = 0;
    }
    
    clientStartMs = currentTimeMs - elapsedMs;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(storageKey, clientStartMs.toString());
    }
  }

  return Math.max(0, Math.floor((currentTimeMs - clientStartMs) / 1000));
}
