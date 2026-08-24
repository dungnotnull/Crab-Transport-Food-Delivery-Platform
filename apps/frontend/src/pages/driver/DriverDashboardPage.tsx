import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useDriverStore } from '../../stores/driverStore';
import { driverService } from '../../services/driver.service';
import { tripService } from '../../services/trip.service';
import { routingService } from '../../services/routing.service';
import { socketService } from '../../services/socket.service';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { TripOfferModal } from '../../components/driver/TripOfferModal';
import { DriverTripSimulator } from '../../components/driver/DriverTripSimulator';
import { CrabMap } from '../../components/map/CrabMap';
import { formatCurrency } from '../../utils/currency.utils';
import { useToast } from '../../components/common/Toast';
import { getApiErrorMessage } from '../../services/auth.helpers';
import {
  getTripAcceptErrorMessage,
  isTripAcceptConflict,
} from '../../utils/tripRules';
import type { Trip, TripStatus } from '../../types/trip.types';
import type {
  DriverLocationUpdatePayload,
  DriverTripOfferPayload,
  TripLocationStreamPayload,
  TripStatusChangedPayload,
} from '../../types/socket.types';
import {
  createDriverLocationUpdatePayload,
  isEventForActiveTrip,
  shouldSyncLiveDriverLocation,
} from '../../utils/driverTripSimulation.utils';
import {
  MIN_DRIVER_WALLET_BALANCE,
  canDriverGoOnline,
} from '../../utils/driverWallet.utils';
import { Power, Wallet, Star, Car, MapPin, Navigation, Compass, User } from 'lucide-react';

const TRIP_STEP_BY_STATUS: Partial<Record<TripStatus, number>> = {
  ACCEPTED: 1,
  ARRIVED_AT_PICKUP: 2,
  IN_TRANSIT: 3,
  ARRIVED_AT_DESTINATION: 4,
  COMPLETED: 0,
};

type DriverManualTripStatus = Extract<
  TripStatus,
  | 'ARRIVED_AT_PICKUP'
  | 'IN_TRANSIT'
  | 'ARRIVED_AT_DESTINATION'
  | 'COMPLETED'
>;

export const DriverDashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const {
    isOnline,
    incomingOffers,
    activeTripId,
    setIsOnline,
    queueIncomingOffer,
    removeIncomingOffer,
    clearIncomingOffers,
    setActiveTripId,
  } = useDriverStore();

  const [tripStep, setTripStep] = useState<number>(0);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const activeTripRef = useRef<Trip | null>(null);
  const [isTogglingOnline, setIsTogglingOnline] = useState(false);
  const [isUpdatingTrip, setIsUpdatingTrip] = useState(false);
  const [isSimulatingTrip, setIsSimulatingTrip] = useState(false);
  const [activeRouteGeometry, setActiveRouteGeometry] = useState<[number, number][]>([]);
  const [isLoadingActiveRoute, setIsLoadingActiveRoute] = useState(false);
  const { showToast } = useToast();

  const driverProfile = user?.driverProfile;

  const [walletBalance, setWalletBalance] = useState<number | null>(user?.walletBalance ?? null);
  const [driverLocation, setDriverLocation] = useState<{ lat: number, lng: number } | null>(null);
  const hasEligibleWallet = canDriverGoOnline(walletBalance);

  useEffect(() => {
    activeTripRef.current = activeTrip;
  }, [activeTrip]);

  useEffect(() => {
    if (typeof driverProfile?.is_online === 'boolean') {
      setIsOnline(driverProfile.is_online);
    }
  }, [driverProfile?.is_online, setIsOnline]);

  // 1. Fetch real wallet & restore active trip on mount
  useEffect(() => {
    driverService.getWalletDetails().then((wallet) => {
      if (wallet && wallet.balance !== undefined) {
        setWalletBalance(Number(wallet.balance));
      }
    }).catch(() => {
      showToast('Chưa thể tải số dư ví tài xế.', 'warning');
    });

    tripService.getActiveTrip().then((trip) => {
      if (trip) {
        setActiveTrip(trip);
        setActiveTripId(trip.id);
        if (trip.status === 'ACCEPTED') setTripStep(1);
        else if (trip.status === 'ARRIVED_AT_PICKUP') setTripStep(2);
        else if (trip.status === 'IN_TRANSIT') setTripStep(3);
        else if (trip.status === 'ARRIVED_AT_DESTINATION') setTripStep(4);
        socketService.joinRoom(`trip_${trip.id}`);
      }
    }).catch(() => {
      // Bình thường khi tài xế chưa có cuốc nào đang chạy
    });
  }, [setActiveTripId, showToast]);

  useEffect(() => {
    if (!activeTrip) {
      setActiveRouteGeometry([]);
      setIsLoadingActiveRoute(false);
      return;
    }

    let isCurrentRequest = true;
    const controller = new AbortController();
    setIsLoadingActiveRoute(true);
    routingService
      .getRouteGeometry(
        activeTrip.pickup_location,
        activeTrip.dropoff_location,
        controller.signal,
      )
      .then((geometry) => {
        if (isCurrentRequest) setActiveRouteGeometry(geometry);
      })
      .catch(() => {
        if (isCurrentRequest) {
          setActiveRouteGeometry([]);
          showToast('Không tải được tuyến OSRM; mô phỏng sẽ dùng tuyến thẳng dự phòng.', 'warning');
        }
      })
      .finally(() => {
        if (isCurrentRequest) setIsLoadingActiveRoute(false);
      });

    return () => {
      isCurrentRequest = false;
      controller.abort();
    };
  }, [
    activeTrip?.dropoff_location.lat,
    activeTrip?.dropoff_location.lng,
    activeTrip?.id,
    activeTrip?.pickup_location.lat,
    activeTrip?.pickup_location.lng,
    activeTrip?.service_type,
    showToast,
  ]);

  // 2. Khởi tạo tọa độ ban đầu của tài xế khi mở trang (không dùng watchPosition liên tục đè vị trí mô phỏng)
  useEffect(() => {
    if (!isOnline || isSimulatingTrip || driverLocation) return;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setDriverLocation(loc);
          driverService.updateLocation(loc.lat, loc.lng).catch(() => {});
        },
        () => {
          const fallback = { lat: 10.780171, lng: 106.693983 };
          setDriverLocation(fallback);
          driverService.updateLocation(fallback.lat, fallback.lng).catch(() => {});
        },
        { enableHighAccuracy: false, timeout: 5000 }
      );
    } else {
      const fallback = { lat: 10.780171, lng: 106.693983 };
      setDriverLocation(fallback);
      driverService.updateLocation(fallback.lat, fallback.lng).catch(() => {});
    }
  }, [isOnline, isSimulatingTrip, driverLocation]);

  // 3. Socket listeners
  useEffect(() => {
    const handleTripOffer = (data: DriverTripOfferPayload) => {
      if (useDriverStore.getState().activeTripId) return;
      queueIncomingOffer(data);
    };

    // Lắng nghe khi cuốc xe bị tài xế khác nhận trước hoặc khách hủy (BUG-014, FEAT-001)
    const handleTripCancelledOffer = (data: { tripId: string }) => {
      const hasCancelledOffer = useDriverStore
        .getState()
        .incomingOffers
        .some((offer) => offer.tripId === data.tripId);
      if (hasCancelledOffer) {
        removeIncomingOffer(data.tripId);
        showToast('Cuốc xe đã được tài xế khác tiếp nhận hoặc đã bị hủy.', 'info');
      }
    };

    // Lắng nghe cập nhật trạng thái cuốc xe (từ Simulator hoặc Khách hủy) (BUG-014, FEAT-002)
    const handleTripStatusChanged = async (data: TripStatusChangedPayload) => {
      const currentTripId = useDriverStore.getState().activeTripId;
      if (!isEventForActiveTrip(currentTripId, data.tripId)) return;

      if (data.status === 'CANCELLED') {
        showToast('Chuyến đi đã bị hủy!', 'warning');
        setIsSimulatingTrip(false);
        setActiveTrip(null);
        setActiveTripId(null);
        setTripStep(0);
        socketService.forgetRoom(`trip_${data.tripId}`);
        return;
      }

      if (data.status === 'ACCEPTED') {
        setTripStep(1);
      } else if (data.status === 'ARRIVED_AT_PICKUP') {
        setTripStep(2);
        showToast('📍 Đã đến điểm đón khách!', 'info');
      } else if (data.status === 'IN_TRANSIT') {
        setTripStep(3);
        showToast('🚀 Đang trong hành trình chở khách...', 'info');
      } else if (data.status === 'ARRIVED_AT_DESTINATION') {
        setTripStep(4);
        showToast('🏁 Đã đến điểm trả!', 'info');
      } else if (data.status === 'COMPLETED') {
        const currentActiveTrip = activeTripRef.current;
        if (currentActiveTrip?.dropoff_location) {
          const finalDropoff = {
            lat: currentActiveTrip.dropoff_location.lat,
            lng: currentActiveTrip.dropoff_location.lng,
          };
          setDriverLocation(finalDropoff);
          driverService.updateLocation(finalDropoff.lat, finalDropoff.lng).catch(() => {});
        }
        setIsSimulatingTrip(false);
        setActiveTrip(null);
        setActiveTripId(null);
        setTripStep(0);
        socketService.forgetRoom(`trip_${data.tripId}`);
        showToast('🎉 Chuyến đi đã hoàn tất thành công! Doanh thu đã được cộng vào ví.', 'success');
        driverService.getWalletDetails().then((wallet) => {
          if (wallet && wallet.balance !== undefined) setWalletBalance(Number(wallet.balance));
        }).catch(() => {});
        return;
      }

      if (data.tripId) {
        try {
          const trip = await tripService.getTripDetails(data.tripId);
          if (isEventForActiveTrip(useDriverStore.getState().activeTripId, data.tripId)) {
            setActiveTrip(trip);
          }
        } catch { }
      }
    };

    // Lắng nghe stream tọa độ xe di chuyển (từ Simulator hoặc GPS) (FEAT-002)
    const handleLocationStream = (data: TripLocationStreamPayload) => {
      const currentTripId = useDriverStore.getState().activeTripId;
      if (!currentTripId) return;
      if (data.tripId && !isEventForActiveTrip(currentTripId, data.tripId)) return;

      if (typeof data.lat === 'number' && typeof data.lng === 'number') {
        setDriverLocation({ lat: data.lat, lng: data.lng });
      }
    };

    socketService.on('driver:trip_offer', handleTripOffer);
    socketService.on('driver:trip_cancelled_offer', handleTripCancelledOffer);
    socketService.on('trip:status_changed', handleTripStatusChanged);
    socketService.on('trip:location_stream', handleLocationStream);

    return () => {
      socketService.off('driver:trip_offer', handleTripOffer);
      socketService.off('driver:trip_cancelled_offer', handleTripCancelledOffer);
      socketService.off('trip:status_changed', handleTripStatusChanged);
      socketService.off('trip:location_stream', handleLocationStream);
    };
  }, [queueIncomingOffer, removeIncomingOffer, setActiveTripId, showToast]);

  // Bật / Tắt trực tuyến (Gọi trực tiếp DB PostgreSQL)
  const handleToggleOnline = async () => {
    if (isTogglingOnline) return;
    const nextStatus = !isOnline;
    if (nextStatus && !hasEligibleWallet) {
      showToast(
        `Cần tối thiểu ${formatCurrency(MIN_DRIVER_WALLET_BALANCE)} trong ví để bật nhận cuốc.`,
        'warning',
      );
      return;
    }
    try {
      setIsTogglingOnline(true);
      await driverService.toggleOnlineStatus(nextStatus);
      setIsOnline(nextStatus);
      showToast(
        nextStatus ? '🟢 Bạn đang TRỰC TUYẾN (Đã cập nhật DB)!' : '⚪ Bạn đã TẮT trực tuyến (Đã cập nhật DB).',
        nextStatus ? 'success' : 'info'
      );
    } catch (err: unknown) {
      showToast(getApiErrorMessage(err, 'Lỗi cập nhật trạng thái trực tuyến'), 'error');
    } finally {
      setIsTogglingOnline(false);
    }
  };



  const handleAcceptOffer = async (tripId: string) => {
    try {
      await driverService.acceptTrip(tripId);
      const trip = await tripService.getTripDetails(tripId);
      setActiveTrip(trip);
      clearIncomingOffers();
      setActiveTripId(tripId);
      setTripStep(1);
      socketService.joinRoom(`trip_${tripId}`);
      showToast('Đã nhận chuyến thành công!', 'success');
    } catch (err: unknown) {
      if (isTripAcceptConflict(err)) {
        removeIncomingOffer(tripId);
      }
      showToast(getTripAcceptErrorMessage(err), 'error');
    }
  };

  const handleDeclineOffer = (tripId: string) => {
    removeIncomingOffer(tripId);
  };

  const updateActiveTripStatus = async (
    status: DriverManualTripStatus,
    keepCompletedTrip = false,
  ) => {
    if (!activeTripId) throw new Error('Không có chuyến đi đang hoạt động');

    await driverService.updateTripStatus(activeTripId, status);

    if (status === 'COMPLETED' && !keepCompletedTrip) {
      if (activeTrip?.dropoff_location) {
        const finalDropoff = {
          lat: activeTrip.dropoff_location.lat,
          lng: activeTrip.dropoff_location.lng,
        };
        setDriverLocation(finalDropoff);
        driverService.updateLocation(finalDropoff.lat, finalDropoff.lng).catch(() => {});
      }
      socketService.forgetRoom(`trip_${activeTripId}`);
      setActiveTrip(null);
      setActiveTripId(null);
      setTripStep(0);
      return;
    }

    setActiveTrip((previous) => previous ? { ...previous, status } : previous);
    setTripStep(TRIP_STEP_BY_STATUS[status] ?? 0);
  };

  const handleSimulatedLocation = (payload: DriverLocationUpdatePayload) => {
    setDriverLocation({
      lat: payload.lat,
      lng: payload.lng,
    });
    socketService.emit('driver:update_location', payload);
    driverService.updateLocation(payload.lat, payload.lng).catch(() => {});
  };

  const handleAdvanceDriverStep = async () => {
    try {
      if (isUpdatingTrip || isSimulatingTrip) return;
      setIsUpdatingTrip(true);
      if (tripStep === 1) {
        await updateActiveTripStatus('ARRIVED_AT_PICKUP');
        showToast('📍 Đã đến điểm đón!', 'info');
      } else if (tripStep === 2) {
        await updateActiveTripStatus('IN_TRANSIT');
        showToast('🚀 Khách đã lên xe, bắt đầu chở đến điểm trả!', 'info');
      } else if (tripStep === 3) {
        await updateActiveTripStatus('ARRIVED_AT_DESTINATION');
        showToast('🏁 Đã đến điểm trả an toàn!', 'info');
      } else if (tripStep === 4) {
        await updateActiveTripStatus('COMPLETED');
        showToast('🎉 Hoàn thành chuyến đi! Đã cập nhật trạng thái vào DB.', 'success');
      }
    } catch (err: unknown) {
      showToast(getApiErrorMessage(err, 'Không thể cập nhật trạng thái chuyến đi.'), 'error');
    } finally {
      setIsUpdatingTrip(false);
    }
  };

  const stepLabels = [
    'Chờ cuốc mới từ hệ thống PostGIS...',
    'Đang đến điểm đón',
    'Đã đến điểm đón (Chờ khách ra)',
    'Đang chở khách đến điểm trả',
    'Đã đến nơi (Thu tiền & Hoàn tất)',
  ];

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 flex flex-col gap-6">
      {/* Header Profile & Online Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-md">
        <div className="flex items-center gap-4">
          <div className="relative">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.full_name || 'Ảnh đại diện tài xế'}
                width={64}
                height={64}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500 shadow-md"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-[#00B14F] border-2 border-emerald-500 flex items-center justify-center shadow-md">
                <User className="w-7 h-7" aria-hidden="true" />
              </div>
            )}
            <span
              className={`absolute -bottom-1 -right-1 w-5 h-5 border-2 border-white rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                }`}
            ></span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900">{user?.full_name || 'Tài xế'}</h2>
              <Badge variant={isOnline ? 'success' : 'neutral'} size="sm">
                {isOnline ? 'Đang Online' : 'Ngoại tuyến'}
              </Badge>
            </div>
            <p className="text-xs font-semibold text-slate-500 mt-0.5 flex items-center gap-2">
              <span>Biển số: <strong className="text-slate-800">{driverProfile?.license_plate || 'Chưa cập nhật'}</strong></span>
              <span>•</span>
              <span>Xe: <strong className="text-slate-800">{driverProfile?.vehicle_brand || 'Chưa cập nhật'}</strong></span>
            </p>
          </div>
        </div>

        {/* Online / Offline Switch */}
        <button
          type="button"
          aria-pressed={isOnline}
          aria-busy={isTogglingOnline}
          disabled={isTogglingOnline || (!isOnline && !hasEligibleWallet)}
          onClick={handleToggleOnline}
          aria-describedby="driver-wallet-condition"
          className={`px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 transition-[background-color,box-shadow,opacity] shadow-lg disabled:cursor-not-allowed disabled:opacity-60 ${isOnline
              ? 'bg-[#00B14F] hover:bg-[#00843D] text-white shadow-emerald-600/30'
              : 'bg-slate-800 hover:bg-slate-900 text-white shadow-slate-800/30'
            }`}
        >
          <Power className="w-5 h-5" />
          {isOnline
            ? 'SẴN SÀNG NHẬN CUỐC'
            : hasEligibleWallet
              ? 'BẬT TRỰC TUYẾN'
              : 'VÍ CHƯA ĐỦ ĐIỀU KIỆN'}
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Wallet Balance */}
        <Card className={`flex items-center justify-between p-5 bg-gradient-to-br text-white shadow-lg ${hasEligibleWallet ? 'from-emerald-500 to-[#00843D] shadow-emerald-600/20' : 'from-amber-500 to-amber-700 shadow-amber-600/20'}`}>
          <div>
            <span className="text-xs font-bold text-emerald-100 uppercase tracking-wider">Ví Tài Xế</span>
            <div className="text-2xl font-black tracking-tight mt-1">
              {walletBalance === null ? 'Đang tải…' : formatCurrency(walletBalance)}
            </div>
            <p id="driver-wallet-condition" className="mt-1 text-[11px] font-medium text-white/90">
              {walletBalance === null
                ? 'Đang đồng bộ số dư ví trước khi bật nhận cuốc'
                : hasEligibleWallet
                  ? `Đủ điều kiện nhận cuốc (tối thiểu ${formatCurrency(MIN_DRIVER_WALLET_BALANCE)})`
                  : `Cần tối thiểu ${formatCurrency(MIN_DRIVER_WALLET_BALANCE)} để nhận cuốc`}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
            <Wallet className="w-6 h-6 text-white" />
          </div>
        </Card>

        {/* Rating */}
        <Card className="flex items-center justify-between p-5">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Đánh giá trung bình</span>
            <div className="text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-1.5">
              <span>{driverProfile?.average_rating ? Number(driverProfile.average_rating).toFixed(1) : 'Chưa có'}</span>
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">Dữ liệu từ bảng reviews</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center">
            <Star className="w-6 h-6 text-amber-600" />
          </div>
        </Card>

        {/* Vehicle Info */}
        <Card className="flex items-center justify-between gap-3 p-5">
          <div className="min-w-0">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Phương tiện đăng ký</span>
            <div className="text-base font-extrabold text-slate-900 tracking-tight mt-1 truncate max-w-[170px]">
              {driverProfile?.vehicle_brand || 'Chưa cập nhật'}
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Loại: <strong className="text-slate-800">
                {driverProfile?.vehicle_type === 'BIKE'
                  ? 'CrabBike'
                  : driverProfile?.vehicle_type === 'CAR_7'
                    ? 'CrabCar 7 Chỗ'
                    : driverProfile?.vehicle_type === 'CAR_4'
                      ? 'CrabCar 4 Chỗ'
                      : 'Chưa cập nhật'}
              </strong>{driverProfile?.color ? ` (${driverProfile.color})` : ''}
            </p>
          </div>
          {driverProfile?.vehicle_image ? (
            <img
              src={driverProfile.vehicle_image}
              alt={driverProfile.vehicle_brand ? `Ảnh ${driverProfile.vehicle_brand}` : 'Ảnh phương tiện'}
              width={64}
              height={48}
              loading="lazy"
              className="w-16 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
              <Car className="w-6 h-6" aria-hidden="true" />
            </div>
          )}
        </Card>
      </div>

      {/* Active Trip Workflow Panel */}
      {activeTripId ? (
        <Card className="p-6 border-2 border-emerald-500 shadow-xl flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="warning" size="md">Đang Thực Hiện Chuyến Đi</Badge>
                <Badge variant="info" size="sm">Có mô phỏng thủ công</Badge>
              </div>
              <h3 className="text-lg font-black text-slate-900 mt-1">{stepLabels[tripStep]}</h3>
            </div>
            <span className="text-xl font-black text-[#00B14F]">
              {activeTrip ? formatCurrency(activeTrip.total_fare) : 'Đang cập nhật'}
            </span>
          </div>

          <div className="flex flex-col gap-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <MapPin className="w-4 h-4 text-[#00B14F] shrink-0" />
              <span className="truncate">Đón khách: <strong>{activeTrip?.pickup_location?.address || 'Địa chỉ đang cập nhật'}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <Navigation className="w-4 h-4 text-[#EF4444] shrink-0" />
              <span className="truncate">Trả khách: <strong>{activeTrip?.dropoff_location?.address || 'Địa chỉ đang cập nhật'}</strong></span>
            </div>
          </div>

          {/* Live Navigation Map for Driver */}
          <div className="h-64 w-full rounded-2xl overflow-hidden border border-slate-200 relative shadow-inner">
            <CrabMap
              pickup={activeTrip?.pickup_location || null}
              dropoff={activeTrip?.dropoff_location || null}
              driverLocation={driverLocation || undefined}
              routeGeometry={activeRouteGeometry}
              className="w-full h-full"
            />
          </div>

          {activeTrip ? (
            <DriverTripSimulator
              trip={activeTrip}
              currentLocation={driverLocation}
              dropoffRoute={activeRouteGeometry}
              disabled={isUpdatingTrip}
              isPreparingRoute={isLoadingActiveRoute}
              onLocation={handleSimulatedLocation}
              onRunningChange={setIsSimulatingTrip}
            />
          ) : null}

          {/* Advance Step Action */}
          <div className="flex flex-col gap-1.5">
            <Button
              size="lg"
              isLoading={isUpdatingTrip}
              disabled={isUpdatingTrip || isSimulatingTrip}
              onClick={handleAdvanceDriverStep}
              className="w-full font-black text-base shadow-lg"
            >
              {tripStep === 1 && '📍 Đã đến điểm đón'}
              {tripStep === 2 && '🚀 Khách đã lên xe (Bắt đầu đi)'}
              {tripStep === 3 && `🏁 Đã đến điểm trả${activeTrip ? ` (Thu tiền ${formatCurrency(activeTrip.total_fare)})` : ''}`}
              {tripStep === 4 && '✅ Hoàn thành chuyến đi'}
              {tripStep === 0 && 'Chờ trạng thái tiếp theo...'}
            </Button>
            <p className="text-[11px] text-slate-400 text-center">
              Dùng nút này để cập nhật từng chặng thủ công khi mô phỏng không chạy.
            </p>
          </div>
        </Card>
      ) : (
        /* Standby Card */
        <Card className="p-8 text-center flex flex-col items-center gap-4 bg-gradient-to-b from-white to-slate-50 border border-slate-200">
          <div className="w-16 h-16 rounded-3xl bg-emerald-100 flex items-center justify-center text-[#00B14F] text-2xl shadow-inner">
            <Compass className="w-8 h-8 text-[#00B14F] animate-spin" style={{ animationDuration: '8s' }} />
          </div>

          <div>
            <h3 className="text-lg font-black text-slate-900">
              {isOnline ? 'Đang Chờ Cuốc Mới Từ Hệ Thống...' : 'Tài Xế Đang Ngoại Tuyến'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              {isOnline
                ? 'Hệ thống PostGIS sẽ tự động chia cuốc gần nhất trong bán kính 3km khi khách hàng đặt xe. Bạn có thể click vào bản đồ để đổi vị trí đứng.'
                : 'Bật trực tuyến để bắt đầu nhận các cuốc xe từ khách hàng.'}
            </p>
          </div>

          <div className="h-72 w-full rounded-2xl overflow-hidden mt-4 relative border border-slate-200 shadow-inner">
            <CrabMap
              pickup={null}
              dropoff={null}
              driverLocation={driverLocation || undefined}
              onMapClick={async (lat, lng) => {
                if (activeTrip) return;
                if (!isOnline) {
                  showToast('Hãy gạt nút "Bật Trực Tuyến" trước khi chọn vị trí.', 'warning');
                  return;
                }
                setDriverLocation({ lat, lng });
                try {
                  await driverService.updateLocation(lat, lng);
                  socketService.emit('driver:update_location', { lat, lng });
                  showToast(`📍 Đã đổi vị trí tài xế sang: (${lat.toFixed(4)}, ${lng.toFixed(4)})`, 'success');
                } catch {
                  showToast('Chưa thể cập nhật vị trí lên máy chủ.', 'error');
                }
              }}
              className="w-full h-full"
            />
          </div>
          {isOnline && (
            <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-2 mt-2 px-1">
              <p className="text-[11px] text-slate-500 italic">
                💡 <strong>Mẹo kiểm thử:</strong> Bạn có thể <u>click chuột trực tiếp lên bản đồ</u> để di chuyển tài xế.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      (pos) => {
                        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                        setDriverLocation(loc);
                        driverService.updateLocation(loc.lat, loc.lng).catch(() => {});
                        showToast('Đã đồng bộ lại vị trí theo GPS thật của thiết bị!', 'success');
                      },
                      () => {
                        showToast('Không thể lấy GPS thực tế của thiết bị.', 'warning');
                      },
                      { enableHighAccuracy: true, timeout: 5000 }
                    );
                  }
                }}
                className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline shrink-0"
              >
                🔄 Lấy lại GPS thiết bị
              </button>
            </div>
          )}
        </Card>
      )}

      {/* Incoming Offer Modal */}
      <TripOfferModal
        offers={incomingOffers}
        onAccept={handleAcceptOffer}
        onDecline={handleDeclineOffer}
      />
    </div>
  );
};
