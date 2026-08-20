import { apiClient } from './api';
import { ApiResponse } from '../types/api.types';
import { BookTripDto, LocationPoint, RoutePreviewData, ServiceType, Trip } from '../types/trip.types';

export const tripService = {
  /**
   * Xem trước lộ trình OSRM và tính cước phí dự kiến từ Backend DB (`POST /api/v1/trips/preview`)
   */
  async previewTrip(
    pickup: LocationPoint,
    dropoff: LocationPoint,
    vehicleType: ServiceType = 'CAR_4',
    couponCode?: string
  ): Promise<RoutePreviewData> {
    const res = await apiClient.post<ApiResponse<any>>('/trips/preview', {
      pickup: { lat: pickup.lat, lng: pickup.lng },
      dropoff: { lat: dropoff.lat, lng: dropoff.lng },
      vehicleType,
      coupon_code: couponCode,
    });

    const data = res.data.data;

    // Chuẩn hóa geometry từ backend (nếu backend trả về GeoJSON [lng, lat] thì chuyển sang Leaflet [lat, lng])
    let geometry: [number, number][] = [];
    if (data.geometry && Array.isArray(data.geometry)) {
      geometry = data.geometry.map((point: any) => {
        if (Array.isArray(point) && point.length >= 2) {
          // Nếu point là [lng, lat] (GeoJSON chuẩn với lng > 100), đảo lại thành [lat, lng]
          if (point[0] > point[1] && point[0] > 50) {
            return [point[1], point[0]];
          }
          return [point[0], point[1]];
        }
        return [pickup.lat, pickup.lng];
      });
    } else if (data.geometry && data.geometry.coordinates) {
      geometry = data.geometry.coordinates.map((point: any) => [point[1], point[0]]);
    }

    return {
      distance: data.distance,
      duration: data.duration,
      fare: data.fare || data.total_fare,
      geometry,
      breakdown: {
        baseFare: data.original_fare || data.fare,
        distanceFare: data.fare,
        surgeMultiplier: 1.0,
        discount: data.discount_amount || 0,
      },
    };
  },

  /**
   * Đặt chuyến đi mới vào DB Backend (`POST /api/v1/trips/book`)
   */
  async bookTrip(dto: BookTripDto): Promise<Trip> {
    const res = await apiClient.post<ApiResponse<any>>('/trips/book', {
      pickup: { lat: dto.pickup.lat, lng: dto.pickup.lng },
      dropoff: { lat: dto.dropoff.lat, lng: dto.dropoff.lng },
      vehicleType: dto.vehicleType || 'CAR_4',
      coupon_code: dto.coupon_code,
      paymentMethod: dto.paymentMethod || 'CASH',
    });

    const data = res.data.data;
    return {
      id: data.id,
      customer_id: data.customer_id,
      driver_id: data.driver_id,
      pickup_location: dto.pickup,
      dropoff_location: dto.dropoff,
      status: data.status || 'FINDING_DRIVER',
      total_fare: data.total_fare || 25000,
      service_type: dto.vehicleType,
      payment_method: data.payment_method || dto.paymentMethod || 'CASH',
      created_at: data.created_at,
    };
  },

  /**
   * Hủy chuyến đi trong DB (`POST /api/v1/trips/:id/cancel`)
   */
  async cancelTrip(tripId: string): Promise<void> {
    await apiClient.post(`/trips/${tripId}/cancel`);
  },

  /**
   * Đánh giá cuốc xe trong DB (`POST /api/v1/trips/:id/rating`)
   */
  async rateTrip(tripId: string, rating: number, feedback?: string): Promise<void> {
    await apiClient.post(`/trips/${tripId}/rating`, { rating, feedback });
  },
};
