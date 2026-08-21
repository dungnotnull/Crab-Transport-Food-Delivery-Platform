import React, { useEffect, useState } from 'react';
import { useTripStore } from '../../stores/tripStore';
import { tripService } from '../../services/trip.service';
import { socketService } from '../../services/socket.service';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { formatCurrency } from '../../utils/currency.utils';
import { formatDistance, formatDuration, POPULAR_DESTINATIONS } from '../../utils/geo.utils';
import { ServiceType, PaymentMethod, LocationPoint } from '../../types/trip.types';
import { MapPin, Navigation, Car, CreditCard, Banknote, Sparkles, Clock, Compass, Users } from 'lucide-react';
import { useToast } from '../common/Toast';
import { getApiErrorMessage } from '../../services/auth.helpers';

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
  const [couponCode, setCouponCode] = useState('');
  const [couponInput, setCouponInput] = useState('');
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

  const [faresByType, setFaresByType] = useState<{
    BIKE?: any;
    CAR_4?: any;
    CAR_7?: any;
  }>({});

  // Cấu hình giá cước chuẩn từ Backend SystemConfigs
  const BACKEND_PRICING_CONFIG = {
    BIKE: { name: 'CrabBike (Xe Máy)', baseFare: 15000, ratePerKm: 5000, desc: 'Xe máy 1 người' },
    CAR_4: { name: 'CrabCar 4 Chỗ', baseFare: 25000, ratePerKm: 10000, desc: 'Sedan 4 chỗ' },
    CAR_7: { name: 'CrabCar 7 Chỗ', baseFare: 30000, ratePerKm: 12000, desc: 'SUV/MPV 7 chỗ' },
  };

  // Tính toán OSRM Preview khi có đủ Pickup, Dropoff và loại xe (Lấy đồng thời cả 3 loại xe từ backend)
  useEffect(() => {
    if (!dropoff) {
      setRoutePreview(null);
      setFaresByType({});
      return;
    }

    let isMounted = true;
    setIsLoadingRoute(true);

    Promise.all([
      tripService.previewTrip(pickup, dropoff, 'BIKE', couponCode).catch(() => null),
      tripService.previewTrip(pickup, dropoff, 'CAR_4', couponCode).catch(() => null),
      tripService.previewTrip(pickup, dropoff, 'CAR_7', couponCode).catch(() => null),
    ])
      .then(([bikeData, car4Data, car7Data]) => {
        if (isMounted) {
          const map = {
            BIKE: bikeData,
            CAR_4: car4Data,
            CAR_7: car7Data,
          };
          setFaresByType(map);
          const current = map[serviceType] || car4Data || bikeData;
          setRoutePreview(current);
        }
      })
      .catch((err) => {
        if (isMounted) {
          showToast(getApiErrorMessage(err, 'Không thể tính lộ trình và cước phí. Vui lòng thử lại.'), 'error');
          if (couponCode) {
            setCouponCode('');
            setCouponInput('');
          }
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingRoute(false);
      });

    return () => {
      isMounted = false;
    };
  }, [pickup, dropoff, couponCode, setIsLoadingRoute, setRoutePreview, showToast]);

  // Cập nhật routePreview khi đổi loại xe
  useEffect(() => {
    if (faresByType[serviceType]) {
      setRoutePreview(faresByType[serviceType]);
    }
  }, [serviceType, faresByType, setRoutePreview]);

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

  // Lấy giá cước chính xác từ kết quả tính toán của Backend
  const getCalculatedFare = (type: ServiceType) => {
    if (faresByType[type]?.fare) {
      return faresByType[type].fare;
    }
    if (routePreview?.fare) {
      if (type === 'BIKE') return Math.round((routePreview.fare * 0.55) / 1000) * 1000;
      if (type === 'CAR_7') return Math.round((routePreview.fare * 1.35) / 1000) * 1000;
      return routePreview.fare;
    }
    return 0;
  };

  // Thực hiện Đặt xe Crab
  const handleBookTrip = async () => {
    if (!dropoff || !routePreview) {
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

      socketService.joinRoom(`trip_${trip.id}`);
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
              Điểm đón (Kéo thả trên map)
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
            <span className="text-[11px] text-slate-400">Nhập địa chỉ, GPS hoặc click bản đồ</span>
          </div>

          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Nhập địa chỉ hoặc tọa độ điểm đến..."
                value={dropoff?.address || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  // Kiểm tra nếu người dùng nhập định dạng tọa độ "lat, lng"
                  const coordMatch = val.match(/^(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)$/);
                  if (coordMatch) {
                    setDropoff({
                      lat: parseFloat(coordMatch[1]),
                      lng: parseFloat(coordMatch[3]),
                      address: val,
                    });
                  } else {
                    setDropoff({
                      lat: dropoff?.lat || 10.7725,
                      lng: dropoff?.lng || 106.698,
                      address: val,
                    });
                  }
                }}
                className="w-full text-xs font-semibold text-slate-800 bg-white p-2.5 pl-8 rounded-xl border border-slate-200 focus:border-[#00B14F] focus:ring-1 focus:ring-[#00B14F] outline-none truncate"
              />
              <Navigation className="w-4 h-4 text-[#EF4444] absolute left-2.5 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Quick Destination Pills */}
          <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">Gợi ý:</span>
            {POPULAR_DESTINATIONS.map((dest, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPopularDropoff(dest)}
                className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border whitespace-nowrap transition-colors shrink-0 ${
                  dropoff?.address === dest.address
                    ? 'bg-emerald-50 border-[#00B14F] text-[#00B14F] font-bold'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {dest.address ? dest.address.split(',')[0] : 'Điểm đến'}
              </button>
            ))}
          </div>
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
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Chọn loại xe & So sánh giá cước
          </label>
          <span className="text-[10px] text-slate-400 font-medium">Bảng giá minh bạch</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {/* CrabBike (Xe Máy) */}
          <button
            type="button"
            onClick={() => setServiceType('BIKE')}
            aria-pressed={serviceType === 'BIKE'}
            className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-between text-center transition-[background-color,border-color,box-shadow,transform] active:scale-95 ${
              serviceType === 'BIKE'
                ? 'border-[#00B14F] bg-emerald-50 shadow-md shadow-[#00B14F]/20 ring-2 ring-emerald-500/20'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-xl mb-1">
              🛵
            </div>
            <div className="text-xs font-black text-slate-900">CrabBike</div>
            <span className="text-[10px] text-slate-500 font-medium">Xe máy 1 người</span>
            <div className="mt-1.5 pt-1.5 border-t border-slate-200/80 w-full">
              <span className="text-xs font-black text-[#00B14F] block">
                {routePreview ? formatCurrency(getCalculatedFare('BIKE')) : 'Đang tính...'}
              </span>
            </div>
          </button>

          {/* CrabCar 4 Chỗ */}
          <button
            type="button"
            onClick={() => setServiceType('CAR_4')}
            aria-pressed={serviceType === 'CAR_4'}
            className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-between text-center transition-[background-color,border-color,box-shadow,transform] active:scale-95 ${
              serviceType === 'CAR_4'
                ? 'border-[#00B14F] bg-emerald-50 shadow-md shadow-[#00B14F]/20 ring-2 ring-emerald-500/20'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-xl mb-1">
              🚗
            </div>
            <div className="text-xs font-black text-slate-900">CrabCar 4C</div>
            <span className="text-[10px] text-slate-500 font-medium">Sedan 4 chỗ</span>
            <div className="mt-1.5 pt-1.5 border-t border-slate-200/80 w-full">
              <span className="text-xs font-black text-[#00B14F] block">
                {routePreview ? formatCurrency(getCalculatedFare('CAR_4')) : 'Đang tính...'}
              </span>
            </div>
          </button>

          {/* CrabCar 7 Chỗ */}
          <button
            type="button"
            onClick={() => setServiceType('CAR_7')}
            aria-pressed={serviceType === 'CAR_7'}
            className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-between text-center transition-[background-color,border-color,box-shadow,transform] active:scale-95 ${
              serviceType === 'CAR_7'
                ? 'border-blue-600 bg-blue-50 shadow-md shadow-blue-600/20 ring-2 ring-blue-500/20'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-xl mb-1">
              🚙
            </div>
            <div className="text-xs font-black text-slate-900">CrabCar 7C</div>
            <span className="text-[10px] text-slate-500 font-medium">SUV/MPV 7 chỗ</span>
            <div className="mt-1.5 pt-1.5 border-t border-slate-200/80 w-full">
              <span className="text-xs font-black text-blue-600 block">
                {routePreview ? formatCurrency(getCalculatedFare('CAR_7')) : 'Đang tính...'}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Transparent Fare Breakdown Card (Chi tiết giá cước khi thanh toán theo Backend SystemConfigs) */}
      {routePreview && (
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs flex flex-col gap-2.5 animate-in fade-in duration-200 shadow-2xs">
          <div className="flex items-center justify-between font-bold text-slate-700 pb-2 border-b border-slate-200">
            <span className="flex items-center gap-1.5 text-[13px]">
              <span>🧾 Chi tiết cước phí:</span>
              <strong className="text-slate-900">
                {BACKEND_PRICING_CONFIG[serviceType].name}
              </strong>
            </span>
            <span className="text-emerald-700 bg-emerald-100/90 px-2.5 py-0.5 rounded-lg text-[11px] font-extrabold">
              {formatDistance(routePreview.distance)} • {formatDuration(routePreview.duration)}
            </span>
          </div>

          {/* Chi tiết từng cấu phần giá theo SystemConfigs backend */}
          <div className="space-y-1.5 text-slate-600">
            <div className="flex justify-between">
              <span>• Giá mở cửa (Cước khởi điểm):</span>
              <span className="font-semibold text-slate-800">
                {formatCurrency(BACKEND_PRICING_CONFIG[serviceType].baseFare)}
              </span>
            </div>

            <div className="flex justify-between">
              <span>• Đơn giá theo cự ly ({BACKEND_PRICING_CONFIG[serviceType].ratePerKm.toLocaleString('vi-VN')} ₫/km):</span>
              <span className="font-semibold text-slate-800">
                {formatCurrency(
                  Math.round(((routePreview.distance / 1000) * BACKEND_PRICING_CONFIG[serviceType].ratePerKm) / 1000) * 1000
                )}
              </span>
            </div>

            {routePreview.breakdown?.discount ? (
              <div className="flex justify-between text-emerald-600 font-bold">
                <span>• Khuyến mãi (Mã Coupon):</span>
                <span>-{formatCurrency(routePreview.breakdown.discount)}</span>
              </div>
            ) : null}
          </div>

          <div className="flex justify-between items-center pt-2.5 border-t border-slate-200 font-extrabold text-sm">
            <div className="flex flex-col">
              <span className="text-slate-900">Tổng cước thanh toán:</span>
              <span className="text-[10px] text-slate-400 font-normal">Đã bao gồm VAT & phí nền tảng 20%</span>
            </div>
            <span className="text-xl text-[#00B14F] font-black tracking-tight">
              {formatCurrency(getCalculatedFare(serviceType))}
            </span>
          </div>
        </div>
      )}

      {/* Payment Method & Coupon */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPaymentMethod('CASH')}
            aria-pressed={paymentMethod === 'CASH'}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-[background-color,color,box-shadow] ${
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
            aria-pressed={paymentMethod === 'CREDIT_CARD'}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-[background-color,color,box-shadow] ${
              paymentMethod === 'CREDIT_CARD'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-blue-400" />
            Thẻ
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Mã KM (nếu có)"
            value={couponInput}
            onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
            className="w-28 px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg outline-none focus:border-[#00B14F]"
          />
          <button
            type="button"
            onClick={() => setCouponCode(couponInput)}
            className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Áp dụng
          </button>
        </div>
      </div>

      {/* Book Action Button */}
      <Button
        size="lg"
        onClick={handleBookTrip}
        isLoading={isSubmitting || isLoadingRoute}
        disabled={!dropoff || !routePreview || isLoadingRoute}
        className="w-full text-base font-extrabold shadow-xl"
      >
        {isLoadingRoute
          ? 'Đang tính cước...'
          : dropoff && routePreview
          ? `Thanh toán ${
              serviceType === 'BIKE'
                ? 'CrabBike (Xe Máy)'
                : serviceType === 'CAR_7'
                ? 'CrabCar 7 Chỗ'
                : 'CrabCar 4 Chỗ'
            } • ${formatCurrency(getCalculatedFare(serviceType))}`
          : dropoff
          ? 'Chưa có giá cước'
          : 'Vui lòng chọn Điểm Đến'}
      </Button>
    </div>
  );
};
