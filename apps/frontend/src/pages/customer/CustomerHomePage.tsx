import React, { useState } from 'react';
import { useTripStore } from '../../stores/tripStore';
import { CrabMap } from '../../components/map/CrabMap';
import { BookingPanel } from '../../components/customer/BookingPanel';
import { FindingRadarModal } from '../../components/customer/FindingRadarModal';
import { TripBottomSheet } from '../../components/customer/TripBottomSheet';
import { RatingModal } from '../../components/customer/RatingModal';
import { useToast } from '../../components/common/Toast';

export const CustomerHomePage: React.FC = () => {
  const {
    pickup,
    dropoff,
    routePreview,
    driverLocation,
    activeTrip,
    isSearchingDriver,
    setDropoff,
    setIsSearchingDriver,
    resetBooking,
  } = useTripStore();

  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const { showToast } = useToast();

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

  const handleCancelSearch = () => {
    setIsSearchingDriver(false);
    resetBooking();
    showToast('Đã hủy tìm kiếm tài xế', 'warning');
  };

  const handleCancelTrip = () => {
    resetBooking();
    showToast('Đã hủy chuyến đi thành công', 'warning');
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
          onDriverFoundMock={() => {
            setIsSearchingDriver(false);
          }}
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
