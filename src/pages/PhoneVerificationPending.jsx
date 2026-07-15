import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MessageCircle, Loader2 } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import AuthHeader from '../components/AuthHeader';

const POLL_INTERVAL_MS = 3000;

const PhoneVerificationPending = () => {
  const { t } = useLanguage();
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const initial = location.state || {};
  const [phone] = useState(initial.phone || null);
  const [deepLink, setDeepLink] = useState(initial.deepLink || null);
  const [devOtp, setDevOtp] = useState(initial.devOtp || null);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState(null);
  
  const completingRef = useRef(false);

  useEffect(() => {
    if (!phone) return;

    const interval = setInterval(async () => {
      try {
        const res = await axiosClient.get('/auth/phone-verification-status', { params: { phone } });
        if (res.data.verified && !completingRef.current) {
          completingRef.current = true;
          clearInterval(interval);
          const completeRes = await axiosClient.post('/auth/complete-phone-verification', { phone });
          const { token, user } = completeRes.data;
          login(token, user, true);
          showToast(t.phoneVerifySuccess, 'success');
          navigate('/farmer');
        }
      } catch {
        // transient network hiccup - keep polling
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone]);

  const handleResend = async () => {
    if (!phone) return;
    try {
      setResending(true);
      setResendMessage(null);
      const res = await axiosClient.post('/auth/resend-phone-otp', { phone });
      setResendMessage(res.data.message);
      if (res.data.deepLink) setDeepLink(res.data.deepLink);
      if (res.data.devOtp) setDevOtp(res.data.devOtp);
    } catch {
      setResendMessage(t.errorGeneric);
    } finally {
      setResending(false);
    }
  };

  const handleDevSimulateVerify = async () => {
    if (!phone) return;
    try {
      await axiosClient.post('/auth/dev-verify-phone', { phone });
    } catch {
      // the poll loop will simply keep waiting if this fails
    }
  };

  return (
    <div className="app-container">
      <AuthHeader backTo="/login" />

      <main className="registration-card" role="main">
        <div className="card-header">
          <div className="coming-soon-icon" style={{ margin: '0 auto 16px' }}>
            <MessageCircle size={26} />
          </div>
          <h1 id="screen-title" className="card-title">{t.phoneVerifyTitle}</h1>
          <p id="screen-subtitle" className="card-subtitle">{t.phoneVerifySubtitle}</p>
        </div>

        <ol className="verify-steps">
          <li>{t.phoneVerifyStep1}</li>
          <li>{t.phoneVerifyStep2}</li>
          <li>{t.phoneVerifyStep3}</li>
        </ol>

        {resendMessage && <div className="server-success" role="status">{resendMessage}</div>}

        {deepLink && (
          <a
            id="open-whatsapp-btn"
            className="submit-btn"
            style={{ textDecoration: 'none', marginBottom: 16 }}
            href={deepLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle size={18} />
            <span>{t.btnOpenWhatsApp}</span>
          </a>
        )}

        {devOtp && (
          <div className="dev-mode-note" role="note" style={{ marginBottom: 16 }}>
            <p>{t.devOtpNote}</p>
            <p style={{ fontWeight: 700, fontSize: 16 }}>{t.yourCode}: {devOtp}</p>
            <button type="button" id="dev-simulate-verify-btn" className="footer-link" onClick={handleDevSimulateVerify}>
              {t.btnDevSimulateVerify}
            </button>
          </div>
        )}

        <div className="waiting-indicator">
          <Loader2 className="spin" size={16} />
          <span>{t.waitingForVerification}</span>
        </div>

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
