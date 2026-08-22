import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { authService } from '../../services/auth.service';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Card } from '../../components/common/Card';
import { useToast } from '../../components/common/Toast';
import { Lock, Mail, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuthStore();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password) {
      showToast('Vui lòng nhập đầy đủ Email và Mật khẩu!', 'warning');
      return;
    }

    try {
      setIsLoading(true);
      const data = await authService.login({ email: normalizedEmail, password });
      login(data.user, data.accessToken);
      showToast(`Đăng nhập thành công! Xin chào ${data.user.full_name}`, 'success');

      navigateByRole(data.user.role);
    } catch (err: unknown) {
      const errorMsg = authService.getErrorMessage(
        err,
        'Đăng nhập thất bại, vui lòng kiểm tra lại mật khẩu!',
      );
      showToast(errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const navigateByRole = (role: string) => {
    if (role === 'DRIVER') {
      navigate('/driver');
    } else if (role === 'ADMIN' || role === 'SYSTEM_ADMIN') {
      navigate('/admin');
    } else {
      navigate('/customer');
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-gradient-to-b from-slate-50 to-emerald-50/40">
      <div className="w-full max-w-md">
        <Card glass className="p-8 shadow-2xl border-slate-200/80">
          {/* Logo & Header */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-3xl bg-[#00B14F] text-white flex items-center justify-center mx-auto mb-3 shadow-lg shadow-[#00B14F]/30 text-2xl">
              🚗
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Đăng Nhập CrabCar</h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Hệ thống đặt xe ô tô công nghệ 4 chỗ & 7 chỗ trực tuyến
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Email"
              name="email"
              type="email"
              placeholder="nhap.email@crab.com"
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
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
              autoComplete="current-password"
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
              <Link to="/register" className="font-bold text-[#00843D] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 rounded-sm">
                Đăng ký ngay
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};
