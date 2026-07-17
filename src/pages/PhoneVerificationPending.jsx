import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MessageCircle, Mail, ArrowRight } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import AuthHeader from '../components/AuthHeader';

const PhoneVerificationPending = () => {
  const { t, isRtl } = useLanguage();
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const initial = location.state || {};
  const [phone] = useState(initial.phone || null);
  const [channel, setChannel] = useState(initial.channel || 'whatsapp');
  const [pendingToken, setPendingToken] = useState(initial.pendingToken || null);
  const [devOtp, setDevOtp] = useState(initial.devOtp || null);

  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState(null);
  const [loading, setLoading] = useState(false);

  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState(null);

  const handleVerify = async (e) => {
    e.preventDefault();
    const trimmed = otp.trim();
    if (!trimmed || !/^\d{6}$/.test(trimmed)) {
      setOtpError(t.errorOtpFormat);
      return;
    }
    try {
      setLoading(true);
      setOtpError(null);
      const res = await axiosClient.post('/auth/complete-phone-verification', {
        phone,
        otp: trimmed,
        pendingToken
      });
      const { token, user } = res.data;
      login(token, user, true);
      showToast(t.phoneVerifySuccess, 'success');
      navigate('/farmer');
    } catch (err) {
      setOtpError(err.response?.data?.message || t.errorGeneric);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!phone) return;
    try {
      setResending(true);
      setResendMessage(null);
      setOtp('');
      setOtpError(null);
      const res = await axiosClient.post('/auth/resend-phone-otp', { phone });
      setResendMessage(res.data.message);
      if (res.data.pendingToken) setPendingToken(res.data.pendingToken);
      if (res.data.channel) setChannel(res.data.channel);
      if (res.data.devOtp) setDevOtp(res.data.devOtp);
    } catch {
      setResendMessage(t.errorGeneric);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="app-container">
      <AuthHeader backTo="/login" />

      <main className="registration-card" role="main">
        <div className="card-header">
          <div className="coming-soon-icon" style={{ margin: '0 auto 16px' }}>
            {channel === 'email' ? <Mail size={26} /> : <MessageCircle size={26} />}
          </div>
          <h1 id="screen-title" className="card-title">{t.phoneVerifyTitle}</h1>
          <p id="screen-subtitle" className="card-subtitle">
            {channel === 'email' ? t.emailVerifyOtpSubtitle : t.phoneVerifySubtitle}
          </p>
        </div>

        {devOtp && (
          <div className="dev-mode-note" role="note" style={{ marginBottom: 16 }}>
            <p>{channel === 'email' ? t.devEmailOtpNote : t.devOtpNote}</p>
            <p style={{ fontWeight: 700, fontSize: 16 }}>{t.yourCode}: {devOtp}</p>
          </div>
        )}

        {resendMessage && <div className="server-success" role="status">{resendMessage}</div>}

        <form className="registration-form" onSubmit={handleVerify} noValidate>
          <div className="form-group">
            <input
              id="otp-input"
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              placeholder={t.placeholderOtp}
              className={`form-input ${otpError ? 'has-error' : ''}`}
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value.replace(/\D/g, ''));
                if (otpError) setOtpError(null);
              }}
              autoComplete="one-time-code"
              aria-label={t.placeholderOtp}
              style={{ textAlign: 'center', fontSize: 22, letterSpacing: 8, fontWeight: 700 }}
            />
            {otpError && <p className="error-message" role="alert">{otpError}</p>}
          </div>

          <button id="verify-otp-btn" type="submit" className="submit-btn" disabled={loading}>
            <span>{loading ? t.verifyingOtp : t.btnVerifyOtp}</span>
            {!loading && <ArrowRight size={16} style={{ transform: isRtl ? 'scaleX(-1)' : 'none' }} />}
          </button>
        </form>

        <div className="card-footer" style={{ marginTop: 20 }}>
          <button type="button" id="resend-otp-btn" className="footer-link" disabled={resending} onClick={handleResend}>
            {resending ? t.resendingVerification : t.btnResendOtp}
          </button>
        </div>

        <div className="card-footer" style={{ marginTop: 8 }}>
          <button type="button" id="back-to-login-link" className="footer-link" onClick={() => navigate('/login')}>
            {t.backToLogin}
          </button>
        </div>
      </main>
    </div>
  );
};

export default PhoneVerificationPending;
