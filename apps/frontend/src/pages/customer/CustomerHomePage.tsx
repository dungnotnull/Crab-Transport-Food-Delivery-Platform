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
import { useFleetSimulation } from '../../hooks/useFleetSimulation';
import { canCustomerCancel } from '../../utils/tripRules';
import { isEventForActiveTrip } from '../../utils/driverTripSimulation.utils';
import type {
  TripLocationStreamPayload,
  TripStatusChangedPayload,
} from '../../types/socket.types';

export const CustomerHomePage: React.FC = () => {
  const {
    pickup,
    dropoff,
    routePreview,
    driverLocation,
    activeTrip,
    isSearchingDriver,
    serviceType,
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
  const fleetEnabled = Boolean(
    showFleetSimulation && pickup && (!activeTrip || activeTrip.status === 'FINDING_DRIVER'),
  );
  const nearbyFleet = useFleetSimulation(pickup, serviceType, fleetEnabled);
  const eligibleDriverCount = nearbyFleet.filter((driver) => driver.eligible).length;

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
    const handleStatusChanged = async (data: TripStatusChangedPayload) => {
      const currentTripId = useTripStore.getState().activeTrip?.id ?? null;
      if (!isEventForActiveTrip(currentTripId, data.tripId)) return;

      if (data.status === 'CANCELLED') {
        showToast('Chuyến đi đã bị hủy!', 'warning');
        resetBooking();
        return;
      }

      // Fetch latest trip details to populate driver info
      try {
        const updatedTrip = await tripService.getTripDetails(data.tripId);
        const latestTripId = useTripStore.getState().activeTrip?.id ?? null;
        if (isEventForActiveTrip(latestTripId, data.tripId)) {
          setActiveTrip(updatedTrip);
        }
      } catch {
        const latestTripId = useTripStore.getState().activeTrip?.id ?? null;
        if (!isEventForActiveTrip(latestTripId, data.tripId)) return;
        showToast('Đã nhận trạng thái mới nhưng chưa tải được chi tiết chuyến đi.', 'warning');
        useTripStore.getState().setTripStatus(data.status);
      }

      const latestTripId = useTripStore.getState().activeTrip?.id ?? null;
      if (!isEventForActiveTrip(latestTripId, data.tripId)) return;

      if (data.status !== 'FINDING_DRIVER') {
        setIsSearchingDriver(false);
      }

      if (data.status === 'COMPLETED') {
        setIsRatingOpen(true);
      }
    };

    const handleLocationStream = (data: TripLocationStreamPayload) => {
      const currentTripId = useTripStore.getState().activeTrip?.id ?? null;
      if (!currentTripId) return;
      if (data.tripId && !isEventForActiveTrip(currentTripId, data.tripId)) return;
      if (!Number.isFinite(data.lat) || !Number.isFinite(data.lng)) return;

      useTripStore.getState().setDriverLocation({
        lat: data.lat,
        lng: data.lng,
        heading: data.heading,
      });
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
    if (!activeTrip || isCancelling || !canCustomerCancel(activeTrip.status)) return;

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
    <div className="relative flex h-[calc(100dvh-4rem)] w-full flex-col overflow-hidden md:flex-row">
      {/* Left Control Panel / Mobile Overlay */}
      <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 flex max-h-[68%] min-w-0 w-full shrink-0 flex-col justify-start overflow-y-auto overscroll-contain p-3 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-4 md:relative md:inset-auto md:h-full md:max-h-none md:w-[420px] md:p-6 lg:w-[460px]">
        {!activeTrip || activeTrip.status === 'FINDING_DRIVER' ? (
          <BookingPanel onStartFindingDriver={() => setIsSearchingDriver(true)} />
        ) : (
          <TripBottomSheet
            onCancelTrip={handleCancelTrip}
            onOpenRating={() => setIsRatingOpen(true)}
            isCancelling={isCancelling}
          />
        )}
      </div>

      {/* Main Map Stage */}
      <div className="flex-1 w-full h-full absolute md:relative inset-0 z-0">
        {/* Floating Fleet Status Badge */}
        {(!activeTrip || activeTrip.status === 'FINDING_DRIVER') && pickup ? (
          <div className="absolute left-4 right-4 top-4 z-10 flex items-center gap-2 rounded-2xl border border-emerald-100 bg-white/95 px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-lg backdrop-blur-md md:left-auto md:rounded-full">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00B14F]"></span>
            </span>
            <span className="min-w-0 flex-1">{eligibleDriverCount} tài xế mô phỏng phù hợp trong 3 km</span>
            <button
              type="button"
              onClick={() => setShowFleetSimulation(!showFleetSimulation)}
              aria-pressed={showFleetSimulation}
              className={`ml-1 min-h-9 rounded-full px-2.5 text-[10px] font-bold transition-colors ${
                showFleetSimulation ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {showFleetSimulation ? 'Đang mô phỏng' : 'Bật mô phỏng'}
            </button>
          </div>
        ) : null}

        <CrabMap
          pickup={pickup}
          dropoff={dropoff}
          routeGeometry={routePreview?.geometry}
          driverLocation={driverLocation}
          nearbyDrivers={fleetEnabled ? nearbyFleet : undefined}
          showMatchingRadius={fleetEnabled}
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
