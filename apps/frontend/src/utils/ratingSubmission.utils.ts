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

