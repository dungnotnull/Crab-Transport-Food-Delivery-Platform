import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { UserRole } from '../../types/user.types';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { user, isAuthenticated } = useAuthStore();

  // Chưa đăng nhập -> Điều hướng về Login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Đã đăng nhập nhưng Role không khớp với trang yêu cầu
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Điều hướng về đúng màn hình nghiệp vụ của Role đó
    if (user.role === 'DRIVER') return <Navigate to="/driver" replace />;
    if (user.role === 'ADMIN' || user.role === 'SYSTEM_ADMIN') return <Navigate to="/admin" replace />;
    return <Navigate to="/customer" replace />;
  }

  return <Outlet />;
};
