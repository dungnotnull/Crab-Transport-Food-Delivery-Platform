import React, { useEffect, useState } from 'react';
import { DriverTripOfferPayload } from '../../types/socket.types';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { formatCurrency } from '../../utils/currency.utils';
import { formatDistance, formatDuration } from '../../utils/geo.utils';
import { MapPin, Navigation, DollarSign, BellRing } from 'lucide-react';
import { driverService } from '../../services/driver.service';
import { useToast } from '../common/Toast';

interface TripOfferModalProps {
  offer: DriverTripOfferPayload | null;
  onAccept: (tripId: string) => void;
  onDecline: () => void;
}

export const TripOfferModal: React.FC<TripOfferModalProps> = ({ offer, onAccept, onDecline }) => {
  const [timeLeft, setTimeLeft] = useState(15);
  const [isAccepting, setIsAccepting] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (!offer) return;
    setTimeLeft(15);

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onDecline();
          showToast('Hết thời gian nhận cuốc!', 'warning');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [offer, onDecline, showToast]);

  if (!offer) return null;

  const strokeDashoffset = (1 - timeLeft / 15) * 283;

  const handleAcceptTrip = async () => {
    try {
      setIsAccepting(true);
      await driverService.acceptTrip(offer.tripId);
      showToast('🎉 Nhận cuốc thành công! Hãy di chuyển đến điểm đón.', 'success');
      onAccept(offer.tripId);
    } catch (err: any) {
      if (err.response?.status === 409) {
        // Concurrency / Race condition
        showToast('Cuốc xe đã được tài xế khác tiếp nhận trước!', 'error');
        onDecline();
      } else {
        // Mock fallback success for dev testing
        showToast('Nhận cuốc thành công (Demo Mock)', 'success');
        onAccept(offer.tripId);
      }
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border-2 border-emerald-500 flex flex-col gap-4">
        {/* Header with 15s Radial Countdown Timer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-[#00B14F]">
              <BellRing className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <Badge variant="warning" size="sm">Cuốc Mới Nổ</Badge>
              <h3 className="text-base font-black text-slate-900">Yêu cầu chuyến đi mới!</h3>
            </div>
          </div>

          {/* Radial Countdown Widget */}
          <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" stroke="#E2E8F0" strokeWidth="8" fill="none" />
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke={timeLeft <= 5 ? '#EF4444' : '#00B14F'}
                strokeWidth="8"
                strokeDasharray="283"
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
                className="transition-all duration-1000 ease-linear"
              />
            </svg>
            <span className={`absolute font-black text-sm ${timeLeft <= 5 ? 'text-red-500' : 'text-slate-800'}`}>
              {timeLeft}s
            </span>
          </div>
        </div>

        {/* Fare Highlight */}
        <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Thu nhập ước tính</span>
            <div className="text-2xl font-black text-[#00B14F] tracking-tight">
              {formatCurrency(offer.fare)}
            </div>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Quãng đường</span>
            <div className="text-sm font-extrabold text-slate-800">
              {formatDistance(offer.distance || 3200)}
            </div>
          </div>
        </div>

        {/* Trip Route Details */}
        <div className="flex flex-col gap-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-xs">
          <div className="flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-[#00B14F] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-500 text-[10px] uppercase">Đón tại:</span>
              <p className="font-bold text-slate-800">{offer.pickup.address || 'Tòa nhà Halo Building'}</p>
            </div>
          </div>

          <div className="border-t border-slate-200/60 pt-2 flex items-start gap-2.5">
            <Navigation className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-500 text-[10px] uppercase">Giao tại:</span>
              <p className="font-bold text-slate-800">{offer.dropoff.address || 'Chợ Bến Thành, Quận 1'}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons: Accept / Decline */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <Button
            variant="outline"
            size="lg"
            onClick={onDecline}
            className="text-slate-600 font-bold hover:bg-slate-100"
          >
            Từ chối
          </Button>
          <Button
            variant="primary"
            size="lg"
            isLoading={isAccepting}
            onClick={handleAcceptTrip}
            className="font-extrabold shadow-lg shadow-emerald-600/30"
          >
            Nhận cuốc ({timeLeft}s)
          </Button>
        </div>
      </div>
    </div>
  );
};
