import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, XCircle } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import AuthHeader from '../components/AuthHeader';

const VerifyEmail = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { login } = useAuth();
  const { showToast } = useToast();

  const [status, setStatus] = useState('verifying'); // verifying | success | failed
  const [identifier, setIdentifier] = useState('');
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState(null);
  const hasVerified = useRef(false);

  useEffect(() => {
    // Guards against React 18 StrictMode double-invoking this effect in dev,
    // which would otherwise fire the (non-idempotent) verify request twice.
    if (hasVerified.current) return;
    hasVerified.current = true;

    const verify = async () => {
      try {
        const res = await axiosClient.post(`/auth/verify-email/${token}`);
        const { token: jwt, user } = res.data;
        login(jwt, user, true);
        setStatus('success');
        showToast(t.verifySuccess, 'success');
        setTimeout(() => navigate(user.role === 'admin' ? '/admin' : '/farmer'), 1200);
      } catch {
        setStatus('failed');
      }
    };
    verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleResend = async () => {
    if (!identifier.trim()) return;
    try {
      setResending(true);
      setResendMessage(null);
      const res = await axiosClient.post('/auth/resend-verification', { identifier });
      setResendMessage(res.data.message || t.resendVerificationSuccess);
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
        {status === 'verifying' && (
          <div className="card-header" style={{ textAlign: 'center' }}>
            <Loader2 className="spin" size={32} style={{ margin: '0 auto 16px', color: 'var(--primary-green)' }} />
            <p className="card-subtitle">{t.verifyingEmail}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="card-header">
            <h1 className="card-title">{t.verifyPendingTitle}</h1>
            <p className="card-subtitle">{t.verifySuccess}</p>
          </div>
        )}

        {status === 'failed' && (
          <>
            <div className="card-header">
              <div className="coming-soon-icon" style={{ margin: '0 auto 16px', color: 'var(--error-color)' }}>
                <XCircle size={26} />
              </div>
              <h1 className="card-title">{t.verifyFailed}</h1>
              <p className="card-subtitle">{t.verifyFailedHelp}</p>
            </div>

            {resendMessage && <div className="server-success" role="status" style={{ marginBottom: 16 }}>{resendMessage}</div>}

            <div className="form-group" style={{ marginBottom: 16 }}>
              <input
                id="resend-identifier-input"
                type="text"
                className="form-input"
                style={{ paddingLeft: 16 }}
                placeholder={t.placeholderIdentifierGeneric}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>

            <button id="resend-from-failed-btn" type="button" className="submit-btn" disabled={resending} onClick={handleResend}>
              <span>{resending ? t.resendingVerification : t.btnResendVerification}</span>
            </button>
          </>
        )}
      </main>
    </div>
  );
};

export default VerifyEmail;
