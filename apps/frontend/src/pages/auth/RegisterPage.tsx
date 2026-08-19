import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { authService } from '../../services/auth.service';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { useToast } from '../../components/common/Toast';
import { Mail, Lock, User, Phone, Car, Bike, Sparkles, Image as ImageIcon, CheckCircle2 } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') === 'DRIVER' ? 'DRIVER' : 'CUSTOMER';
  const [role, setRole] = useState<'CUSTOMER' | 'DRIVER'>(initialRole);

  // Common Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150');

  // Driver Specific Fields
  const [licensePlate, setLicensePlate] = useState('59P1-88888');
  const [vehicleType, setVehicleType] = useState<'BIKE' | 'CAR'>('BIKE');
  const [vehicleBrand, setVehicleBrand] = useState('Honda Wave Alpha 110cc');
  const [color, setColor] = useState('Xanh Lá Crab');
  const [vehicleImage, setVehicleImage] = useState('https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=400');

  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuthStore();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName || !email || !phoneNumber || !password) {
      showToast('Vui lòng điền đầy đủ các thông tin bắt buộc!', 'warning');
      return;
    }

    if (role === 'DRIVER' && (!licensePlate || !vehicleBrand)) {
      showToast('Tài xế bắt buộc phải nhập biển số xe và hiệu xe!', 'warning');
      return;
    }

    try {
      setIsLoading(true);

      let data;
      if (role === 'DRIVER') {
        data = await authService.registerDriver({
          email,
          password,
          full_name: fullName,
          phone_number: phoneNumber,
          role: 'DRIVER',
          avatar_url: avatarUrl,
          license_plate: licensePlate,
          vehicle_type: vehicleType,
          vehicle_brand: vehicleBrand,
          color,
          vehicle_image: vehicleImage,
        });
      } else {
        data = await authService.registerCustomer({
          email,
          password,
          full_name: fullName,
          phone_number: phoneNumber,
          role: 'CUSTOMER',
          avatar_url: avatarUrl,
        });
      }

      login(data.user, data.accessToken);
      showToast(`Đăng ký thành công! Chào mừng ${data.user.full_name} gia nhập Crab`, 'success');

      if (role === 'DRIVER') {
        navigate('/driver');
      } else {
        navigate('/customer');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Đăng ký thất bại, vui lòng thử lại!', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-gradient-to-b from-slate-50 to-emerald-50/40 py-10">
      <div className="w-full max-w-xl">
        <Card glass className="p-8 shadow-2xl border-slate-200/80">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-[#00B14F] text-white flex items-center justify-center mx-auto mb-2.5 shadow-md shadow-[#00B14F]/30 text-2xl">
              🛵
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Tạo Tài Khoản Mới</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Trải nghiệm đặt xe và đối tác tài xế thông minh cùng Crab
            </p>
          </div>

          {/* Role Toggle Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100/80 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => setRole('CUSTOMER')}
              className={`py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
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
              className={`py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
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
                1. Thông tin cá nhân
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Input
                label="Họ và tên"
                placeholder="Nguyễn Văn A"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                leftIcon={<User className="w-4 h-4" />}
                required
              />

              <Input
                label="Số điện thoại"
                placeholder="0987654321"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                leftIcon={<Phone className="w-4 h-4" />}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Input
                label="Email"
                type="email"
                placeholder="nhap.email@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4" />}
                required
              />

              <Input
                label="Mật khẩu"
                type="password"
                placeholder="Tối thiểu 6 ký tự"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
                required
              />
            </div>

            {/* Section 2: Driver Vehicle Info (Only if Role = DRIVER) */}
            {role === 'DRIVER' && (
              <div className="flex flex-col gap-4 mt-2 p-4 bg-amber-50/50 rounded-2xl border border-amber-200/70 animate-in fade-in duration-200">
                <div className="flex items-center justify-between pb-1 border-b border-amber-200/50">
                  <span className="text-xs font-extrabold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Car className="w-4 h-4 text-amber-600" />
                    2. Thông tin phương tiện & Hình ảnh
                  </span>
                  <Badge variant="warning" size="sm">Bắt buộc cho tài xế</Badge>
                </div>

                {/* Vehicle Type Selector */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Loại phương tiện
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setVehicleType('BIKE')}
                      className={`p-2.5 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                        vehicleType === 'BIKE'
                          ? 'border-[#00B14F] bg-emerald-50 text-[#00B14F]'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      <Bike className="w-4 h-4" />
                      Xe Máy (CrabBike)
                    </button>
                    <button
                      type="button"
                      onClick={() => setVehicleType('CAR')}
                      className={`p-2.5 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                        vehicleType === 'CAR'
                          ? 'border-[#00B14F] bg-emerald-50 text-[#00B14F]'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      <Car className="w-4 h-4" />
                      Ô Tô (CrabCar)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Biển số xe"
                    placeholder="VD: 59P1-88888"
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value)}
                    required
                  />

                  <Input
                    label="Hiệu xe / Dòng xe"
                    placeholder="VD: Honda Wave Alpha, Vision, Vios"
                    value={vehicleBrand}
                    onChange={(e) => setVehicleBrand(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Màu sắc xe"
                    placeholder="VD: Xanh Lá, Trắng, Đen"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                  />

                  <Input
                    label="Link ảnh xe (Mock URL)"
                    placeholder="https://..."
                    value={vehicleImage}
                    onChange={(e) => setVehicleImage(e.target.value)}
                    leftIcon={<ImageIcon className="w-4 h-4" />}
                  />
                </div>

                {/* Photo Previews */}
                <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-amber-200/50">
                  <img
                    src={vehicleImage}
                    alt="Vehicle Preview"
                    className="w-16 h-12 object-cover rounded-lg border border-slate-200 shrink-0"
                  />
                  <div className="text-xs">
                    <p className="font-bold text-slate-800">Xem trước ảnh phương tiện</p>
                    <p className="text-[11px] text-slate-500">Hình ảnh giúp khách hàng dễ dàng nhận diện xe của bạn.</p>
                  </div>
                </div>
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
