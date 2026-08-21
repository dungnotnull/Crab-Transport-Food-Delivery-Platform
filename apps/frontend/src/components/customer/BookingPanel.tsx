import React, { useEffect, useRef, useState } from 'react';
import { useTripStore } from '../../stores/tripStore';
import { tripService } from '../../services/trip.service';
import { socketService } from '../../services/socket.service';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { formatCurrency } from '../../utils/currency.utils';
import { formatDistance, formatDuration, POPULAR_DESTINATIONS } from '../../utils/geo.utils';
import { ServiceType, PaymentMethod, LocationPoint } from '../../types/trip.types';
import { CreditCard, Banknote, Sparkles, Clock, Compass, Bike, Car, UsersRound } from 'lucide-react';
import { useToast } from '../common/Toast';
import { getApiErrorMessage } from '../../services/auth.helpers';
import { AddressAutocomplete } from './AddressAutocomplete';
import { canPreviewRoute } from '../../utils/tripRules';
import type { RoutePreviewData } from '../../types/trip.types';

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
  const routeRequestIdRef = useRef(0);

  // Tự động lấy định vị GPS thực tế của thiết bị người dùng khi khởi động
  useEffect(() => {
    if (navigator.geolocation) {
      setIsLocatingGPS(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPickup({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            address: 'Vị trí GPS hiện tại của tôi',
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
    BIKE?: RoutePreviewData | null;
    CAR_4?: RoutePreviewData | null;
    CAR_7?: RoutePreviewData | null;
  }>({});

  // Tính toán OSRM Preview khi có đủ Pickup, Dropoff và loại xe (Lấy đồng thời cả 3 loại xe từ backend)
  useEffect(() => {
    // Mỗi thay đổi địa chỉ đều vô hiệu hóa request cũ, kể cả khi một đầu mút trở về rỗng.
    const requestId = ++routeRequestIdRef.current;
    if (!pickup || !dropoff || !canPreviewRoute(pickup, dropoff)) {
      setRoutePreview(null);
      setFaresByType({});
      setIsLoadingRoute(false);
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
        if (isMounted && requestId === routeRequestIdRef.current) {
          const map = {
            BIKE: bikeData,
            CAR_4: car4Data,
            CAR_7: car7Data,
          };
          setFaresByType(map);
          const current = map[serviceType] || car4Data || bikeData;
          setRoutePreview(current);
          if (!current) {
            showToast('Không thể tính lộ trình và cước phí. Vui lòng thử lại.', 'error');
          }
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
        if (isMounted && requestId === routeRequestIdRef.current) {
          setIsLoadingRoute(false);
        }
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
            address: 'Vị trí GPS hiện tại của tôi',
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
    return faresByType[type]?.fare ?? 0;
  };

  // Thực hiện Đặt xe Crab

  // Thực hiện Đặt xe Crab
  const handleBookTrip = async () => {
    if (!pickup || !dropoff || !routePreview) {
      showToast('Vui lòng chọn chính xác điểm đón và điểm đến.', 'warning');
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
    <div className="flex w-full min-w-0 flex-col gap-4 rounded-3xl border border-slate-100 bg-white/95 p-4 shadow-xl backdrop-blur-md sm:p-5">
      {/* Header Panel */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex flex-wrap items-center gap-2 text-lg font-black tracking-tight text-slate-900">
            <span className="flex items-center gap-2"><Bike className="h-5 w-5 text-[#00B14F]" aria-hidden="true" />Đặt Xe Di Chuyển Crab</span>
            <Badge variant="success" size="sm">Trực Tuyến</Badge>
          </h2>
          <p className="text-xs text-slate-500 font-medium">Xe máy CrabBike & Ô tô CrabCar 4-7 chỗ</p>
        </div>
      </div>

      {/* Cặp địa chỉ A/B chỉ lưu tọa độ sau khi chọn gợi ý, GPS hoặc bản đồ. */}
      <div className="flex flex-col gap-2.5 rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5">
        <AddressAutocomplete
          id="pickup-address"
          label="Điểm đón"
          tone="pickup"
          value={pickup}
          onChange={setPickup}
          bias={pickup ?? dropoff}
          placeholder="Nhập điểm đón"
        />

        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={handleRefreshCurrentGPS}
            disabled={isLocatingGPS}
            className="flex min-h-8 items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1 text-xs font-bold text-[#00843D] transition-colors hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/20 disabled:cursor-wait disabled:opacity-60"
          >
            <Compass className={`h-3.5 w-3.5 ${isLocatingGPS ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>{isLocatingGPS ? 'Đang định vị…' : 'Dùng vị trí hiện tại'}</span>
          </button>
        </div>

        <AddressAutocomplete
          id="dropoff-address"
          label="Điểm đến"
          tone="dropoff"
          value={dropoff}
          onChange={setDropoff}
          bias={pickup}
          placeholder="Bạn muốn đi đâu?"
        />

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="shrink-0 text-[10px] font-bold uppercase text-slate-400">Gợi ý:</span>
          {POPULAR_DESTINATIONS.map((dest) => (
            <button
              key={`${dest.lat}-${dest.lng}`}
              type="button"
              onClick={() => handleSelectPopularDropoff(dest)}
              className={`min-h-8 shrink-0 whitespace-nowrap rounded-xl border px-2.5 text-xs font-semibold transition-colors ${
                dropoff?.address === dest.address
                  ? 'border-[#00B14F] bg-emerald-50 text-[#00843D]'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {dest.address?.split(',')[0] ?? 'Điểm đến'}
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
            <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-[#00843D]">
              <Bike className="h-5 w-5" aria-hidden="true" />
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
            <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-[#00843D]">
              <Car className="h-5 w-5" aria-hidden="true" />
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
            <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <UsersRound className="h-5 w-5" aria-hidden="true" />
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

      {/* Chỉ hiển thị các cấu phần giá thực sự được Backend trả về. */}
      {routePreview && (
        <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs shadow-2xs">
          <div className="flex items-center justify-between text-slate-600">
            <span className="font-semibold">Giá trước khuyến mãi</span>
            <span className="font-bold text-slate-800">
              {formatCurrency(routePreview.breakdown?.originalFare ?? routePreview.fare)}
            </span>
          </div>
          {routePreview.breakdown?.discount ? (
            <div className="flex items-center justify-between font-bold text-emerald-700">
              <span>Khuyến mãi</span>
              <span>-{formatCurrency(routePreview.breakdown.discount)}</span>
            </div>
          ) : null}
          <div className="flex items-center justify-between border-t border-slate-200 pt-2.5">
            <span className="font-extrabold text-slate-900">Cước dự kiến từ Backend</span>
            <span className="text-xl font-black tracking-tight text-[#00B14F]">
              {formatCurrency(getCalculatedFare(serviceType))}
            </span>
          </div>
        </div>
      )}
      {/* Payment Method & Coupon */}
      <div className="flex flex-col gap-2.5 border-t border-slate-100 pt-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPaymentMethod('CASH')}
            aria-pressed={paymentMethod === 'CASH'}
            className={`flex h-10 shrink-0 whitespace-nowrap items-center gap-1.5 rounded-xl px-3.5 text-xs font-bold transition-[background-color,color,box-shadow] ${
              paymentMethod === 'CASH'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Banknote className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Tiền mặt</span>
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod('CREDIT_CARD')}
            aria-pressed={paymentMethod === 'CREDIT_CARD'}
            className={`flex h-10 shrink-0 whitespace-nowrap items-center gap-1.5 rounded-xl px-3.5 text-xs font-bold transition-[background-color,color,box-shadow] ${
              paymentMethod === 'CREDIT_CARD'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <CreditCard className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Thẻ</span>
          </button>
        </div>

        <div className="flex min-w-0 items-center gap-1.5">
          <input
            type="text"
            placeholder="Mã KM (nếu có)"
            value={couponInput}
            onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
            className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 outline-none focus:border-[#00B14F] sm:w-28 sm:flex-none"
          />
          <button
            type="button"
            onClick={() => setCouponCode(couponInput)}
            className="flex h-10 shrink-0 whitespace-nowrap items-center gap-1 rounded-xl bg-emerald-50 px-3 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-100 active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Áp dụng</span>
          </button>
        </div>
      </div>

      {/* Book Action Button */}
      <Button
        size="lg"
        onClick={handleBookTrip}
        isLoading={isSubmitting || isLoadingRoute}
        disabled={!pickup || !dropoff || !routePreview || isLoadingRoute}
        className="w-full text-base font-extrabold shadow-xl"
      >
        {isLoadingRoute
          ? 'Đang tính cước...'
          : pickup && dropoff && routePreview
          ? `Thanh toán ${
              serviceType === 'BIKE'
                ? 'CrabBike (Xe Máy)'
                : serviceType === 'CAR_7'
                ? 'CrabCar 7 Chỗ'
                : 'CrabCar 4 Chỗ'
            } • ${formatCurrency(getCalculatedFare(serviceType))}`
          : pickup && dropoff
          ? 'Chưa có giá cước'
          : 'Chọn Điểm Đón và Điểm Đến'}
      </Button>
    </div>
  );
};
