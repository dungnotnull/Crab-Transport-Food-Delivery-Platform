import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/common/Toast';
import { Navbar } from './components/common/Navbar';
import { DevSimulatorWidget } from './components/common/DevSimulatorWidget';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { CustomerHomePage } from './pages/customer/CustomerHomePage';
import { DriverDashboardPage } from './pages/driver/DriverDashboardPage';
import { AdminOverviewPage } from './pages/admin/AdminOverviewPage';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { useAuthStore } from './stores/authStore';

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
          </main>

          {/* Dev Simulator floating widget */}
          <DevSimulatorWidget />
        </div>
      </Router>
    </ToastProvider>
  );
};

export default App;
