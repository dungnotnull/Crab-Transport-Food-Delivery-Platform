import React, { useState, useEffect } from 'react';
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
  const { showToast } = useToast();

  // 1. Fetch active trip on mount to restore state
  useEffect(() => {
    tripService.getActiveTrip().then((trip) => {
      if (trip) {
        setActiveTrip(trip);
        // Khôi phục route nếu cần, ở đây tạm set dropoff & pickup
        setPickup(trip.pickup_location);
        setDropoff(trip.dropoff_location);
        if (trip.status === 'FINDING_DRIVER') {
          setIsSearchingDriver(true);
        } else {
          setIsSearchingDriver(false);
        }
        // Join socket room
        socketService.joinRoom(`trip_${trip.id}`);
      }
    }).catch(() => {
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

  // Click trên bản đồ để chọn điểm đến
  const handleMapClick = (lat: number, lng: number) => {
    if (!activeTrip || activeTrip.status === 'CANCELLED' || activeTrip.status === 'COMPLETED') {
      setDropoff({
        lat,
        lng,
        address: `Vị trí đã chọn (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      });
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
        <CrabMap
          pickup={pickup}
          dropoff={dropoff}
          routeGeometry={routePreview?.geometry}
          driverLocation={driverLocation}
          onMapClick={handleMapClick}
          onPickupChange={(lat, lng) =>
            useTripStore.getState().setPickup({ lat, lng, address: 'Điểm đón tùy chỉnh' })
          }
          onDropoffChange={(lat, lng) =>
            useTripStore.getState().setDropoff({ lat, lng, address: 'Điểm đến tùy chỉnh' })
          }
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
