import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/admin.service';
import { User } from '../../types/user.types';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { formatCurrency } from '../../utils/currency.utils';
import { useToast } from '../../components/common/Toast';
import { Shield, Users, Car, CloudRain, Star, DollarSign, Activity, RefreshCw } from 'lucide-react';

export const AdminOverviewPage: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [customers, setCustomers] = useState<User[]>([]);
  const [drivers, setDrivers] = useState<User[]>([]);
  const [isRaining, setIsRaining] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [statData, custList, drvList] = await Promise.all([
        adminService.getStatistics().catch(() => null),
        adminService.getCustomers(),
        adminService.getDrivers(),
      ]);
      if (statData) setStats(statData);
      setCustomers(custList || []);
      setDrivers(drvList || []);
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
    const nextState = !isRaining;
    try {
      await adminService.toggleWeatherSurge(nextState);
      setIsRaining(nextState);
      showToast(
        nextState
          ? '🌧️ ĐÃ BẬT Chế độ Mưa bão: Tự động kích hoạt Surge Pricing +50% cước phí!'
          : '☀️ ĐÃ TẮT Chế độ Mưa bão: Cước phí trở lại bình thường.',
        nextState ? 'warning' : 'info'
      );
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Không thể đổi trạng thái thời tiết', 'error');
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

  // Tính toán số liệu thực tế từ Database
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter((c) => c.is_active !== false).length;
  const totalDrivers = drivers.length;
  const onlineDrivers = drivers.filter((d) => d.driverProfile?.is_online).length;

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
            Dữ liệu trực tiếp thời gian thực từ PostgreSQL Database
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadData}
            title="Làm mới dữ liệu từ Database"
            className="p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors flex items-center gap-1.5 text-xs font-bold"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#00B14F]' : ''}`} />
            <span>Làm mới DB</span>
          </button>

          {/* Rain / Weather Surge Switch */}
          <button
            onClick={handleToggleWeather}
            className={`px-5 py-3 rounded-2xl font-extrabold text-xs flex items-center gap-2.5 transition-all shadow-md ${
              isRaining
                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/30 ring-4 ring-amber-200'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <CloudRain className={`w-5 h-5 ${isRaining ? 'animate-bounce text-white' : 'text-blue-500'}`} />
            <span>{isRaining ? '🌧️ ĐANG BẬT MƯA BÃO (Surge +50%)' : '☀️ THỜI TIẾT BÌNH THƯỜNG'}</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Row (Dữ liệu tính từ DB thật) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Customers */}
        <Card className="flex items-center justify-between p-5">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng khách hàng (DB)</span>
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
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng tài xế (DB)</span>
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
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng chuyến xe (DB)</span>
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
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng doanh thu (GMV)</span>
            <div className="text-2xl font-black text-[#00B14F] tracking-tight mt-1">
              {stats?.totalRevenue ? formatCurrency(stats.totalRevenue) : '0 ₫'}
            </div>
            <p className="text-[11px] text-emerald-700 font-bold mt-1">
              {isRaining ? '🌧️ Đang áp dụng Surge 1.5x' : '☀️ Giá cước tiêu chuẩn'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-[#00B14F]">
            <DollarSign className="w-6 h-6" />
          </div>
        </Card>
      </div>

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
                      <img
                        src={drv.avatar_url || 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=80'}
                        alt={drv.full_name}
                        className="w-8 h-8 rounded-full object-cover border"
                      />
                      <span className="font-bold">{drv.full_name}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{drv.phone_number || drv.email}</td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {drv.driverProfile?.vehicle_type || 'BIKE'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="bg-slate-900 text-white font-black px-2 py-0.5 rounded text-[11px]">
                        {drv.driverProfile?.license_plate || 'Chưa cập nhật'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {drv.driverProfile?.color || 'Xanh Lá'}
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
                      <img
                        src={cust.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80'}
                        alt={cust.full_name}
                        className="w-8 h-8 rounded-full object-cover border"
                      />
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
    </div>
  );
};
