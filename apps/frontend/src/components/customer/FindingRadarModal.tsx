import React, { useEffect, useState } from 'react';
import { useTripStore } from '../../stores/tripStore';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { formatCurrency } from '../../utils/currency.utils';
import { X, ShieldCheck, MapPin, Radio } from 'lucide-react';
import { useToast } from '../common/Toast';

interface FindingRadarModalProps {
  onCancel: () => void;
  onDriverFoundMock?: () => void;
}

export const FindingRadarModal: React.FC<FindingRadarModalProps> = ({
  onCancel,
  onDriverFoundMock,
}) => {
  const { pickup, dropoff, serviceType, activeTrip, setTripStatus, setDriverLocation } = useTripStore();
  const { showToast } = useToast();
  const [searchSeconds, setSearchSeconds] = useState(0);

  // Đếm thời gian tìm kiếm
  useEffect(() => {
    const timer = setInterval(() => {
      setSearchSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Tự động giả lập có tài xế nhận cuốc sau 5s nếu test
  useEffect(() => {
    const autoMockTimer = setTimeout(() => {
      if (onDriverFoundMock) {
        onDriverFoundMock();
      } else {
        // Tự động chuyển sang ACCEPTED
        setTripStatus('ACCEPTED');
        setDriverLocation({
          lat: pickup.lat + 0.003,
          lng: pickup.lng + 0.003,
          heading: 210,
        });
        showToast('🎉 Đã tìm thấy tài xế! Tài xế đang di chuyển đến điểm đón.', 'success');
      }
    }, 6000);

    return () => clearTimeout(autoMockTimer);
  }, [onDriverFoundMock, pickup, setDriverLocation, setTripStatus, showToast]);

  const mins = Math.floor(searchSeconds / 60);
  const secs = searchSeconds % 60;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 flex flex-col items-center text-center">
        {/* Pulsing Radar Animation Container */}
        <div className="relative w-44 h-44 flex items-center justify-center my-4">
          <div className="radar-ring w-44 h-44"></div>
          <div className="radar-ring radar-ring-2 w-44 h-44"></div>
          <div className="radar-ring radar-ring-3 w-44 h-44"></div>

          {/* Central Pulsing Icon */}
          <div className="relative z-10 w-20 h-20 rounded-full bg-[#00B14F] text-white flex items-center justify-center shadow-xl shadow-[#00B14F]/40 border-4 border-white">
            <span className="text-3xl">{serviceType === 'BIKE' ? '🛵' : '🚗'}</span>
          </div>
        </div>

        {/* Status Headings */}
        <Badge variant="success" size="md" className="mb-2">
          <Radio className="w-3.5 h-3.5 animate-pulse text-[#00B14F]" />
          Đang quét tìm tài xế gần nhất trong bán kính 3km
        </Badge>
        <h3 className="text-xl font-black text-slate-900 tracking-tight">
          Đang Tìm {serviceType === 'BIKE' ? 'CrabBike (Xe Máy)' : serviceType === 'CAR_7' ? 'CrabCar 7 Chỗ' : 'CrabCar 4 Chỗ'}...
        </h3>
        <p className="text-xs text-slate-500 font-medium mt-1">
          Thời gian tìm kiếm:{' '}
          <span className="font-bold text-slate-800">
            {mins > 0 ? `${mins}m ` : ''}
            {secs}s
          </span>
        </p>

        {/* Route Summary Box */}
        <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-3.5 my-4 text-left flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 truncate">
            <MapPin className="w-3.5 h-3.5 text-[#00B14F] shrink-0" />
            <span className="truncate">Điểm đón: {pickup.address || 'Tòa nhà Halo Building'}</span>
          </div>
          {dropoff && (
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 truncate">
              <MapPin className="w-3.5 h-3.5 text-[#EF4444] shrink-0" />
              <span className="truncate">Điểm đến: {dropoff.address}</span>
            </div>
          )}
          <div className="pt-2 border-t border-slate-200/70 flex justify-between items-center text-xs">
            <span className="text-slate-500 font-medium">Giá cước dự tính:</span>
            <span className="font-extrabold text-[#00B14F]">
              {formatCurrency(activeTrip?.total_fare || 25000)}
            </span>
          </div>
        </div>

        {/* Cancel Button */}
        <Button
          variant="secondary"
          onClick={onCancel}
          className="w-full text-sm font-bold text-red-600 hover:bg-red-50 hover:text-red-700"
          leftIcon={<X className="w-4 h-4" />}
        >
          Hủy tìm kiếm
        </Button>
      </div>
    </div>
  );
};
