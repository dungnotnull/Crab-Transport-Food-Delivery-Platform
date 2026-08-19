import React, { useEffect, useState } from 'react';
import { useTripStore } from '../../stores/tripStore';
import { tripService } from '../../services/trip.service';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Badge } from '../common/Badge';
import { formatCurrency } from '../../utils/currency.utils';
import { formatDistance, formatDuration, HALO_BUILDING_LOCATION, POPULAR_DESTINATIONS } from '../../utils/geo.utils';
import { ServiceType, PaymentMethod, LocationPoint } from '../../types/trip.types';
import { MapPin, Navigation, Car, Bike, UtensilsCrossed, CreditCard, Banknote, Sparkles, Clock, Compass } from 'lucide-react';
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

  // Tính toán OSRM Preview khi có đủ Pickup và Dropoff
  useEffect(() => {
    if (pickup && dropoff) {
      let isMounted = true;
      setIsLoadingRoute(true);

      tripService
        .previewTrip(pickup, dropoff)
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
  }, [pickup, dropoff, setIsLoadingRoute, setRoutePreview]);

  // Chọn nhanh điểm đón Halo Building
  const handleSelectHaloBuilding = () => {
    setPickup(HALO_BUILDING_LOCATION);
    showToast('Đã chọn điểm đón tại Tòa nhà Halo Building', 'success');
  };

  // Chọn vị trí GPS của trình duyệt
  const handleSelectCurrentGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPickup({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            address: 'Vị trí GPS hiện tại của tôi',
          });
          showToast('Đã lấy tọa độ GPS của bạn', 'success');
        },
        () => {
          showToast('Không thể lấy quyền truy cập GPS, giữ điểm đón hiện tại', 'warning');
        }
      );
    }
  };

  // Chọn điểm đến gợi ý
  const handleSelectPopularDropoff = (destination: LocationPoint) => {
    setDropoff(destination);
  };

  // Tính giá theo loại xe
  const getCalculatedFare = (type: ServiceType) => {
    if (!routePreview) return 0;
    const base = routePreview.fare;
    if (type === 'CAR') return Math.round(base * 1.8 / 1000) * 1000;
    if (type === 'FOOD') return Math.round(base * 0.9 / 1000) * 1000;
    return base;
  };

  // Thực hiện Đặt xe
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
      showToast('Đã tạo yêu cầu đặt xe thành công! Đang tìm tài xế gần nhất...', 'success');
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
            <span>Đặt Chuyến Đi</span>
            <Badge variant="success" size="sm">Cực Nhanh</Badge>
          </h2>
          <p className="text-xs text-slate-500 font-medium">Bản đồ định vị thời gian thực Leaflet & OSRM</p>
        </div>
      </div>

      {/* Pickup & Dropoff Inputs */}
      <div className="flex flex-col gap-2.5 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100">
        {/* Điểm đón (Pickup) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00B14F] inline-block"></span>
              Điểm đón
            </span>
            <div className="flex gap-1.5">
              <button
                onClick={handleSelectHaloBuilding}
                className="text-[11px] font-bold text-[#00B14F] hover:bg-emerald-100/70 bg-emerald-50 px-2 py-0.5 rounded-md transition-colors flex items-center gap-1"
              >
                📍 Halo Building
              </button>
              <button
                onClick={handleSelectCurrentGPS}
                className="text-[11px] font-bold text-slate-600 hover:bg-slate-200 bg-slate-100 px-2 py-0.5 rounded-md transition-colors flex items-center gap-1"
              >
                <Compass className="w-3 h-3 text-slate-500" />
                GPS
              </button>
            </div>
          </div>
          <div className="text-xs font-semibold text-slate-800 bg-white p-2.5 rounded-xl border border-slate-200 truncate flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#00B14F] shrink-0" />
            <span className="truncate">{pickup.address || `${pickup.lat.toFixed(4)}, ${pickup.lng.toFixed(4)}`}</span>
          </div>
        </div>

        {/* Điểm đến (Dropoff) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] inline-block"></span>
              Điểm đến
            </span>
            <span className="text-[11px] text-slate-400">Click trên bản đồ hoặc chọn dưới</span>
          </div>
          <div className="text-xs font-semibold text-slate-800 bg-white p-2.5 rounded-xl border border-slate-200 truncate flex items-center gap-2">
            <Navigation className="w-4 h-4 text-[#EF4444] shrink-0" />
            <span className="truncate text-slate-700">
              {dropoff ? dropoff.address || `${dropoff.lat.toFixed(4)}, ${dropoff.lng.toFixed(4)}` : 'Chưa chọn điểm đến (Hãy chọn bên dưới)'}
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
        <div className="flex items-center justify-between bg-emerald-50/70 border border-emerald-100 p-3 rounded-2xl">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#00B14F]" />
            <span className="text-xs font-bold text-emerald-900">
              {formatDuration(routePreview.duration)} ({formatDistance(routePreview.distance)})
            </span>
          </div>
          <Badge variant="success" size="sm">OSRM Đường Thực Tế</Badge>
        </div>
      )}

      {/* Vehicle Type Selector */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Chọn loại dịch vụ
        </label>
        <div className="grid grid-cols-3 gap-2">
          {/* CrabBike */}
          <button
            onClick={() => setServiceType('BIKE')}
            className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-between text-center transition-all ${
              serviceType === 'BIKE'
                ? 'border-[#00B14F] bg-emerald-50/50 shadow-md shadow-[#00B14F]/10'
                : 'border-slate-100 bg-white hover:border-slate-200'
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-[#00B14F] mb-1.5">
              <Bike className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">CrabBike</span>
            <span className="text-xs font-black text-[#00B14F] mt-1">
              {routePreview ? formatCurrency(getCalculatedFare('BIKE')) : '15.000 ₫'}
            </span>
          </button>

          {/* CrabCar */}
          <button
            onClick={() => setServiceType('CAR')}
            className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-between text-center transition-all ${
              serviceType === 'CAR'
                ? 'border-[#00B14F] bg-emerald-50/50 shadow-md shadow-[#00B14F]/10'
                : 'border-slate-100 bg-white hover:border-slate-200'
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 mb-1.5">
              <Car className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">CrabCar</span>
            <span className="text-xs font-black text-blue-600 mt-1">
              {routePreview ? formatCurrency(getCalculatedFare('CAR')) : '28.000 ₫'}
            </span>
          </button>

          {/* CrabFood */}
          <button
            onClick={() => setServiceType('FOOD')}
            className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-between text-center transition-all ${
              serviceType === 'FOOD'
                ? 'border-[#FF5B00] bg-orange-50/50 shadow-md shadow-[#FF5B00]/10'
                : 'border-slate-100 bg-white hover:border-slate-200'
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center text-[#FF5B00] mb-1.5">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">CrabFood</span>
            <span className="text-xs font-black text-[#FF5B00] mt-1">
              {routePreview ? formatCurrency(getCalculatedFare('FOOD')) : '14.000 ₫'}
            </span>
          </button>
        </div>
      </div>

      {/* Payment Method & Coupon */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPaymentMethod('CASH')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              paymentMethod === 'CASH'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Banknote className="w-3.5 h-3.5 text-emerald-400" />
            Tiền mặt
          </button>
          <button
            onClick={() => setPaymentMethod('CREDIT_CARD')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              paymentMethod === 'CREDIT_CARD'
                ? 'bg-slate-900 text-white'
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
          ? `Đặt ${serviceType === 'BIKE' ? 'CrabBike' : serviceType === 'CAR' ? 'CrabCar' : 'CrabFood'} • ${formatCurrency(
              getCalculatedFare(serviceType)
            )}`
          : 'Vui lòng chọn Điểm Đến'}
      </Button>
    </div>
  );
};
