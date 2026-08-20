import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { authService } from '../../services/auth.service';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { useToast } from '../../components/common/Toast';
import { Mail, Lock, User, Phone, Car, Upload, CheckCircle2, X } from 'lucide-react';
import { VehicleType } from '../../types/user.types';
import { optimizeImageFile } from '../../utils/image.utils';

export const RegisterPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') === 'DRIVER' ? 'DRIVER' : 'CUSTOMER';
  const [role, setRole] = useState<'CUSTOMER' | 'DRIVER'>(initialRole);

  // Common Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [avatarData, setAvatarData] = useState<string>('');

  // Driver Specific Fields
  const [licensePlate, setLicensePlate] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('CAR_4');
  const [vehicleBrand, setVehicleBrand] = useState('');
  const [color, setColor] = useState('');
  const [vehicleImageData, setVehicleImageData] = useState<string>('');

  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuthStore();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        showToast('Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, JPEG)!', 'warning');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showToast('Kích thước ảnh tối đa là 5MB!', 'warning');
        return;
      }
      try {
        setAvatarData(await optimizeImageFile(file, 30 * 1024));
        showToast('Đã tải ảnh đại diện thành công!', 'success');
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Không thể xử lý ảnh đại diện', 'error');
      }
    }
  };

  const handleVehicleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        showToast('Vui lòng chọn tệp hình ảnh xe hợp lệ!', 'warning');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showToast('Kích thước ảnh xe tối đa là 5MB!', 'warning');
        return;
      }
      try {
        setVehicleImageData(await optimizeImageFile(file, 30 * 1024));
        showToast('Đã tải ảnh phương tiện thành công!', 'success');
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Không thể xử lý ảnh phương tiện', 'error');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedFullName = fullName.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhoneNumber = phoneNumber.trim();
    const normalizedLicensePlate = licensePlate.trim();
    const normalizedVehicleBrand = vehicleBrand.trim();

    if (!normalizedFullName || !normalizedEmail || !normalizedPhoneNumber || !password) {
      showToast('Vui lòng điền đầy đủ các thông tin bắt buộc!', 'warning');
      return;
    }

    if (password.length < 6) {
      showToast('Mật khẩu phải có ít nhất 6 ký tự!', 'warning');
      return;
    }

    if (role === 'DRIVER' && (!normalizedLicensePlate || !normalizedVehicleBrand)) {
      showToast('Tài xế bắt buộc phải nhập biển số xe và hiệu xe!', 'warning');
      return;
    }

    try {
      setIsLoading(true);

      let data;
      if (role === 'DRIVER') {
        data = await authService.registerDriver({
          email: normalizedEmail,
          password,
          full_name: normalizedFullName,
          phone_number: normalizedPhoneNumber,
          role: 'DRIVER',
          avatar_url: avatarData || undefined,
          license_plate: normalizedLicensePlate,
          vehicle_type: vehicleType,
          vehicle_brand: normalizedVehicleBrand,
          color: color.trim() || undefined,
          vehicle_image: vehicleImageData || undefined,
        });
      } else {
        data = await authService.registerCustomer({
          email: normalizedEmail,
          password,
          full_name: normalizedFullName,
          phone_number: normalizedPhoneNumber,
          role: 'CUSTOMER',
          avatar_url: avatarData || undefined,
        });
      }

      login(data.user, data.accessToken);
      showToast(`Đăng ký thành công! Chào mừng ${data.user.full_name} gia nhập CrabCar`, 'success');

      if (role === 'DRIVER') {
        navigate('/driver');
      } else {
        navigate('/customer');
      }
    } catch (err: unknown) {
      showToast(
        authService.getErrorMessage(err, 'Đăng ký thất bại, vui lòng kiểm tra lại thông tin!'),
        'error',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-gradient-to-b from-slate-50 via-emerald-50/30 to-slate-100 py-10">
      <div className="w-full max-w-xl">
        <Card glass className="p-8 shadow-2xl border-slate-200/80">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-[#00B14F] text-white flex items-center justify-center mx-auto mb-2.5 shadow-md shadow-[#00B14F]/30 text-2xl">
              🚗
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Đăng Ký Tài Khoản CrabCar</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Nền tảng đặt xe công nghệ trực tuyến CrabCar 4 Chỗ & 7 Chỗ
            </p>
          </div>

          {/* Role Toggle Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100/80 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => setRole('CUSTOMER')}
              aria-pressed={role === 'CUSTOMER'}
              className={`py-2.5 rounded-xl text-xs font-extrabold transition-[background-color,color,box-shadow] flex items-center justify-center gap-2 ${
                role === 'CUSTOMER'
                  ? 'bg-white text-slate-900 shadow-md shadow-slate-200/60'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <User className="w-4 h-4 text-[#00B14F]" />
              Khách Hàng (Customer)
            </button>
            <button
              type="button"
              onClick={() => setRole('DRIVER')}
              aria-pressed={role === 'DRIVER'}
              className={`py-2.5 rounded-xl text-xs font-extrabold transition-[background-color,color,box-shadow] flex items-center justify-center gap-2 ${
                role === 'DRIVER'
                  ? 'bg-white text-slate-900 shadow-md shadow-slate-200/60'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Car className="w-4 h-4 text-amber-500" />
              Đối Tác Tài Xế (Driver)
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Section 1: Personal Info */}
            <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
              <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                1. Thông tin cá nhân & Ảnh đại diện
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Input
                label="Họ và tên"
                name="full_name"
                placeholder="Nguyễn Văn A"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                leftIcon={<User className="w-4 h-4" />}
                autoComplete="name"
                required
              />

              <Input
                label="Số điện thoại"
                name="phone_number"
                placeholder="0987654321"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                leftIcon={<Phone className="w-4 h-4" />}
                autoComplete="tel"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Input
                label="Email"
                name="email"
                type="email"
                placeholder="nhap.email@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4" />}
                autoComplete="email"
                spellCheck={false}
                required
              />

              <Input
                label="Mật khẩu"
                name="password"
                type="password"
                placeholder="Tối thiểu 6 ký tự"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
                autoComplete="new-password"
                required
              />
            </div>

            {/* Direct Avatar File Upload */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {avatarData ? (
                  <div className="relative">
                    <img
                      src={avatarData}
                      alt="Avatar Preview"
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-[#00B14F] shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setAvatarData('')}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-sm hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100/70 border border-emerald-200 flex items-center justify-center text-[#00B14F]">
                    <User className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold text-slate-800">Ảnh đại diện cá nhân</p>
                  <p className="text-[11px] text-slate-500">Tải ảnh trực tiếp từ máy (PNG, JPG, max 5MB)</p>
                </div>
              </div>

              <label className="cursor-pointer shrink-0">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileChange}
                  className="hidden"
                />
                <span className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 shadow-xs flex items-center gap-1.5 transition-colors">
                  <Upload className="w-3.5 h-3.5 text-[#00B14F]" />
                  {avatarData ? 'Đổi ảnh' : 'Chọn tệp ảnh'}
                </span>
              </label>
            </div>

            {/* Section 2: Driver Vehicle Info (Only if Role = DRIVER) */}
            {role === 'DRIVER' && (
              <div className="flex flex-col gap-4 mt-2 p-4 bg-amber-50/50 rounded-2xl border border-amber-200/70 animate-in fade-in duration-200">
                <div className="flex items-center justify-between pb-1 border-b border-amber-200/50">
                  <span className="text-xs font-extrabold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Car className="w-4 h-4 text-amber-600" />
                    2. Thông tin xe & Hình ảnh phương tiện
                  </span>
                  <Badge variant="warning" size="sm">Bắt buộc cho tài xế</Badge>
                </div>

                {/* Vehicle Type Selector: BIKE, CAR_4, CAR_7 */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Loại phương tiện đăng ký
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setVehicleType('BIKE')}
                      className={`p-2.5 rounded-xl border-2 font-bold text-xs flex flex-col items-center justify-center gap-1 transition-[background-color,border-color,box-shadow,color] ${
                        vehicleType === 'BIKE'
                          ? 'border-[#00B14F] bg-emerald-50 text-[#00B14F] shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-xl">🛵</span>
                      <span>CrabBike</span>
                      <span className="text-[10px] font-normal text-slate-500">Xe máy 2 bánh</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVehicleType('CAR_4')}
                      className={`p-2.5 rounded-xl border-2 font-bold text-xs flex flex-col items-center justify-center gap-1 transition-[background-color,border-color,box-shadow,color] ${
                        vehicleType === 'CAR_4'
                          ? 'border-[#00B14F] bg-emerald-50 text-[#00B14F] shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-xl">🚗</span>
                      <span>CrabCar 4C</span>
                      <span className="text-[10px] font-normal text-slate-500">Sedan 4 chỗ</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVehicleType('CAR_7')}
                      className={`p-2.5 rounded-xl border-2 font-bold text-xs flex flex-col items-center justify-center gap-1 transition-[background-color,border-color,box-shadow,color] ${
                        vehicleType === 'CAR_7'
                          ? 'border-[#00B14F] bg-emerald-50 text-[#00B14F] shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-xl">🚙</span>
                      <span>CrabCar 7C</span>
                      <span className="text-[10px] font-normal text-slate-500">SUV/MPV 7 chỗ</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Biển số xe"
                    name="license_plate"
                    placeholder="VD: 51H-888.88"
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value)}
                    required
                  />

                  <Input
                    label="Hiệu xe / Dòng xe"
                    name="vehicle_brand"
                    placeholder="VD: Toyota Vios, Xpander, Accent"
                    value={vehicleBrand}
                    onChange={(e) => setVehicleBrand(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Màu sắc xe"
                    name="color"
                    placeholder="VD: Trắng Ánh Kim, Đen, Bạc"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                  />

                  {/* Vehicle Image Upload */}
                  <div className="flex flex-col justify-end">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Ảnh chụp phương tiện
                    </label>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleVehicleFileChange}
                        className="hidden"
                      />
                      <span className="w-full h-11 px-3.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 shadow-xs flex items-center justify-center gap-2 transition-colors">
                        <Upload className="w-4 h-4 text-amber-500" />
                        {vehicleImageData ? 'Đã tải ảnh (Bấm để đổi)' : 'Tải ảnh xe từ máy'}
                      </span>
                    </label>
                  </div>
                </div>

                {/* Vehicle Photo Preview */}
                {vehicleImageData && (
                  <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-amber-200/80">
                    <img
                      src={vehicleImageData}
                      alt="Vehicle Preview"
                      className="w-20 h-14 object-cover rounded-lg border border-slate-200 shrink-0"
                    />
                    <div className="text-xs">
                      <p className="font-bold text-slate-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#00B14F]" />
                        Ảnh xe đã sẵn sàng
                      </p>
                      <p className="text-[11px] text-slate-500">Khách hàng sẽ nhìn thấy ảnh xe khi khớp lệnh chuyến đi.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <Button type="submit" size="lg" isLoading={isLoading} className="w-full mt-3 font-extrabold shadow-lg">
              Hoàn Tất Đăng Ký
            </Button>
          </form>

          {/* Footer Login Link */}
          <div className="text-center mt-6 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-600">
              Đã có tài khoản?{' '}
              <Link to="/login" className="font-bold text-[#00B14F] hover:underline">
                Đăng nhập tại đây
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};
