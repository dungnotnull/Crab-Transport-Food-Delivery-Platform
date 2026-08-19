import React, { useState } from 'react';
import { useTripStore } from '../../stores/tripStore';
import { apiClient } from '../../services/api';
import { Button } from './Button';
import { Badge } from './Badge';
import { useToast } from './Toast';
import { Play, FastForward, Activity, Sparkles, ChevronDown, ChevronUp, Radio } from 'lucide-react';

export const DevSimulatorWidget: React.FC = () => {
  const { activeTrip, setTripStatus, setDriverLocation, pickup, dropoff } = useTripStore();
  const [isOpen, setIsOpen] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(2);
  const [isSimulating, setIsSimulating] = useState(false);
  const { showToast } = useToast();

  const handleStartSimulation = async () => {
    if (!activeTrip) {
      showToast('Cần có chuyến đi đang hoạt động để chạy mô phỏng!', 'warning');
      return;
    }

    try {
      setIsSimulating(true);
      // Gọi API Backend Simulator
      await apiClient.post('/simulator/simulate-trip', {
        tripId: activeTrip.id,
        speedMultiplier,
      });
      showToast(`Đã kích hoạt mô phỏng di chuyển tài xế (Tốc độ ${speedMultiplier}x)`, 'success');
    } catch {
      // Mock chuyển động mượt mà bằng Turf/Interval nếu backend simulator chưa mở
      let step = 0;
      const totalSteps = 20;
      setTripStatus('IN_TRANSIT');

      const destLat = dropoff ? dropoff.lat : pickup.lat + 0.005;
      const destLng = dropoff ? dropoff.lng : pickup.lng + 0.005;

      const interval = setInterval(() => {
        step++;
        const t = step / totalSteps;
        const currentLat = pickup.lat + (destLat - pickup.lat) * t;
        const currentLng = pickup.lng + (destLng - pickup.lng) * t;

        setDriverLocation({
          lat: currentLat,
          lng: currentLng,
          heading: 45,
        });

        if (step >= totalSteps) {
          clearInterval(interval);
          setIsSimulating(false);
          setTripStatus('ARRIVED_AT_DESTINATION');
          showToast('🏁 Tài xế ảo đã đến điểm trả an toàn!', 'success');
        }
      }, 800 / speedMultiplier);

      showToast('Đang chạy mô phỏng di chuyển xe trực tiếp trên bản đồ!', 'info');
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <div className="bg-slate-900/95 text-white backdrop-blur-md rounded-2xl border border-slate-700 shadow-2xl overflow-hidden transition-all duration-200">
        {/* Toggle Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between gap-3 px-4 py-2.5 w-full text-xs font-bold hover:bg-slate-800 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>Dev GIS Simulator</span>
            <Badge variant="success" size="sm">Mock Tool</Badge>
          </div>
          {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>

        {/* Expandable Controls */}
        {isOpen && (
          <div className="p-4 flex flex-col gap-3 border-t border-slate-800 text-xs w-72">
            <div className="flex items-center justify-between text-slate-300">
              <span>Trạng thái chuyến:</span>
              <span className="font-extrabold text-[#00B14F]">
                {activeTrip ? activeTrip.status : 'Chưa có cuốc'}
              </span>
            </div>

            {/* Speed Multiplier */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] text-slate-400 font-semibold">Tốc độ mô phỏng:</span>
              <div className="grid grid-cols-3 gap-1.5">
                {[1, 2, 5].map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => setSpeedMultiplier(spd)}
                    className={`py-1 rounded-lg font-black transition-all ${
                      speedMultiplier === spd
                        ? 'bg-[#00B14F] text-white shadow-xs'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>

            {/* Start Simulation Action */}
            <Button
              size="sm"
              isLoading={isSimulating}
              onClick={handleStartSimulation}
              leftIcon={<Play className="w-3.5 h-3.5 fill-current" />}
              className="w-full font-bold shadow-md shadow-emerald-500/20"
            >
              Chạy mô phỏng xe chạy
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
