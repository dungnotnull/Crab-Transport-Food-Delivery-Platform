import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/common/Toast';
import { Navbar } from './components/common/Navbar';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { useAuthStore } from './stores/authStore';

const LoginPage = lazy(() =>
  import('./pages/auth/LoginPage').then((module) => ({ default: module.LoginPage })),
);
const RegisterPage = lazy(() =>
  import('./pages/auth/RegisterPage').then((module) => ({ default: module.RegisterPage })),
);
const CustomerHomePage = lazy(() =>
  import('./pages/customer/CustomerHomePage').then((module) => ({ default: module.CustomerHomePage })),
);
const DriverDashboardPage = lazy(() =>
  import('./pages/driver/DriverDashboardPage').then((module) => ({ default: module.DriverDashboardPage })),
);
const AdminOverviewPage = lazy(() =>
  import('./pages/admin/AdminOverviewPage').then((module) => ({ default: module.AdminOverviewPage })),
);

const PageFallback = () => (
  <div
    role="status"
    aria-live="polite"
    className="flex flex-1 items-center justify-center p-8 text-sm font-semibold text-slate-600"
  >
    Đang tải màn hình…
  </div>
);

// Điều hướng trang chủ theo đúng Role thực tế (giống Grab App)
const RootRedirect: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'DRIVER') {
    return <Navigate to="/driver" replace />;
  }
  if (user.role === 'ADMIN' || user.role === 'SYSTEM_ADMIN') {
    return <Navigate to="/admin" replace />;
  }
  return <Navigate to="/customer" replace />;
};

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <Router>
        <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 relative">
          <Navbar />
          <main className="flex-1 flex flex-col">
            <Suspense fallback={<PageFallback />}>
              <Routes>
              {/* Trang chủ tự động chuyển đến đúng Portal của Role */}
              <Route path="/" element={<RootRedirect />} />

              {/* Public Auth Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Customer Portal (Chỉ dành cho Customer & Admin) */}
              <Route element={<ProtectedRoute allowedRoles={['CUSTOMER', 'ADMIN', 'SYSTEM_ADMIN']} />}>
                <Route path="/customer" element={<CustomerHomePage />} />
              </Route>

              {/* Driver Portal (Chỉ dành cho Driver & Admin) */}
              <Route element={<ProtectedRoute allowedRoles={['DRIVER', 'ADMIN', 'SYSTEM_ADMIN']} />}>
                <Route path="/driver" element={<DriverDashboardPage />} />
              </Route>

              {/* Admin Portal (Chỉ dành cho Admin & System Admin) */}
              <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'SYSTEM_ADMIN']} />}>
                <Route path="/admin" element={<AdminOverviewPage />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<RootRedirect />} />
              </Routes>
            </Suspense>
          </main>

        </div>
      </Router>
    </ToastProvider>
  );
};

export default App;
