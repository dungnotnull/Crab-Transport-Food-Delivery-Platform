import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Button } from './Button';
import { Badge } from './Badge';
import { LogOut, Shield, Car, UserRound } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo & Portal Identity */}
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-2xl bg-[#00B14F] flex items-center justify-center text-white shadow-md shadow-[#00B14F]/30 group-hover:scale-105 transition-transform">
              <span className="text-xl">
                {user?.role === 'DRIVER' ? '🚗' : user?.role === 'ADMIN' ? '🛡️' : '🚗'}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-extrabold text-slate-900 tracking-tight">CrabCar</span>
                <span className="text-xs font-bold text-[#00B14F] bg-emerald-50 px-1.5 py-0.5 rounded-md uppercase">
                  {user?.role === 'DRIVER'
                    ? 'Driver App'
                    : user?.role === 'ADMIN'
                    ? 'Admin Portal'
                    : 'Ride Hailing'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium leading-none">
                {user?.role === 'DRIVER'
                  ? 'Ứng dụng Đối tác Tài xế'
                  : user?.role === 'ADMIN'
                  ? 'Hệ thống Quản trị Vận hành'
                  : 'Nền tảng Đặt xe 4 Chỗ & 7 Chỗ'}
              </p>
            </div>
          </Link>
        </div>

        {/* Role-Specific Navigation (CHỈ hiển thị Menu đúng với Role của tài khoản đang đăng nhập) */}
        {isAuthenticated && user && (
          <nav className="hidden sm:flex items-center gap-1.5">
            {/* Customer Role Menu */}
            {user.role === 'CUSTOMER' && (
              <div className="flex items-center gap-2 bg-emerald-50 text-[#00B14F] px-3.5 py-1.5 rounded-xl font-extrabold text-xs">
                <Car className="w-3.5 h-3.5 text-[#00B14F]" />
                <span>Đặt Xe CrabCar</span>
              </div>
            )}

            {/* Driver Role Menu */}
            {user.role === 'DRIVER' && (
              <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-3.5 py-1.5 rounded-xl font-extrabold text-xs">
                <Car className="w-3.5 h-3.5 text-amber-600" />
                <span>Bảng Điều Khiển Tài Xế (Online / Offline)</span>
              </div>
            )}

            {/* Admin Role Menu */}
            {(user.role === 'ADMIN' || user.role === 'SYSTEM_ADMIN') && (
              <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3.5 py-1.5 rounded-xl font-extrabold text-xs">
                <Shield className="w-3.5 h-3.5 text-blue-600" />
                <span>Trung Tâm Quản Trị Hệ Thống CMS</span>
              </div>
            )}
          </nav>
        )}

        {/* Auth Profile / Action */}
        <div className="flex items-center gap-3">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200/80 p-1.5 pr-3 rounded-2xl">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={`Ảnh đại diện của ${user.full_name}`}
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-xl object-cover border border-[#00B14F]"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#00B14F] border border-emerald-200 flex items-center justify-center">
                    <UserRound className="w-4 h-4" aria-hidden="true" />
                  </div>
                )}
                <div className="text-left">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="truncate max-w-[110px]">{user.full_name}</span>
                    <Badge
                      variant={
                        user.role === 'ADMIN' || user.role === 'SYSTEM_ADMIN'
                          ? 'info'
                          : user.role === 'DRIVER'
                          ? 'warning'
                          : 'success'
                      }
                      size="sm"
                    >
                      {user.role}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate max-w-[140px]">{user.email}</p>
                </div>
              </div>

              {/* Logout button */}
              <button
                type="button"
                aria-label="Đăng xuất khỏi hệ thống"
                onClick={handleLogout}
                title="Đăng xuất khỏi hệ thống"
                className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Đăng nhập
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm">Đăng ký</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
