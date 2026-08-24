import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/admin.service';
import { couponService } from '../../services/coupon.service';
import { User } from '../../types/user.types';
import type { Coupon, CreateCouponDto, UpdateCouponDto } from '../../types/coupon.types';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { formatCurrency } from '../../utils/currency.utils';
import { useToast } from '../../components/common/Toast';
import { CouponModal } from '../../components/admin/CouponModal';
import {
  Users,
  Car,
  CloudRain,
  DollarSign,
  Activity,
  RefreshCw,
  UserRound,
  Tag,
  Plus,
  Trash2,
  Edit3,
  Percent,
  Sparkles,
} from 'lucide-react';

export const AdminOverviewPage: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [customers, setCustomers] = useState<User[]>([]);
  const [drivers, setDrivers] = useState<User[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isRaining, setIsRaining] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWeatherUpdating, setIsWeatherUpdating] = useState(false);

  // Coupon modal states
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [isSubmittingCoupon, setIsSubmittingCoupon] = useState(false);
  const [deletingCouponId, setDeletingCouponId] = useState<string | null>(null);

  const { showToast } = useToast();

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [statData, custList, drvList, couponList, weatherStatus] = await Promise.all([
        adminService.getStatistics().catch(() => null),
        adminService.getCustomers().catch(() => []),
        adminService.getDrivers().catch(() => []),
        couponService.getAllCoupons().catch(() => []),
        adminService.getWeatherStatus().catch(() => null),
      ]);
      if (statData) setStats(statData);
      setCustomers(custList || []);
      setDrivers(drvList || []);
      setCoupons(couponList || []);
      if (weatherStatus !== null) setIsRaining(weatherStatus);
    } catch (err: any) {
      showToast('Lỗi tải dữ liệu từ database!', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleWeather = async () => {
    if (isRaining === null || isWeatherUpdating) return;
    const nextState = !isRaining;
    try {
      setIsWeatherUpdating(true);
      const confirmedState = await adminService.toggleWeatherSurge(nextState);
      setIsRaining(confirmedState);
      showToast(
        confirmedState
          ? 'Đã bật chế độ mưa bão: tự động áp dụng Surge Pricing +50%.'
          : 'Đã tắt chế độ mưa bão: cước phí trở lại bình thường.',
        confirmedState ? 'warning' : 'info'
      );
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Không thể đổi trạng thái thời tiết', 'error');
    } finally {
      setIsWeatherUpdating(false);
    }
  };

  const handleToggleUserStatus = async (user: User) => {
    const nextStatus = !user.is_active;
    try {
      await adminService.toggleUserActive(user.id, nextStatus);
      if (user.role === 'DRIVER') {
        setDrivers((prev) =>
          prev.map((d) => (d.id === user.id ? { ...d, is_active: nextStatus } : d))
        );
      } else {
        setCustomers((prev) =>
          prev.map((c) => (c.id === user.id ? { ...c, is_active: nextStatus } : c))
        );
      }
      showToast(`Đã ${nextStatus ? 'mở khóa' : 'khóa'} tài khoản ${user.full_name}`, 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Lỗi cập nhật trạng thái người dùng', 'error');
    }
  };

  // Coupon handlers
  const handleOpenCreateCoupon = () => {
    setEditingCoupon(null);
    setIsCouponModalOpen(true);
  };

  const handleOpenEditCoupon = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setIsCouponModalOpen(true);
  };

  const handleSubmitCoupon = async (payload: CreateCouponDto | UpdateCouponDto) => {
    try {
      setIsSubmittingCoupon(true);
      if (editingCoupon) {
        const updated = await couponService.updateCoupon(editingCoupon.id, payload);
        setCoupons((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        showToast(`Đã cập nhật thành công coupon ${updated.code}!`, 'success');
      } else {
        const created = await couponService.createCoupon(payload as CreateCouponDto);
        setCoupons((prev) => [created, ...prev]);
        showToast(`Đã tạo thành công mã giảm giá ${created.code}!`, 'success');
      }
      setIsCouponModalOpen(false);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Không thể lưu coupon. Vui lòng thử lại.', 'error');
      throw err;
    } finally {
      setIsSubmittingCoupon(false);
    }
  };

  const handleToggleCouponActive = async (coupon: Coupon) => {
    const nextStatus = !coupon.is_active;
    try {
      const updated = await couponService.toggleActiveCoupon(coupon.id, nextStatus);
      setCoupons((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      showToast(
        `Đã ${nextStatus ? 'kích hoạt' : 'tạm khóa'} mã khuyến mãi ${coupon.code}`,
        nextStatus ? 'success' : 'info'
      );
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Lỗi cập nhật trạng thái coupon', 'error');
    }
  };

  const handleDeleteCoupon = async (coupon: Coupon) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn coupon '${coupon.code}'?`)) {
      return;
    }
    try {
      setDeletingCouponId(coupon.id);
      await couponService.deleteCoupon(coupon.id);
      setCoupons((prev) => prev.filter((c) => c.id !== coupon.id));
      showToast(`Đã xóa thành công mã khuyến mãi ${coupon.code}`, 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Không thể xóa coupon', 'error');
    } finally {
      setDeletingCouponId(null);
    }
  };

  // Tính toán số liệu thực tế từ Database
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter((c) => c.is_active !== false).length;
  const totalDrivers = drivers.length;
  const onlineDrivers = drivers.filter((d) => d.driverProfile?.is_online).length;
  const totalCoupons = coupons.length;
  const activeCoupons = coupons.filter((c) => c.is_active).length;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Trung Tâm Quản Trị Hệ Thống</h1>
            <Badge variant="info" size="sm">Admin Portal</Badge>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Dữ liệu trực tiếp thời gian thực từ PostgreSQL Database & NestJS Backend
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadData}
            type="button"
            aria-busy={isLoading}
            disabled={isLoading}
            title="Làm mới dữ liệu từ Database"
            className="flex min-h-11 items-center gap-1.5 rounded-2xl border border-slate-200 p-3 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#00B14F]' : ''}`} />
            <span>Làm mới DB</span>
          </button>

          {/* Rain / Weather Surge Switch */}
          <button
            type="button"
            onClick={handleToggleWeather}
            aria-pressed={isRaining === true}
            aria-busy={isWeatherUpdating}
            disabled={isRaining === null || isWeatherUpdating}
            className={`flex min-h-11 items-center gap-2.5 rounded-2xl px-5 py-3 text-xs font-extrabold shadow-md transition-[background-color,color,box-shadow,opacity] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
              isRaining
                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/30 ring-4 ring-amber-200'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <CloudRain aria-hidden="true" className={`w-5 h-5 ${isRaining ? 'animate-bounce text-white motion-reduce:animate-none' : 'text-blue-500'}`} />
            <span>{isRaining === null ? 'CHƯA ĐỒNG BỘ THỜI TIẾT' : isRaining ? 'ĐANG BẬT MƯA BÃO (Surge +50%)' : 'THỜI TIẾT BÌNH THƯỜNG'}</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Row (Dữ liệu tính từ DB thật) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Customers */}
        <Card className="flex items-center justify-between p-5">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Khách hàng</span>
            <div className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              {stats?.totalCustomers ?? totalCustomers}
            </div>
            <p className="text-[11px] text-emerald-600 font-bold mt-1">{activeCustomers} đang hoạt động</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600">
            <Users className="w-6 h-6" />
          </div>
        </Card>

        {/* Total Drivers */}
        <Card className="flex items-center justify-between p-5">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tài xế</span>
            <div className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              {stats?.totalDrivers ?? totalDrivers}
            </div>
            <p className="text-[11px] text-amber-600 font-bold mt-1">{onlineDrivers} đang trực tuyến</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
            <Car className="w-6 h-6" />
          </div>
        </Card>

        {/* Total Trips */}
        <Card className="flex items-center justify-between p-5">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng chuyến xe</span>
            <div className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              {stats?.totalTrips ?? 0}
            </div>
            <p className="text-[11px] text-blue-600 font-bold mt-1">Hệ thống OSRM & PostGIS</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600">
            <Activity className="w-6 h-6" />
          </div>
        </Card>

        {/* Total Revenue */}
        <Card className="flex items-center justify-between p-5">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Doanh thu GMV</span>
            <div className="text-2xl font-black text-[#00B14F] tracking-tight mt-1">
              {stats?.totalRevenue ? formatCurrency(stats.totalRevenue) : '0 ₫'}
            </div>
            <p className="text-[11px] text-emerald-700 font-bold mt-1">
              {isRaining === null ? 'Chưa đồng bộ' : isRaining ? 'Surge 1.5x' : 'Giá tiêu chuẩn'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-[#00B14F]">
            <DollarSign className="w-6 h-6" />
          </div>
        </Card>

        {/* Total Coupons */}
        <Card className="flex items-center justify-between p-5">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Khuyến mãi</span>
            <div className="text-2xl font-black text-orange-600 tracking-tight mt-1">
              {totalCoupons}
            </div>
            <p className="text-[11px] text-emerald-600 font-bold mt-1">{activeCoupons} đang kích hoạt</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600">
            <Tag className="w-6 h-6" />
          </div>
        </Card>
      </div>

      {/* Coupon Management Table (Admin Feature - PostGIS & Backend Coupons) */}
      <Card className="p-6 flex flex-col gap-4 border-2 border-orange-200/80 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-500" />
                Quản Lý Mã Khuyến Mãi & Coupons (PostgreSQL `coupons`)
              </h3>
              <Badge variant="warning" size="sm">{coupons.length} Mã</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Tạo và quản lý các voucher giảm giá chuyến đi cho khách hàng
            </p>
          </div>

          <Button
            size="md"
            variant="primary"
            onClick={handleOpenCreateCoupon}
            className="font-black bg-[#FF5B00] hover:bg-[#E05000] border-transparent shadow-md text-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Mã Khuyến Mãi</span>
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-extrabold border-b border-slate-200/80">
              <tr>
                <th className="py-3 px-4">Mã Coupon</th>
                <th className="py-3 px-4">Loại & Mức Giảm</th>
                <th className="py-3 px-4">Đơn Tối Thiểu</th>
                <th className="py-3 px-4">Giảm Tối Đa</th>
                <th className="py-3 px-4">Đã Dùng / Giới Hạn</th>
                <th className="py-3 px-4">Hạn Sử Dụng</th>
                <th className="py-3 px-4">Trạng Thái</th>
                <th className="py-3 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {coupons.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-semibold">
                    Chưa có mã khuyến mãi nào trong cơ sở dữ liệu. Hãy tạo mã đầu tiên!
                  </td>
                </tr>
              ) : (
                coupons.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-black text-slate-900 bg-orange-50 border border-orange-200 text-orange-700 px-2.5 py-1 rounded-lg tracking-wider">
                        {item.code}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold">
                      {item.discount_type === 'PERCENTAGE' ? (
                        <span className="text-emerald-700 flex items-center gap-1">
                          <Percent className="w-3.5 h-3.5" /> Giảm {item.discount_value}%
                        </span>
                      ) : (
                        <span className="text-blue-700">
                          Giảm {formatCurrency(item.discount_value)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {item.min_trip_value > 0 ? formatCurrency(item.min_trip_value) : '0 ₫'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {item.max_discount ? formatCurrency(item.max_discount) : 'Không giới hạn'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-800">{item.used_count}</span>
                      <span className="text-slate-400"> / {item.usage_limit}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(item.valid_until).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={item.is_active ? 'success' : 'neutral'} size="sm">
                        {item.is_active ? 'Đang kích hoạt' : 'Tạm khóa'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleCouponActive(item)}
                          className={`text-[11px] font-bold px-2 py-1 rounded-lg border transition-colors ${
                            item.is_active
                              ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                              : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          {item.is_active ? 'Khóa' : 'Bật'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditCoupon(item)}
                          className="text-[11px] font-bold px-2 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Sửa</span>
                        </button>
                        <button
                          type="button"
                          disabled={deletingCouponId === item.id}
                          onClick={() => handleDeleteCoupon(item)}
                          className="text-[11px] font-bold px-2 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-1 disabled:opacity-50"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Xóa</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Driver Management Table (Dữ liệu trực tiếp từ PostgreSQL) */}
      <Card className="p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Car className="w-4 h-4 text-amber-500" />
              Danh Sách Đối Tác Tài Xế (PostgreSQL `users` & `driver_profiles`)
            </h3>
            <p className="text-xs text-slate-500">Quản lý hồ sơ phương tiện, biển số xe và trạng thái tài khoản</p>
          </div>
          <Badge variant="warning" size="sm">{drivers.length} Tài xế</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-extrabold border-b border-slate-200/80">
              <tr>
                <th className="py-3 px-4">Tài xế</th>
                <th className="py-3 px-4">Email / SĐT</th>
                <th className="py-3 px-4">Loại xe</th>
                <th className="py-3 px-4">Biển số</th>
                <th className="py-3 px-4">Màu sắc</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {drivers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-semibold">
                    Chưa có tài xế nào trong cơ sở dữ liệu.
                  </td>
                </tr>
              ) : (
                drivers.map((drv) => (
                  <tr key={drv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 flex items-center gap-2.5">
                      {drv.avatar_url ? (
                        <img
                          src={drv.avatar_url}
                          alt={`Ảnh đại diện của ${drv.full_name}`}
                          width={32}
                          height={32}
                          loading="lazy"
                          className="w-8 h-8 rounded-full object-cover border"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-[#00B14F] border flex items-center justify-center">
                          <UserRound className="w-4 h-4" aria-hidden="true" />
                        </div>
                      )}
                      <span className="font-bold">{drv.full_name}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{drv.phone_number || drv.email}</td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {drv.driverProfile?.vehicle_type || 'Chưa cập nhật'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="bg-slate-900 text-white font-black px-2 py-0.5 rounded text-[11px]">
                        {drv.driverProfile?.license_plate || 'Chưa cập nhật'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {drv.driverProfile?.color || 'Chưa cập nhật'}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={drv.is_active !== false ? 'success' : 'danger'} size="sm">
                        {drv.is_active !== false ? 'Hoạt động' : 'Đã khóa'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleToggleUserStatus(drv)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-colors ${
                          drv.is_active !== false
                            ? 'border-red-200 text-red-600 hover:bg-red-50'
                            : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                        }`}
                      >
                        {drv.is_active !== false ? 'Khóa' : 'Mở khóa'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Customer Management Table (Dữ liệu trực tiếp từ PostgreSQL) */}
      <Card className="p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#00B14F]" />
              Danh Sách Khách Hàng (PostgreSQL `users`)
            </h3>
            <p className="text-xs text-slate-500">Quản lý người dùng thực tế đăng ký trên hệ thống</p>
          </div>
          <Badge variant="success" size="sm">{customers.length} Khách hàng</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-extrabold border-b border-slate-200/80">
              <tr>
                <th className="py-3 px-4">Khách hàng</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Số điện thoại</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 font-semibold">
                    Chưa có khách hàng nào trong cơ sở dữ liệu.
                  </td>
                </tr>
              ) : (
                customers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 flex items-center gap-2.5">
                      {cust.avatar_url ? (
                        <img
                          src={cust.avatar_url}
                          alt={`Ảnh đại diện của ${cust.full_name}`}
                          width={32}
                          height={32}
                          loading="lazy"
                          className="w-8 h-8 rounded-full object-cover border"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-[#00B14F] border flex items-center justify-center">
                          <UserRound className="w-4 h-4" aria-hidden="true" />
                        </div>
                      )}
                      <span className="font-bold">{cust.full_name}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{cust.email}</td>
                    <td className="py-3 px-4 text-slate-600">{cust.phone_number || 'Chưa có'}</td>
                    <td className="py-3 px-4">
                      <Badge variant={cust.is_active !== false ? 'success' : 'danger'} size="sm">
                        {cust.is_active !== false ? 'Hoạt động' : 'Đã khóa'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleToggleUserStatus(cust)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-colors ${
                          cust.is_active !== false
                            ? 'border-red-200 text-red-600 hover:bg-red-50'
                            : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                        }`}
                      >
                        {cust.is_active !== false ? 'Khóa' : 'Mở khóa'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Coupon Form Modal */}
      <CouponModal
        isOpen={isCouponModalOpen}
        onClose={() => setIsCouponModalOpen(false)}
        onSubmit={handleSubmitCoupon}
        coupon={editingCoupon}
        isSubmitting={isSubmittingCoupon}
      />
    </div>
  );
};
