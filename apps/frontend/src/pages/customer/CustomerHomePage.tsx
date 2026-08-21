import React, { useState, useEffect, useRef } from 'react';
import { useTripStore } from '../../stores/tripStore';
import { tripService } from '../../services/trip.service';
import { socketService } from '../../services/socket.service';
import { CrabMap } from '../../components/map/CrabMap';
import { BookingPanel } from '../../components/customer/BookingPanel';
import { FindingRadarModal } from '../../components/customer/FindingRadarModal';
import { TripBottomSheet } from '../../components/customer/TripBottomSheet';
import { RatingModal } from '../../components/customer/RatingModal';
import { useToast } from '../../components/common/Toast';
import { getApiErrorMessage } from '../../services/auth.helpers';
import { geocodingService } from '../../services/geocoding.service';

export const CustomerHomePage: React.FC = () => {
  const {
    pickup,
    dropoff,
    routePreview,
    driverLocation,
    activeTrip,
    isSearchingDriver,
    setPickup,
    setDropoff,
    setActiveTrip,
    setIsSearchingDriver,
    resetBooking,
  } = useTripStore();

  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showFleetSimulation, setShowFleetSimulation] = useState(true);
  const { showToast } = useToast();
  const reverseControllersRef = useRef<{
    pickup?: AbortController;
    dropoff?: AbortController;
  }>({});

  // Đội xe mô phỏng rải rác quanh trung tâm Sài Gòn / Halo Building
  const [nearbyFleet, setNearbyFleet] = useState<any[]>([
    { id: 'sim-bike-1', lat: 10.7838, lng: 106.6968, heading: 45, vehicleType: 'BIKE', driverName: 'Nguyễn Văn Nam (CrabBike)', licensePlate: '59P1-889.12' },
    { id: 'sim-car4-1', lat: 10.7812, lng: 106.6942, heading: 120, vehicleType: 'CAR_4', driverName: 'Trần Tuấn Anh (CrabCar 4C)', licensePlate: '51H-678.90' },
    { id: 'sim-car4-2', lat: 10.7850, lng: 106.6980, heading: 210, vehicleType: 'CAR_4', driverName: 'Lê Hoàng Hải (CrabCar 4C)', licensePlate: '51K-123.45' },
    { id: 'sim-car7-1', lat: 10.7798, lng: 106.6995, heading: 330, vehicleType: 'CAR_7', driverName: 'Phạm Đức Long (CrabCar 7C)', licensePlate: '59A-999.88' },
    { id: 'sim-bike-2', lat: 10.7865, lng: 106.6935, heading: 90, vehicleType: 'BIKE', driverName: 'Võ Minh Trí (CrabBike)', licensePlate: '59N2-456.78' },
  ]);

  // Hiệu ứng di chuyển nhẹ nhàng của đội xe khi ở màn hình chờ
  useEffect(() => {
    if (!showFleetSimulation || (activeTrip && activeTrip.status !== 'FINDING_DRIVER')) return;
    const interval = setInterval(() => {
      setNearbyFleet((prev) =>
        prev.map((d) => {
          const deltaLat = (Math.random() - 0.5) * 0.0003;
          const deltaLng = (Math.random() - 0.5) * 0.0003;
          const newHeading = Math.floor(Math.atan2(deltaLng, deltaLat) * (180 / Math.PI));
          return {
            ...d,
            lat: d.lat + deltaLat,
            lng: d.lng + deltaLng,
            heading: (newHeading + 360) % 360,
          };
        })
      );
    }, 3000);
    return () => clearInterval(interval);
  }, [showFleetSimulation, activeTrip]);

  // 1. Fetch active trip on mount to restore state
  useEffect(() => {
    tripService
      .getActiveTrip()
      .then((trip) => {
        if (trip) {
          setActiveTrip(trip);
          setPickup(trip.pickup_location);
          setDropoff(trip.dropoff_location);
          if (trip.status === 'FINDING_DRIVER') {
            setIsSearchingDriver(true);
          } else {
            setIsSearchingDriver(false);
          }

          // Tự động tải lại đường dẫn Polyline nếu đang trong chuyến
          if (trip.pickup_location && trip.dropoff_location) {
            tripService
              .previewTrip(trip.pickup_location, trip.dropoff_location, trip.service_type || 'CAR_4')
              .then((preview) => {
                useTripStore.getState().setRoutePreview(preview);
              })
              .catch(() => {});
          }

          // Join socket room
          socketService.joinRoom(`trip_${trip.id}`);
        }
      })
      .catch(() => {
        // no active trip
      });
  }, [setActiveTrip, setPickup, setDropoff, setIsSearchingDriver]);

  // 2. Listen to socket events
  useEffect(() => {
    const handleStatusChanged = async (data: any) => {
      if (data.status === 'CANCELLED') {
        showToast('Chuyến đi đã bị hủy!', 'warning');
        resetBooking();
        return;
      }

      // Fetch latest trip details to populate driver info
      try {
        const updatedTrip = await tripService.getTripDetails(data.tripId);
        setActiveTrip(updatedTrip);
      } catch {
        showToast('Đã nhận trạng thái mới nhưng chưa tải được chi tiết chuyến đi.', 'warning');
        useTripStore.getState().setTripStatus(data.status);
      }

      if (data.status !== 'FINDING_DRIVER') {
        setIsSearchingDriver(false);
      }

      if (data.status === 'COMPLETED') {
        setIsRatingOpen(true);
      }
    };

    const handleLocationStream = (data: any) => {
      useTripStore.getState().setDriverLocation({ lat: data.lat, lng: data.lng, heading: data.heading });
    };

    socketService.on('trip:status_changed', handleStatusChanged);
    socketService.on('trip:location_stream', handleLocationStream);

    return () => {
      socketService.off('trip:status_changed', handleStatusChanged);
      socketService.off('trip:location_stream', handleLocationStream);
    };
  }, [resetBooking, showToast, setActiveTrip]);

  useEffect(() => () => {
    reverseControllersRef.current.pickup?.abort();
    reverseControllersRef.current.dropoff?.abort();
  }, []);

  const resolveMapPoint = async (
    kind: 'pickup' | 'dropoff',
    lat: number,
    lng: number,
  ) => {
    reverseControllersRef.current[kind]?.abort();
    const controller = new AbortController();
    reverseControllersRef.current[kind] = controller;
    const coordinateLabel = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    const setPoint = kind === 'pickup' ? setPickup : setDropoff;

    setPoint({ lat, lng, address: coordinateLabel });

    try {
      const resolved = await geocodingService.reverse(
        { lat, lng, address: coordinateLabel },
        controller.signal,
      );
      if (!controller.signal.aborted && resolved?.address) {
        setPoint({ lat, lng, address: resolved.address });
      }
    } catch {
      // Tọa độ người dùng chọn vẫn hợp lệ khi dịch vụ reverse geocoding tạm thời lỗi.
    }
  };

  // Click trên bản đồ để chọn điểm đến
  const handleMapClick = (lat: number, lng: number) => {
    if (!activeTrip || activeTrip.status === 'CANCELLED' || activeTrip.status === 'COMPLETED') {
      void resolveMapPoint('dropoff', lat, lng);
      showToast('Đã chọn điểm đến trên bản đồ', 'info');
    }
  };

  const handleCancelSearch = async () => {
    if (isCancelling) return;
    if (!activeTrip) {
      resetBooking();
      return;
    }

    try {
      setIsCancelling(true);
      await tripService.cancelTrip(activeTrip.id);
      resetBooking();
      showToast('Đã hủy tìm kiếm tài xế', 'warning');
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Không thể hủy tìm kiếm. Vui lòng thử lại.'), 'error');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCancelTrip = async () => {
    if (!activeTrip || isCancelling) return;

    try {
      setIsCancelling(true);
      await tripService.cancelTrip(activeTrip.id);
      resetBooking();
      showToast('Đã hủy chuyến đi thành công', 'warning');
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Không thể hủy chuyến đi. Vui lòng thử lại.'), 'error');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] flex flex-col md:flex-row overflow-hidden">
      {/* Left Control Panel / Mobile Overlay */}
      <div className="z-10 w-full md:w-[420px] lg:w-[460px] p-4 md:p-6 flex flex-col justify-start md:overflow-y-auto shrink-0 pointer-events-auto">
        {!activeTrip || activeTrip.status === 'FINDING_DRIVER' ? (
          <BookingPanel onStartFindingDriver={() => setIsSearchingDriver(true)} />
        ) : (
          <TripBottomSheet
            onCancelTrip={handleCancelTrip}
            onOpenRating={() => setIsRatingOpen(true)}
          />
        )}
      </div>

      {/* Main Map Stage */}
      <div className="flex-1 w-full h-full absolute md:relative inset-0 z-0">
        {/* Floating Fleet Status Badge */}
        {!activeTrip && (
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-white/95 backdrop-blur-md shadow-lg border border-emerald-100 rounded-full px-3.5 py-1.5 text-xs font-semibold text-slate-700">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00B14F]"></span>
            </span>
            <span>5 Tài xế trực tuyến quanh bạn</span>
            <button
              type="button"
              onClick={() => setShowFleetSimulation(!showFleetSimulation)}
              className={`ml-1 text-[10px] px-2 py-0.5 rounded-full transition-colors font-bold ${
                showFleetSimulation ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {showFleetSimulation ? 'Đang mô phỏng' : 'Tắt'}
            </button>
          </div>
        )}

        <CrabMap
          pickup={pickup}
          dropoff={dropoff}
          routeGeometry={routePreview?.geometry}
          driverLocation={driverLocation}
          nearbyDrivers={showFleetSimulation && !activeTrip ? nearbyFleet : undefined}
          onMapClick={handleMapClick}
          onPickupChange={(lat, lng) => void resolveMapPoint('pickup', lat, lng)}
          onDropoffChange={(lat, lng) => void resolveMapPoint('dropoff', lat, lng)}
          className="w-full h-full rounded-none"
        />
      </div>

      {/* Radar Search Overlay */}
      {isSearchingDriver && (
        <FindingRadarModal
          onCancel={handleCancelSearch}
          isCancelling={isCancelling}
        />
      )}

      {/* Rating Modal */}
      {activeTrip && (
        <RatingModal
          isOpen={isRatingOpen}
          onClose={() => {
            setIsRatingOpen(false);
            resetBooking();
          }}
          tripId={activeTrip.id}
        />
      )}
    </div>
  );
};
