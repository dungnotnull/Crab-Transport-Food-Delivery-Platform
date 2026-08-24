interface SubmitTripRatingOptions {
  tripId: string;
  rating: number;
  feedback: string;
  rateTrip: (tripId: string, rating: number, feedback: string) => Promise<void>;
  onSuccess: () => void;
  onError: (error: unknown) => void;
}

/** Chỉ hoàn tất UI đánh giá sau khi Backend xác nhận đã lưu review. */
export async function submitTripRating({
  tripId,
  rating,
  feedback,
  rateTrip,
  onSuccess,
  onError,
}: SubmitTripRatingOptions): Promise<boolean> {
  try {
    await rateTrip(tripId, rating, feedback);
    onSuccess();
    return true;
  } catch (error) {
    onError(error);
    return false;
  }
}

/** Cập nhật điểm đánh giá trung bình real-time cho hồ sơ tài xế */
export function applyDriverRatingUpdate<T extends { average_rating?: number }>(
  currentProfile: T | null | undefined,
  newAverageRating: number,
): T | null {
  if (!Number.isFinite(newAverageRating) || newAverageRating < 1 || newAverageRating > 5) {
    return currentProfile ?? null;
  }
  return {
    ...((currentProfile || {}) as T),
    average_rating: Number(newAverageRating.toFixed(2)),
  };
}
