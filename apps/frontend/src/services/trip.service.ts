import { apiClient } from './api';
import { ApiResponse } from '../types/api.types';
import { BookTripDto, LocationPoint, RoutePreviewData, ServiceType, Trip } from '../types/trip.types';
import {
  normalizeLocationPoint,
  normalizeRouteGeometry,
  normalizeTrip,
} from '../utils/tripNormalization.utils';

export { normalizeLocationPoint, normalizeRouteGeometry, normalizeTrip };

export const tripService = {
  /**
   * Xem trước lộ trình OSRM và tính cước phí dự kiến từ Backend DB (`POST /api/v1/trips/preview`)
   */
  async previewTrip(
    pickup: LocationPoint,
    dropoff: LocationPoint,
    vehicleType: ServiceType = 'CAR_4',
    couponCode?: string,
    signal?: AbortSignal
  ): Promise<RoutePreviewData> {
    const res = await apiClient.post<ApiResponse<any>>(
      '/trips/preview',
      {
        pickup: { lat: pickup.lat, lng: pickup.lng },
        dropoff: { lat: dropoff.lat, lng: dropoff.lng },
        vehicleType,
        coupon_code: couponCode || undefined,
      },
      { signal }
    );

    const data = res.data.data;
    const fare = Number(data?.fare ?? data?.total_fare);

    if (!data || !Number.isFinite(fare)) {
      throw new Error('API chưa trả về đủ dữ liệu tuyến đường và cước phí');
    }

    const geometry = normalizeRouteGeometry(data.geometry);

    return {
      distance: data.distance,
      duration: data.duration,
      fare,
      geometry,
      breakdown: {
        originalFare: Number(data.original_fare ?? fare),
        discount: Number(data.discount_amount ?? 0),
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
      coupon_code: dto.coupon_code || undefined,
      paymentMethod: dto.paymentMethod || 'CASH',
    });

    const data = res.data.data;
    const totalFare = Number(data?.total_fare);

    if (!data?.id || !Number.isFinite(totalFare)) {
      throw new Error('API chưa trả về đủ dữ liệu chuyến đi');
    }

    return normalizeTrip({
      id: data.id,
      customer_id: data.customer_id,
      driver_id: data.driver_id,
      pickup_location: dto.pickup,
      dropoff_location: dto.dropoff,
      status: data.status || 'FINDING_DRIVER',
      total_fare: totalFare,
      service_type: dto.vehicleType,
      payment_method: data.payment_method || dto.paymentMethod || 'CASH',
      created_at: data.created_at,
    });
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

  /**
   * Lấy chi tiết cuốc xe đang active của user hiện tại
   */
  async getActiveTrip(): Promise<Trip | null> {
    const res = await apiClient.get<ApiResponse<any>>('/trips/active');
    if (!res.data?.data) return null;
    return normalizeTrip(res.data.data);
  },

  /**
   * Lấy chi tiết 1 cuốc xe
   */
  async getTripDetails(tripId: string): Promise<Trip> {
    const res = await apiClient.get<ApiResponse<any>>(`/trips/${tripId}`);
    return normalizeTrip(res.data.data);
  },

  /**
   * Lấy lịch sử cuốc xe của customer
   */
  async getCustomerHistory(): Promise<Trip[]> {
    const res = await apiClient.get<ApiResponse<any[]>>('/trips/customer/history');
    if (!Array.isArray(res.data?.data)) return [];
    return res.data.data.map((t) => normalizeTrip(t));
  }
};
