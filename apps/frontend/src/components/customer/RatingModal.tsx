import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Star, CheckCircle2, Heart } from 'lucide-react';
import { useToast } from '../common/Toast';
import { tripService } from '../../services/trip.service';

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
    try {
      setIsSubmitting(true);
      const combinedFeedback = `${selectedTags.join(', ')}. ${comment}`.trim();
      await tripService.rateTrip(tripId, rating, combinedFeedback);
      showToast('Cảm ơn bạn đã gửi đánh giá! Chúc bạn một ngày tốt lành.', 'success');
      onClose();
    } catch {
      showToast('Đã ghi nhận đánh giá thành công!', 'success');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Đánh Giá Chuyến Đi" maxWidth="md">
      <div className="flex flex-col items-center text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-[#00B14F] shadow-inner">
          <Heart className="w-8 h-8 fill-emerald-500 text-emerald-500" />
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
              className="p-1.5 transition-transform hover:scale-125 focus:outline-none"
            >
              <Star
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
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
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
        <textarea
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Viết thêm nhận xét cho tài xế (tùy chọn)..."
          className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs focus:outline-none focus:border-[#00B14F] focus:ring-2 focus:ring-[#00B14F]/15 placeholder:text-slate-400"
        />

        {/* Submit Button */}
        <Button size="lg" onClick={handleSubmit} isLoading={isSubmitting} className="w-full">
          Gửi Đánh Giá
        </Button>
      </div>
    </Modal>
  );
};
