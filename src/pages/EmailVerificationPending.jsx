import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { useLanguage } from '../context/LanguageContext';
import AuthHeader from '../components/AuthHeader';

const EmailVerificationPending = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { email, devVerificationUrl: initialDevUrl } = location.state || {};

  const [devVerificationUrl, setDevVerificationUrl] = useState(initialDevUrl || null);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState(null);

  const handleResend = async () => {
    if (!email) return;
    try {
      setResending(true);
      setMessage(null);
      const res = await axiosClient.post('/auth/resend-verification', { identifier: email });
      setMessage(res.data.message || t.resendVerificationSuccess);
      if (res.data.devVerificationUrl) setDevVerificationUrl(res.data.devVerificationUrl);
    } catch {
      setMessage(t.errorGeneric);
    } finally {
      setResending(false);
    }
  };

  const devToken = devVerificationUrl ? devVerificationUrl.split('/verify-email/')[1] : null;

  return (
    <div className="app-container">
      <AuthHeader backTo="/login" />

      <main className="registration-card" role="main">
        <div className="card-header">
          <div className="coming-soon-icon" style={{ margin: '0 auto 16px' }}>
            <MailCheck size={26} />
          </div>
          <h1 id="screen-title" className="card-title">{t.verifyPendingTitle}</h1>
          <p id="screen-subtitle" className="card-subtitle">
            {t.verifyPendingSubtitle.replace('{email}', email || '')}
          </p>
        </div>

        {message && <div className="server-success" role="status" style={{ marginBottom: 16 }}>{message}</div>}

        {devVerificationUrl && (
          <div className="dev-mode-note" role="note" style={{ marginBottom: 16 }}>
            <p>{t.devVerifyNote}</p>
            <button type="button" id="dev-verify-link-btn" className="footer-link" onClick={() => navigate(`/verify-email/${devToken}`)}>
              {devVerificationUrl}
            </button>
          </div>
        )}

        <button id="resend-verification-btn" type="button" className="submit-btn" disabled={resending || !email} onClick={handleResend}>
          <span>{resending ? t.resendingVerification : t.btnResendVerification}</span>
        </button>

        <div className="card-footer" style={{ marginTop: 20 }}>
          <button type="button" id="back-to-login-link" className="footer-link" onClick={() => navigate('/login')}>
            {t.backToLogin}
          </button>
        </div>
      </main>
    </div>
  );
};

export default EmailVerificationPending;
