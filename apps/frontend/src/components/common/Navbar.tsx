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
    <header className="sticky top-0 z-40 w-full overflow-x-clip bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-xs">
      <div className="mx-auto flex h-16 min-w-0 max-w-7xl items-center justify-between gap-2 px-3 sm:px-6">
        {/* Logo & Portal Identity */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Link to="/" className="group flex min-w-0 items-center gap-2 sm:gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#00B14F] text-white shadow-md shadow-[#00B14F]/30 transition-transform group-hover:scale-105 sm:h-10 sm:w-10 sm:rounded-2xl">
              {user?.role === 'ADMIN' || user?.role === 'SYSTEM_ADMIN' ? (
                <Shield className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Car className="h-5 w-5" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">CrabCar</span>
                <span className="hidden rounded-md bg-emerald-50 px-1.5 py-0.5 text-xs font-bold uppercase text-[#00B14F] md:inline-flex">
                  {user?.role === 'DRIVER'
                    ? 'Driver App'
                    : user?.role === 'ADMIN'
                    ? 'Admin Portal'
                    : 'Ride Hailing'}
                </span>
              </div>
              <p className="hidden text-[10px] font-medium leading-none text-slate-400 md:block">
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
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2.5 rounded-2xl border border-slate-200/80 bg-slate-50 p-1.5 sm:pr-3">
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
                <div className="hidden text-left sm:block">
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
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 sm:h-9 sm:w-9"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
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
