import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Star, Heart } from 'lucide-react';
import { useToast } from '../common/Toast';
import { tripService } from '../../services/trip.service';
import { getApiErrorMessage } from '../../services/auth.helpers';
import { submitTripRating } from '../../utils/ratingSubmission.utils';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
}

const FEEDBACK_TAGS = [
  'Lái xe an toàn',
  'Thân thiện, lịch sự',
  'Xe sạch sẽ, thơm',
  'Đúng giờ',
  'Tuân thủ luật giao thông',
  'Nhiệt tình hỗ trợ',
];

export const RatingModal: React.FC<RatingModalProps> = ({ isOpen, onClose, tripId }) => {
  const [rating, setRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState<string[]>(['Lái xe an toàn', 'Thân thiện, lịch sự']);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    const combinedFeedback = [selectedTags.join(', '), comment.trim()]
      .filter(Boolean)
      .join('. ');

    await submitTripRating({
      tripId,
      rating,
      feedback: combinedFeedback,
      rateTrip: tripService.rateTrip,
      onSuccess: () => {
        showToast('Cảm ơn bạn đã gửi đánh giá! Chúc bạn một ngày tốt lành.', 'success');
        onClose();
      },
      onError: (error) => {
        showToast(getApiErrorMessage(error, 'Chưa thể gửi đánh giá. Vui lòng thử lại.'), 'error');
      },
    });
    setIsSubmitting(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Đánh Giá Chuyến Đi" maxWidth="md">
      <div className="flex flex-col items-center text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-[#00B14F] shadow-inner">
          <Heart className="w-8 h-8 fill-emerald-500 text-emerald-500" aria-hidden="true" />
        </div>

        <div>
          <h4 className="text-lg font-black text-slate-900">Bạn thấy chuyến đi thế nào?</h4>
          <p className="text-xs text-slate-500 mt-0.5">Đánh giá của bạn giúp cải thiện chất lượng phục vụ của Crab</p>
        </div>

        {/* 5-Star Interactive Rating */}
        <div className="flex items-center gap-2 my-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              aria-label={`${star} sao`}
              aria-pressed={rating === star}
              className="min-h-11 min-w-11 rounded-xl p-1.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 motion-reduce:transform-none"
            >
              <Star
                aria-hidden="true"
                className={`w-9 h-9 ${
                  star <= rating
                    ? 'fill-amber-400 text-amber-400 drop-shadow-sm'
                    : 'text-slate-200'
                }`}
              />
            </button>
          ))}
        </div>

        {/* Feedback Tag Chips */}
        <div className="flex flex-wrap justify-center gap-1.5 w-full">
          {FEEDBACK_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => handleToggleTag(tag)}
              aria-pressed={selectedTags.includes(tag)}
              className={`min-h-11 rounded-full border px-3 text-xs font-semibold transition-[background-color,border-color,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
                selectedTags.includes(tag)
                  ? 'bg-emerald-50 text-[#00B14F] border-[#00B14F]'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Comment textarea */}
        <label htmlFor="rating-comment" className="sr-only">Nhận xét cho tài xế</label>
        <textarea
          id="rating-comment"
          name="rating-comment"
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Viết thêm nhận xét cho tài xế (tùy chọn)…"
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:border-[#00B14F] focus-visible:ring-2 focus-visible:ring-[#00B14F]/15"
        />

        {/* Submit Button */}
        <Button size="lg" onClick={handleSubmit} isLoading={isSubmitting} className="w-full">
          Gửi Đánh Giá
        </Button>
      </div>
    </Modal>
  );
};
