import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useDriverStore } from '../../stores/driverStore';
import { driverService } from '../../services/driver.service';
import { tripService } from '../../services/trip.service';
import { socketService } from '../../services/socket.service';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { TripOfferModal } from '../../components/driver/TripOfferModal';
import { CrabMap } from '../../components/map/CrabMap';
import { formatCurrency } from '../../utils/currency.utils';
import { useToast } from '../../components/common/Toast';
import { getApiErrorMessage } from '../../services/auth.helpers';
import { Trip } from '../../types/trip.types';
import { Power, Wallet, Star, Car, MapPin, Navigation, Compass, User } from 'lucide-react';

export const DriverDashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const { isOnline, incomingOffer, activeTripId, setIsOnline, setIncomingOffer, setActiveTripId } =
    useDriverStore();

  const [tripStep, setTripStep] = useState<number>(0);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [isTogglingOnline, setIsTogglingOnline] = useState(false);
  const [isUpdatingTrip, setIsUpdatingTrip] = useState(false);
  const { showToast } = useToast();

  const driverProfile = user?.driverProfile;

  const [walletBalance, setWalletBalance] = useState<number | null>(user?.walletBalance ?? null);
  const [driverLocation, setDriverLocation] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    if (typeof driverProfile?.is_online === 'boolean') {
      setIsOnline(driverProfile.is_online);
    }
  }, [driverProfile?.is_online, setIsOnline]);

  // 1. Fetch real wallet & restore active trip on mount
  useEffect(() => {
    driverService.getWalletDetails().then((wallet) => {
      if (typeof wallet?.balance === 'number') {
        setWalletBalance(wallet.balance);
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
      showToast('Chưa thể khôi phục chuyến đang hoạt động.', 'warning');
    });
  }, [setActiveTripId, showToast]);

  // 2. Geolocation tracking & emit
  useEffect(() => {
    if (!isOnline) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setDriverLocation({ lat: latitude, lng: longitude });
        socketService.emit('driver:update_location', { lat: latitude, lng: longitude });
        
        // Cập nhật lên API (Debounce)
        driverService.updateLocation(latitude, longitude).catch(() => {});
      },
      () => showToast('Không thể lấy vị trí GPS. Hãy cấp quyền vị trí để nhận cuốc.', 'warning'),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isOnline]);

  // 3. Socket listeners
  useEffect(() => {
    const handleTripOffer = (data: any) => {
      setIncomingOffer(data);
    };

    socketService.on('driver:trip_offer', handleTripOffer);
    
    return () => {
      socketService.off('driver:trip_offer', handleTripOffer);
    };
  }, [setIncomingOffer]);

  // Bật / Tắt trực tuyến (Gọi trực tiếp DB PostgreSQL)
  const handleToggleOnline = async () => {
    if (isTogglingOnline) return;
    const nextStatus = !isOnline;
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
      setIncomingOffer(null);
      setActiveTripId(tripId);
      setTripStep(1);
      socketService.joinRoom(`trip_${tripId}`);
      showToast('Đã nhận chuyến thành công!', 'success');
    } catch (err: unknown) {
      setIncomingOffer(null);
      showToast(getApiErrorMessage(err, 'Cuốc xe đã bị nhận bởi tài xế khác'), 'error');
    }
  };

  const handleDeclineOffer = () => {
    setIncomingOffer(null);
  };

  const handleAdvanceDriverStep = async () => {
    try {
      if (isUpdatingTrip) return;
      setIsUpdatingTrip(true);
      if (tripStep === 1) {
        if (!activeTripId) return;
        const updatedTrip = await driverService.updateTripStatus(activeTripId, 'ARRIVED_AT_PICKUP');
        setActiveTrip((previous) => previous ? { ...previous, ...updatedTrip, status: 'ARRIVED_AT_PICKUP' } : previous);
        setTripStep(2);
        showToast('📍 Đã đến điểm đón!', 'info');
      } else if (tripStep === 2) {
        if (!activeTripId) return;
        const updatedTrip = await driverService.updateTripStatus(activeTripId, 'IN_TRANSIT');
        setActiveTrip((previous) => previous ? { ...previous, ...updatedTrip, status: 'IN_TRANSIT' } : previous);
        setTripStep(3);
        showToast('🚀 Khách đã lên xe, bắt đầu chở đến điểm trả!', 'info');
      } else if (tripStep === 3) {
        if (!activeTripId) return;
        const updatedTrip = await driverService.updateTripStatus(activeTripId, 'ARRIVED_AT_DESTINATION');
        setActiveTrip((previous) => previous ? { ...previous, ...updatedTrip, status: 'ARRIVED_AT_DESTINATION' } : previous);
        setTripStep(4);
        showToast('🏁 Đã đến điểm trả an toàn!', 'info');
      } else if (tripStep === 4) {
        if (!activeTripId) return;
        await driverService.updateTripStatus(activeTripId, 'COMPLETED');
        setActiveTrip(null);
        setActiveTripId(null);
        setTripStep(0);
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
              className={`absolute -bottom-1 -right-1 w-5 h-5 border-2 border-white rounded-full ${
                isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
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
          disabled={isTogglingOnline}
          onClick={handleToggleOnline}
          className={`px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 transition-[background-color,box-shadow,opacity] shadow-lg disabled:cursor-not-allowed disabled:opacity-60 ${
            isOnline
              ? 'bg-[#00B14F] hover:bg-[#00843D] text-white shadow-emerald-600/30'
              : 'bg-slate-800 hover:bg-slate-900 text-white shadow-slate-800/30'
          }`}
        >
          <Power className="w-5 h-5" />
          {isOnline ? 'SẴN SÀNG NHẬN CUỐC' : 'BẬT TRỰC TUYẾN'}
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Wallet Balance */}
        <Card className="flex items-center justify-between p-5 bg-gradient-to-br from-emerald-500 to-[#00843D] text-white shadow-lg shadow-emerald-600/20">
          <div>
            <span className="text-xs font-bold text-emerald-100 uppercase tracking-wider">Ví Tài Xế</span>
            <div className="text-2xl font-black tracking-tight mt-1">
              {walletBalance === null ? 'Đang tải…' : formatCurrency(walletBalance)}
            </div>
            <p className="text-[11px] text-emerald-100 font-medium mt-1">
              {walletBalance === null ? 'Đang đồng bộ số dư ví' : 'Điều kiện nhận cuốc từ hệ thống'}
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
              <span>{driverProfile?.average_rating?.toFixed(1) || 'Chưa có'}</span>
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
              <Badge variant="warning" size="md">Đang Thực Hiện Chuyến Đi</Badge>
              <h3 className="text-lg font-black text-slate-900 mt-1">{stepLabels[tripStep]}</h3>
            </div>
            <span className="text-xl font-black text-[#00B14F]">
              {activeTrip ? formatCurrency(activeTrip.total_fare) : 'Đang cập nhật'}
            </span>
          </div>

          <div className="flex flex-col gap-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <MapPin className="w-4 h-4 text-[#00B14F]" />
              <span>Đón khách tại: <strong>{activeTrip?.pickup_location.address || 'Địa chỉ đang cập nhật'}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <Navigation className="w-4 h-4 text-[#EF4444]" />
              <span>Trả khách tại: <strong>{activeTrip?.dropoff_location.address || 'Địa chỉ đang cập nhật'}</strong></span>
            </div>
          </div>

          {/* Advance Step Action */}
          <Button size="lg" isLoading={isUpdatingTrip} onClick={handleAdvanceDriverStep} className="w-full font-black text-base shadow-lg">
            {tripStep === 1 && '📍 Đã đến điểm đón'}
            {tripStep === 2 && '🚀 Khách đã lên xe (Bắt đầu đi)'}
            {tripStep === 3 && `🏁 Đã đến điểm trả${activeTrip ? ` (Thu tiền ${formatCurrency(activeTrip.total_fare)})` : ''}`}
            {tripStep === 4 && '✅ Hoàn thành chuyến đi'}
          </Button>
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
                ? 'Hệ thống PostGIS sẽ tự động chia cuốc gần nhất trong bán kính 3km khi khách hàng đặt xe.'
                : 'Bật trực tuyến để bắt đầu nhận các cuốc xe từ khách hàng.'}
            </p>
          </div>

          <div className="h-64 w-full rounded-2xl overflow-hidden mt-4 relative">
            <CrabMap
              pickup={null}
              dropoff={null}
              driverLocation={driverLocation || undefined}
              className="w-full h-full"
            />
          </div>
        </Card>
      )}

      {/* Incoming Offer Modal */}
      <TripOfferModal
        offer={incomingOffer}
        onAccept={handleAcceptOffer}
        onDecline={handleDeclineOffer}
      />
    </div>
  );
};
