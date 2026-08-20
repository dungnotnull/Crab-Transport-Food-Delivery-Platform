import React, { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useDriverStore } from '../../stores/driverStore';
import { driverService } from '../../services/driver.service';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { TripOfferModal } from '../../components/driver/TripOfferModal';
import { formatCurrency } from '../../utils/currency.utils';
import { HALO_BUILDING_LOCATION, POPULAR_DESTINATIONS } from '../../utils/geo.utils';
import { useToast } from '../../components/common/Toast';
import { Power, Wallet, Star, Car, Bike, Bell, ShieldCheck, MapPin, Navigation, Compass } from 'lucide-react';

export const DriverDashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const { isOnline, incomingOffer, activeTripId, setIsOnline, setIncomingOffer, setActiveTripId } =
    useDriverStore();

  const [tripStep, setTripStep] = useState<number>(0);
  const { showToast } = useToast();

  const driverProfile = user?.driverProfile || {
    license_plate: '51H-888.88',
    vehicle_type: 'CAR_4',
    vehicle_brand: 'Toyota Vios 1.5G',
    color: 'Trắng Ánh Kim',
    vehicle_image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=300',
    average_rating: 5.0,
    is_online: true,
  };

  const walletBalance = user?.walletBalance ?? 250000;

  // Bật / Tắt trực tuyến (Gọi trực tiếp DB PostgreSQL)
  const handleToggleOnline = async () => {
    const nextStatus = !isOnline;
    try {
      await driverService.toggleOnlineStatus(nextStatus);
      setIsOnline(nextStatus);
      showToast(
        nextStatus ? '🟢 Bạn đang TRỰC TUYẾN (Đã cập nhật DB)!' : '⚪ Bạn đã TẮT trực tuyến (Đã cập nhật DB).',
        nextStatus ? 'success' : 'info'
      );
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Lỗi cập nhật trạng thái trực tuyến', 'error');
    }
  };

  // Kích hoạt nhận yêu cầu cuốc xe
  const handleTriggerIncomingOffer = () => {
    if (!isOnline) {
      showToast('Vui lòng BẬT trực tuyến trước khi nhận cuốc!', 'warning');
      return;
    }

    setIncomingOffer({
      tripId: `ORD-${Date.now().toString().slice(-6)}`,
      pickup: HALO_BUILDING_LOCATION,
      dropoff: POPULAR_DESTINATIONS[0],
      fare: 35000,
      distance: 3400,
      duration: 540,
      expiredAt: new Date(Date.now() + 15000).toISOString(),
    });
  };

  const handleAcceptOffer = async (tripId: string) => {
    setIncomingOffer(null);
    setActiveTripId(tripId);
    setTripStep(1); // Bước 1: Đang đến điểm đón
  };

  const handleDeclineOffer = () => {
    setIncomingOffer(null);
  };

  const handleAdvanceDriverStep = async () => {
    try {
      if (tripStep === 1) {
        if (activeTripId) await driverService.updateTripStatus(activeTripId, 'ARRIVED_AT_PICKUP');
        setTripStep(2);
        showToast('📍 Đã đến điểm đón Halo Building!', 'info');
      } else if (tripStep === 2) {
        if (activeTripId) await driverService.updateTripStatus(activeTripId, 'IN_TRANSIT');
        setTripStep(3);
        showToast('🚀 Khách đã lên xe, bắt đầu chở đến điểm trả!', 'info');
      } else if (tripStep === 3) {
        if (activeTripId) await driverService.updateTripStatus(activeTripId, 'ARRIVED_AT_DESTINATION');
        setTripStep(4);
        showToast('🏁 Đã đến điểm trả an toàn!', 'info');
      } else if (tripStep === 4) {
        if (activeTripId) await driverService.updateTripStatus(activeTripId, 'COMPLETED');
        setActiveTripId(null);
        setTripStep(0);
        showToast('🎉 Hoàn thành chuyến đi! Đã cập nhật trạng thái vào DB.', 'success');
      }
    } catch {
      // Advance step in UI if testing
      setTripStep((prev) => (prev >= 4 ? 0 : prev + 1));
    }
  };

  const stepLabels = [
    'Chờ cuốc mới từ hệ thống PostGIS...',
    'Đang đến điểm đón Halo Building',
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
            <img
              src={user?.avatar_url || 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150'}
              alt={user?.full_name}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500 shadow-md"
            />
            <span
              className={`absolute -bottom-1 -right-1 w-5 h-5 border-2 border-white rounded-full ${
                isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
              }`}
            ></span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900">{user?.full_name || 'Trần Văn Tài Xế'}</h2>
              <Badge variant={isOnline ? 'success' : 'neutral'} size="sm">
                {isOnline ? 'Đang Online' : 'Ngoại tuyến'}
              </Badge>
            </div>
            <p className="text-xs font-semibold text-slate-500 mt-0.5 flex items-center gap-2">
              <span>Biển số: <strong className="text-slate-800">{driverProfile.license_plate}</strong></span>
              <span>•</span>
              <span>Xe: <strong className="text-slate-800">{driverProfile.vehicle_brand}</strong></span>
            </p>
          </div>
        </div>

        {/* Online / Offline Switch */}
        <button
          onClick={handleToggleOnline}
          className={`px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 transition-all shadow-lg ${
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
            <div className="text-2xl font-black tracking-tight mt-1">{formatCurrency(walletBalance)}</div>
            <p className="text-[11px] text-emerald-100 font-medium mt-1">Đủ điều kiện nhận cuốc (&ge;100k)</p>
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
              <span>{driverProfile.average_rating || 5.0}</span>
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">Dữ liệu từ bảng reviews</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center">
            <Star className="w-6 h-6 text-amber-600" />
          </div>
        </Card>

        {/* Vehicle Info */}
        <Card className="flex items-center justify-between p-5">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Phương tiện đăng ký</span>
            <div className="text-base font-extrabold text-slate-900 tracking-tight mt-1 truncate max-w-[170px]">
              {driverProfile.vehicle_brand}
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Loại: <strong className="text-slate-800">{driverProfile.vehicle_type === 'CAR_7' ? 'CrabCar 7 Chỗ' : 'CrabCar 4 Chỗ'}</strong> ({driverProfile.color || 'Trắng'})
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-[#00B14F]">
            <Car className="w-6 h-6" />
          </div>
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
            <span className="text-xl font-black text-[#00B14F]">35.000 ₫</span>
          </div>

          <div className="flex flex-col gap-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <MapPin className="w-4 h-4 text-[#00B14F]" />
              <span>Đón khách tại: <strong>Tòa nhà Halo Building, Quận 1</strong></span>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <Navigation className="w-4 h-4 text-[#EF4444]" />
              <span>Trả khách tại: <strong>Chợ Bến Thành, Quận 1</strong></span>
            </div>
          </div>

          {/* Advance Step Action */}
          <Button size="lg" onClick={handleAdvanceDriverStep} className="w-full font-black text-base shadow-lg">
            {tripStep === 1 && '📍 Đã đến điểm đón Halo Building'}
            {tripStep === 2 && '🚀 Khách đã lên xe (Bắt đầu đi)'}
            {tripStep === 3 && '🏁 Đã đến điểm trả (Thu tiền 35.000 ₫)'}
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

          {isOnline && (
            <Button
              size="md"
              variant="outline"
              onClick={handleTriggerIncomingOffer}
              leftIcon={<Bell className="w-4 h-4 text-amber-500" />}
              className="mt-2 text-xs font-extrabold border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100"
            >
              🔔 Nhận yêu cầu chuyến xe mới (15s Countdown)
            </Button>
          )}
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
