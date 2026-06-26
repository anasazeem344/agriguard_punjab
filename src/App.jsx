import { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { authEvents } from './api/authEvents';
import { useAuth } from './context/AuthContext';
import { useToast } from './context/ToastContext';
import { useLanguage } from './context/LanguageContext';
import RoleSelection from './pages/RoleSelection';
import AdminRegistration from './pages/AdminRegistration';
import FarmerRegistration from './pages/FarmerRegistration';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import EmailVerificationPending from './pages/EmailVerificationPending';
import VerifyEmail from './pages/VerifyEmail';
import PhoneVerificationPending from './pages/PhoneVerificationPending';
import Settings from './pages/Settings';
import ProtectedRoute from './components/ProtectedRoute';
import ComingSoon from './components/ComingSoon';
import AdminLayout from './pages/admin/AdminLayout';
import ManageFarmers from './pages/admin/ManageFarmers';
import FarmerLayout from './pages/farmer/FarmerLayout';
import Overview from './pages/farmer/Overview';
import './App.css';

const SessionWatcher = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { showToast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
      showToast(t.sessionExpiredToast, 'info');
      navigate('/login');
    };
    authEvents.addEventListener('unauthorized', handleUnauthorized);
    return () => authEvents.removeEventListener('unauthorized', handleUnauthorized);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};

function App() {
  return (
    <>
      <SessionWatcher />
      <Routes>
      <Route path="/" element={<RoleSelection />} />
      <Route path="/register/admin" element={<AdminRegistration />} />
      <Route path="/register/farmer" element={<FarmerRegistration />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/verify-email-pending" element={<EmailVerificationPending />} />
      <Route path="/verify-email/:token" element={<VerifyEmail />} />
      <Route path="/verify-phone-pending" element={<PhoneVerificationPending />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute role="admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ManageFarmers />} />
        <Route path="dashboard" element={<ComingSoon />} />
        <Route path="global-sensors" element={<ComingSoon />} />
        <Route path="system-analytics" element={<ComingSoon />} />
        <Route path="reports" element={<ComingSoon />} />
        <Route path="settings" element={<Settings />} />
        <Route path="help" element={<ComingSoon />} />
        <Route path="support" element={<ComingSoon />} />
      </Route>

      <Route
        path="/farmer"
        element={
          <ProtectedRoute role="farmer">
            <FarmerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Overview />} />
        <Route path="iot-sensors" element={<ComingSoon />} />
        <Route path="ai-diagnostics" element={<ComingSoon />} />
        <Route path="alerts" element={<ComingSoon />} />
        <Route path="reports" element={<ComingSoon />} />
        <Route path="settings" element={<Settings />} />
        <Route path="help" element={<ComingSoon />} />
        <Route path="support" element={<ComingSoon />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
