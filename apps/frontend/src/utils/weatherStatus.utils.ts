/** Chuẩn hóa trạng thái thời tiết và từ chối response thiếu contract thay vì mặc định sai. */
export function normalizeWeatherStatus(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Dữ liệu trạng thái thời tiết không hợp lệ');
  }

  const isExtremeWeather = (payload as Record<string, unknown>).isExtremeWeather;
  if (typeof isExtremeWeather !== 'boolean') {
    throw new Error('Dữ liệu trạng thái thời tiết không hợp lệ');
  }

  return isExtremeWeather;
}

