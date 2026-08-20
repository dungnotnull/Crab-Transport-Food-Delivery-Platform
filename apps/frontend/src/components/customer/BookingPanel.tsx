import React, { useEffect, useState } from 'react';
import { useTripStore } from '../../stores/tripStore';
import { tripService } from '../../services/trip.service';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { formatCurrency } from '../../utils/currency.utils';
import { formatDistance, formatDuration, POPULAR_DESTINATIONS } from '../../utils/geo.utils';
import { ServiceType, PaymentMethod, LocationPoint } from '../../types/trip.types';
import { MapPin, Navigation, Car, CreditCard, Banknote, Sparkles, Clock, Compass, Users } from 'lucide-react';
import { useToast } from '../common/Toast';

interface BookingPanelProps {
  onStartFindingDriver: () => void;
}

export const BookingPanel: React.FC<BookingPanelProps> = ({ onStartFindingDriver }) => {
  const {
    pickup,
    dropoff,
    serviceType,
    routePreview,
    isLoadingRoute,
    setPickup,
    setDropoff,
    setServiceType,
    setRoutePreview,
    setIsLoadingRoute,
    setActiveTrip,
    setIsSearchingDriver,
  } = useTripStore();

  const { showToast } = useToast();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [couponCode, setCouponCode] = useState('WELCOME10K');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocatingGPS, setIsLocatingGPS] = useState(false);

  // Tự động lấy định vị GPS thực tế của thiết bị người dùng khi khởi động
  useEffect(() => {
    if (navigator.geolocation) {
      setIsLocatingGPS(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPickup({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            address: '📍 Vị trí GPS hiện tại của tôi',
          });
          setIsLocatingGPS(false);
        },
        () => {
          setIsLocatingGPS(false);
          // Fallback về trung tâm TP.HCM nếu bị từ chối quyền
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, [setPickup]);

  // Tính toán OSRM Preview khi có đủ Pickup, Dropoff và loại xe
  useEffect(() => {
    if (pickup && dropoff) {
      let isMounted = true;
      setIsLoadingRoute(true);

      tripService
        .previewTrip(pickup, dropoff, serviceType, couponCode)
        .then((data) => {
          if (isMounted) {
            setRoutePreview(data);
          }
        })
        .catch((err) => {
          console.error('Lỗi tính đường OSRM:', err);
        })
        .finally(() => {
          if (isMounted) setIsLoadingRoute(false);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [pickup, dropoff, serviceType, couponCode, setIsLoadingRoute, setRoutePreview]);

  // Nút chủ động làm mới GPS
  const handleRefreshCurrentGPS = () => {
    if (navigator.geolocation) {
      setIsLocatingGPS(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPickup({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            address: '📍 Vị trí GPS hiện tại của tôi',
          });
          setIsLocatingGPS(false);
          showToast('Đã định vị thành công vị trí GPS của bạn!', 'success');
        },
        () => {
          setIsLocatingGPS(false);
          showToast('Không thể lấy quyền truy cập GPS, vui lòng kiểm tra quyền trình duyệt', 'warning');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  // Chọn điểm đến gợi ý
  const handleSelectPopularDropoff = (destination: LocationPoint) => {
    setDropoff(destination);
  };

  // Tính giá ước tính cho Xe máy, 4 chỗ vs 7 chỗ
  const getCalculatedFare = (type: ServiceType) => {
    if (!routePreview) return 0;
    const base = routePreview.fare;
    if (type === 'BIKE') {
      return Math.round((base * 0.55) / 1000) * 1000;
    }
    if (type === 'CAR_7') {
      return Math.round((base * 1.35) / 1000) * 1000;
    }
    return base;
  };

  // Thực hiện Đặt xe Crab
  const handleBookTrip = async () => {
    if (!dropoff) {
      showToast('Vui lòng chọn điểm đến trên bản đồ hoặc danh sách gợi ý!', 'warning');
      return;
    }

    try {
      setIsSubmitting(true);
      const trip = await tripService.bookTrip({
        pickup,
        dropoff,
        vehicleType: serviceType,
        coupon_code: couponCode,
        paymentMethod,
      });

      setActiveTrip(trip);
      setIsSearchingDriver(true);
      onStartFindingDriver();
      const serviceName =
        serviceType === 'BIKE'
          ? 'CrabBike (Xe Máy)'
          : serviceType === 'CAR_7'
          ? 'CrabCar 7 Chỗ'
          : 'CrabCar 4 Chỗ';
      showToast(`Đã tạo yêu cầu đặt ${serviceName}! Đang quét tài xế gần nhất...`, 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Không thể đặt chuyến, vui lòng thử lại', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-4 bg-white/95 backdrop-blur-md p-5 rounded-3xl border border-slate-100 shadow-xl">
      {/* Header Panel */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>🛵 Đặt Xe Di Chuyển Crab</span>
            <Badge variant="success" size="sm">Trực Tuyến</Badge>
          </h2>
          <p className="text-xs text-slate-500 font-medium">Xe máy CrabBike & Ô tô CrabCar 4-7 chỗ</p>
        </div>
      </div>

      {/* Pickup & Dropoff Inputs */}
      <div className="flex flex-col gap-2.5 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100">
        {/* Điểm đón (Pickup) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00B14F] inline-block animate-pulse"></span>
              Điểm đón (Vị trí hiện tại)
            </span>
            <button
              onClick={handleRefreshCurrentGPS}
              disabled={isLocatingGPS}
              className="text-[11px] font-bold text-[#00B14F] hover:bg-emerald-100 bg-emerald-50 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
            >
              <Compass className={`w-3.5 h-3.5 ${isLocatingGPS ? 'animate-spin' : ''}`} />
              <span>{isLocatingGPS ? 'Đang định vị...' : 'Định vị lại GPS'}</span>
            </button>
          </div>
          <div className="text-xs font-semibold text-slate-800 bg-white p-2.5 rounded-xl border border-slate-200 truncate flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#00B14F] shrink-0" />
            <span className="truncate">{pickup.address || `${pickup.lat.toFixed(5)}, ${pickup.lng.toFixed(5)}`}</span>
          </div>
        </div>

        {/* Điểm đến (Dropoff) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] inline-block"></span>
              Điểm đến
            </span>
            <span className="text-[11px] text-slate-400">Click trên bản đồ hoặc chọn gợi ý</span>
          </div>
          <div className="text-xs font-semibold text-slate-800 bg-white p-2.5 rounded-xl border border-slate-200 truncate flex items-center gap-2">
            <Navigation className="w-4 h-4 text-[#EF4444] shrink-0" />
            <span className="truncate text-slate-700">
              {dropoff ? dropoff.address || `${dropoff.lat.toFixed(5)}, ${dropoff.lng.toFixed(5)}` : 'Chưa chọn điểm đến (Hãy click bản đồ hoặc chọn bên dưới)'}
            </span>
          </div>
        </div>

        {/* Quick Popular Dropoff Chips */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {POPULAR_DESTINATIONS.map((dest, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectPopularDropoff(dest)}
              className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-all ${
                dropoff?.address === dest.address
                  ? 'bg-[#00B14F] text-white border-[#00B14F] font-bold shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {dest.address?.split(',')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* OSRM Route Info Preview */}
      {routePreview && (
        <div className="flex items-center justify-between bg-emerald-50/80 border border-emerald-200/80 p-3 rounded-2xl animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#00B14F]" />
            <span className="text-xs font-bold text-emerald-950">
              {formatDuration(routePreview.duration)} ({formatDistance(routePreview.distance)})
            </span>
          </div>
          <Badge variant="success" size="sm">Đường Xanh Grab</Badge>
        </div>
      )}

      {/* Vehicle Type Selector: XE MÁY, 4 CHỖ & 7 CHỖ */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Chọn loại phương tiện
        </label>
        <div className="grid grid-cols-3 gap-2">
          {/* CrabBike (Xe Máy) */}
          <button
            type="button"
            onClick={() => setServiceType('BIKE')}
            className={`p-2.5 rounded-2xl border-2 flex flex-col items-center justify-between text-center transition-all ${
              serviceType === 'BIKE'
                ? 'border-[#00B14F] bg-emerald-50/80 shadow-md shadow-[#00B14F]/15 ring-2 ring-emerald-500/20'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-lg mb-1">
              🛵
            </div>
            <div className="text-xs font-black text-slate-900">CrabBike</div>
            <span className="text-[10px] text-slate-500">Xe máy 1 người</span>
            <span className="text-xs font-black text-[#00B14F] mt-1">
              {routePreview ? formatCurrency(getCalculatedFare('BIKE')) : '15.000 ₫'}
            </span>
          </button>

          {/* CrabCar 4 Chỗ */}
          <button
            type="button"
            onClick={() => setServiceType('CAR_4')}
            className={`p-2.5 rounded-2xl border-2 flex flex-col items-center justify-between text-center transition-all ${
              serviceType === 'CAR_4'
                ? 'border-[#00B14F] bg-emerald-50/80 shadow-md shadow-[#00B14F]/15 ring-2 ring-emerald-500/20'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-lg mb-1">
              🚗
            </div>
            <div className="text-xs font-black text-slate-900">CrabCar 4C</div>
            <span className="text-[10px] text-slate-500">Sedan 4 chỗ</span>
            <span className="text-xs font-black text-[#00B14F] mt-1">
              {routePreview ? formatCurrency(getCalculatedFare('CAR_4')) : '28.000 ₫'}
            </span>
          </button>

          {/* CrabCar 7 Chỗ */}
          <button
            type="button"
            onClick={() => setServiceType('CAR_7')}
            className={`p-2.5 rounded-2xl border-2 flex flex-col items-center justify-between text-center transition-all ${
              serviceType === 'CAR_7'
                ? 'border-blue-600 bg-blue-50/80 shadow-md shadow-blue-600/15 ring-2 ring-blue-500/20'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-lg mb-1">
              🚙
            </div>
            <div className="text-xs font-black text-slate-900">CrabCar 7C</div>
            <span className="text-[10px] text-slate-500">SUV/MPV 7 chỗ</span>
            <span className="text-xs font-black text-blue-600 mt-1">
              {routePreview ? formatCurrency(getCalculatedFare('CAR_7')) : '38.000 ₫'}
            </span>
          </button>
        </div>
      </div>

      {/* Payment Method & Coupon */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPaymentMethod('CASH')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              paymentMethod === 'CASH'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Banknote className="w-3.5 h-3.5 text-emerald-400" />
            Tiền mặt
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod('CREDIT_CARD')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              paymentMethod === 'CREDIT_CARD'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-blue-400" />
            Thẻ
          </button>
        </div>

        <div className="flex items-center gap-1 text-xs font-bold text-[#00B14F] bg-emerald-50 px-2.5 py-1 rounded-xl">
          <Sparkles className="w-3.5 h-3.5" />
          Giảm 10k
        </div>
      </div>

      {/* Book Action Button */}
      <Button
        size="lg"
        onClick={handleBookTrip}
        isLoading={isSubmitting || isLoadingRoute}
        disabled={!dropoff}
        className="w-full text-base font-extrabold shadow-xl"
      >
        {dropoff
          ? `Đặt ${serviceType === 'CAR_7' ? 'CrabCar 7 Chỗ' : 'CrabCar 4 Chỗ'} • ${formatCurrency(
              getCalculatedFare(serviceType)
            )}`
          : 'Vui lòng chọn Điểm Đến trên bản đồ'}
      </Button>
    </div>
  );
};
