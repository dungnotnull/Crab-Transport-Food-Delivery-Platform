import React from 'react';
import { useTripStore } from '../../stores/tripStore';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { formatCurrency } from '../../utils/currency.utils';
import { TripStatus } from '../../types/trip.types';
import { Phone, MessageSquare, Star, UserRound } from 'lucide-react';
import { useToast } from '../common/Toast';

interface TripBottomSheetProps {
  onCancelTrip: () => void;
  onOpenRating: () => void;
}

export const TripBottomSheet: React.FC<TripBottomSheetProps> = ({ onCancelTrip, onOpenRating }) => {
  const { activeTrip } = useTripStore();
  const { showToast } = useToast();

  if (!activeTrip || activeTrip.status === 'FINDING_DRIVER') return null;

  const status = activeTrip.status;

  // Lấy text và trạng thái Stepper
  const getStatusInfo = (st: TripStatus) => {
    switch (st) {
      case 'ACCEPTED':
        return {
          title: 'Tài xế đang đến điểm đón',
          subtitle: 'Khoảng 3 phút nữa tài xế sẽ có mặt',
          badge: 'warning',
          step: 1,
        };
      case 'ARRIVED_AT_PICKUP':
        return {
          title: 'Tài xế đã đến điểm đón!',
          subtitle: 'Vui lòng di chuyển ra xe',
          badge: 'info',
          step: 2,
        };
      case 'IN_TRANSIT':
        return {
          title: 'Chuyến đi đang diễn ra',
          subtitle: 'Đang di chuyển đến điểm trả an toàn',
          badge: 'success',
          step: 3,
        };
      case 'ARRIVED_AT_DESTINATION':
        return {
          title: 'Đã đến nơi an toàn!',
          subtitle: 'Vui lòng kiểm tra hành lý trước khi rời xe',
          badge: 'info',
          step: 4,
        };
      case 'COMPLETED':
        return {
          title: 'Chuyến đi hoàn thành',
          subtitle: 'Cảm ơn bạn đã đồng hành cùng Crab',
          badge: 'success',
          step: 5,
        };
      default:
        return { title: 'Đang di chuyển', subtitle: '', badge: 'neutral', step: 1 };
    }
  };

  const info = getStatusInfo(status);

  return (
    <div className="w-full bg-white/95 backdrop-blur-md border border-slate-100 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom-5 duration-300">
      {/* Drag handle bar */}
      <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto -mt-2 mb-1"></div>

      {/* Trip Status Banner */}
      <div className="flex items-center justify-between">
        <div>
          <Badge variant={info.badge as any} size="md" className="mb-1">
            {info.title}
          </Badge>
          <p className="text-xs text-slate-500 font-medium">{info.subtitle}</p>
        </div>
        <span className="text-lg font-black text-[#00B14F]">
          {formatCurrency(activeTrip.total_fare)}
        </span>
      </div>

      {/* State Machine Stepper Progress Bar */}
      <div className="flex items-center gap-1.5 w-full my-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-[background-color] duration-500 ${
              s <= info.step ? 'bg-[#00B14F]' : 'bg-slate-200'
            }`}
          />
        ))}
      </div>

      {/* Driver Card Info */}
      <div className="flex items-center justify-between bg-slate-50 border border-slate-100 p-3.5 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="relative">
            {activeTrip.driver?.avatar_url ? (
              <img
                src={activeTrip.driver.avatar_url}
                alt={`Ảnh đại diện của ${activeTrip.driver.full_name || 'tài xế'}`}
                width={48}
                height={48}
                loading="lazy"
                className="w-12 h-12 rounded-full object-cover border-2 border-[#00B14F]"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-[#00B14F] border-2 border-emerald-200 flex items-center justify-center">
                <UserRound className="w-6 h-6" aria-hidden="true" />
              </div>
            )}
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-sm font-black text-slate-900">{activeTrip.driver?.full_name || 'Tài xế đang cập nhật'}</h4>
              {typeof activeTrip.driver?.driverProfile?.average_rating === 'number' && (
                <span className="text-xs font-bold text-amber-500 flex items-center gap-0.5">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                  {activeTrip.driver.driverProfile.average_rating.toFixed(1)}
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-slate-600">
              {activeTrip.driver?.driverProfile?.vehicle_brand || 'Hãng xe chưa cập nhật'} • <span className="font-extrabold text-slate-900 bg-slate-200/80 px-1.5 py-0.5 rounded">{activeTrip.driver?.driverProfile?.license_plate || 'Biển số chưa cập nhật'}</span>
            </p>
          </div>
        </div>

        {/* Quick Contact Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Gọi cho tài xế"
            onClick={() => showToast('Đang gọi điện cho tài xế...', 'info')}
            className="w-9 h-9 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-[#00B14F] flex items-center justify-center transition-colors"
          >
            <Phone className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Nhắn tin cho tài xế"
            onClick={() => showToast('Mở hộp thoại chat...', 'info')}
            className="w-9 h-9 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-600 flex items-center justify-center transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2 pt-1">
        {status === 'COMPLETED' ? (
          <Button size="lg" onClick={onOpenRating} className="w-full">
            ⭐ Đánh giá chuyến đi
          </Button>
        ) : (
          <div className="flex items-center justify-between gap-3">
            {/* Ghi chú lý do chặn hủy chuyến */}
            {(status === 'ARRIVED_AT_PICKUP' || status === 'IN_TRANSIT' || status === 'ARRIVED_AT_DESTINATION') ? (
              <span className="text-[11px] text-amber-700 font-semibold bg-amber-50 px-3 py-2 rounded-xl border border-amber-200 flex-1">
                🔒 Không thể hủy: {status === 'ARRIVED_AT_PICKUP' ? 'Tài xế đã có mặt tại điểm đón' : 'Chuyến đi đang diễn ra'}
              </span>
            ) : (
              <span className="text-[11px] text-slate-500 font-medium">
                Bạn có thể hủy chuyến trước khi tài xế đến điểm đón.
              </span>
            )}

            {/* Cancel Button */}
            <Button
              variant="danger"
              size="md"
              disabled={status === 'ARRIVED_AT_PICKUP' || status === 'IN_TRANSIT' || status === 'ARRIVED_AT_DESTINATION'}
              onClick={onCancelTrip}
              className="text-xs shrink-0"
            >
              Hủy chuyến
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
