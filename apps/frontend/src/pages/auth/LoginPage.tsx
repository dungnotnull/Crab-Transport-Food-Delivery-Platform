import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { authService } from '../../services/auth.service';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Card } from '../../components/common/Card';
import { useToast } from '../../components/common/Toast';
import { Lock, Mail, Shield, User, Car, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuthStore();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Vui lòng nhập đầy đủ Email và Mật khẩu!', 'warning');
      return;
    }

    try {
      setIsLoading(true);
      const data = await authService.login({ email, password });
      login(data.user, data.accessToken);
      showToast(`Đăng nhập thành công! Xin chào ${data.user.full_name}`, 'success');

      // Tự động điều hướng theo Role thực tế
      if (data.user.role === 'DRIVER') {
        navigate('/driver');
      } else if (data.user.role === 'ADMIN' || data.user.role === 'SYSTEM_ADMIN') {
        navigate('/admin');
      } else {
        navigate('/customer');
      }
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        'Đăng nhập thất bại, vui lòng kiểm tra lại mật khẩu!';
      showToast(errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Demo Quick-Fill Accounts khớp 100% với PostgreSQL Database Seed
  const handleQuickFill = (role: 'CUSTOMER' | 'DRIVER' | 'ADMIN') => {
    if (role === 'CUSTOMER') {
      setEmail('customer@crab.com');
      setPassword('password123');
    } else if (role === 'DRIVER') {
      setEmail('driver1@crab.com');
      setPassword('password123');
    } else {
      setEmail('admin@crab.com');
      setPassword('adminpassword'); // Khớp mật khẩu seeded trong database
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-gradient-to-b from-slate-50 to-emerald-50/40">
      <div className="w-full max-w-md">
        <Card glass className="p-8 shadow-2xl border-slate-200/80">
          {/* Logo & Header */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-3xl bg-[#00B14F] text-white flex items-center justify-center mx-auto mb-3 shadow-lg shadow-[#00B14F]/30 text-2xl">
              🛵
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Đăng Nhập Crab</h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Hệ thống đặt xe và giao hàng công nghệ thế hệ mới
            </p>
          </div>

          {/* Quick Demo Role Selector */}
          <div className="mb-5 p-2.5 bg-slate-100/90 rounded-2xl border border-slate-200/60">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block px-1 mb-1.5">
              Tài khoản mẫu từ Database (1-Click):
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickFill('CUSTOMER')}
                className="py-2 px-2 bg-white hover:bg-emerald-50 text-slate-700 hover:text-[#00B14F] rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1 border border-slate-200/60"
              >
                <User className="w-3.5 h-3.5 text-[#00B14F]" />
                Khách
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('DRIVER')}
                className="py-2 px-2 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-600 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1 border border-slate-200/60"
              >
                <Car className="w-3.5 h-3.5 text-amber-500" />
                Tài xế
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('ADMIN')}
                className="py-2 px-2 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-600 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1 border border-slate-200/60"
              >
                <Shield className="w-3.5 h-3.5 text-blue-500" />
                Admin
              </button>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              placeholder="nhap.email@crab.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              required
            />

            <Input
              label="Mật khẩu"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
              required
            />

            <Button type="submit" size="lg" isLoading={isLoading} className="w-full mt-2 font-extrabold shadow-lg">
              Đăng Nhập
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </form>

          {/* Footer Register Link */}
          <div className="text-center mt-6 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-600">
              Chưa có tài khoản?{' '}
              <Link to="/register" className="font-bold text-[#00B14F] hover:underline">
                Đăng ký ngay
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};
