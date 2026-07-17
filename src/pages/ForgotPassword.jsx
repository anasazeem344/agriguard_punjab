import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IdCard, Mail, Phone, ArrowRight, MessageCircle } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { useLanguage } from '../context/LanguageContext';
import AuthHeader from '../components/AuthHeader';
import { isValidEmailFormat, isValidPhoneFormat } from '../utils/validators';

// step: 'method'  → choose WhatsApp or Email
//       'form'    → enter identifier (phone or email depending on method)
//       'otp'     → enter WhatsApp OTP (WhatsApp path only)
//       'sent'    → email reset link sent (Email path only)

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { t, isRtl } = useLanguage();

  const [step, setStep] = useState('method');
  const [method, setMethod] = useState(null); // 'whatsapp' | 'email'

  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [devResetUrl, setDevResetUrl] = useState(null);

  // OTP step state
  const [otpPhone, setOtpPhone] = useState(null);
  const [pendingToken, setPendingToken] = useState(null);
  const [devOtp, setDevOtp] = useState(null);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState(null);

  const chooseMethod = (m) => {
    setMethod(m);
    setIdentifier('');
    setError(null);
    setStep('form');
  };

  const handleIdentifierSubmit = async (e) => {
    e.preventDefault();
    const trimmed = identifier.trim();
    if (!trimmed) { setError(t.errorRequired); return; }

    if (method === 'whatsapp') {
      if (!isValidPhoneFormat(trimmed)) { setError(t.errorPhone); return; }
    } else {
      if (!isValidEmailFormat(trimmed)) { setError(t.errorEmail); return; }
    }

    try {
      setLoading(true);
      setError(null);
      const res = await axiosClient.post('/auth/forgot-password', {
        identifier: trimmed
      });

      if (res.data.channel === 'whatsapp' && res.data.pendingToken) {
        setOtpPhone(res.data.phone);
        setPendingToken(res.data.pendingToken);
        if (res.data.devOtp) setDevOtp(res.data.devOtp);
        setStep('otp');
      } else {
        setMessage(res.data.message);
        if (res.data.devResetUrl) setDevResetUrl(res.data.devResetUrl);
        setStep('sent');
      }
    } catch (err) {
      setError(err.response?.data?.message || t.errorGeneric);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    const trimmed = otp.trim();
    if (!trimmed || !/^\d{6}$/.test(trimmed)) { setOtpError(t.errorOtpFormat); return; }
    try {
      setLoading(true);
      setOtpError(null);
      const res = await axiosClient.post('/auth/verify-forgot-otp', {
        phone: otpPhone,
        otp: trimmed,
        pendingToken
      });
      navigate(`/reset-password/${res.data.resetToken}`);
    } catch (err) {
      setOtpError(err.response?.data?.message || t.errorGeneric);
    } finally {
      setLoading(false);
    }
  };

  const devToken = devResetUrl ? devResetUrl.split('/reset-password/')[1] : null;

  return (
    <div className="app-container">
      <AuthHeader backTo="/login" />

      <main className="registration-card" role="main">
        <div className="card-header">
          <h1 id="screen-title" className="card-title">{t.forgotTitle}</h1>
          {step === 'method' && <p id="screen-subtitle" className="card-subtitle">{t.forgotMethodTitle}</p>}
          {step === 'form'   && <p id="screen-subtitle" className="card-subtitle">{t.forgotSubtitle}</p>}
          {step === 'otp'    && <p id="screen-subtitle" className="card-subtitle">{t.forgotOtpSubtitle}</p>}
        </div>

        {/* ── Step 1: choose method ── */}
        {step === 'method' && (
          <div className="method-choice-group">
            <button type="button" className="method-choice-card" onClick={() => chooseMethod('whatsapp')}>
              <MessageCircle size={28} className="method-choice-icon" />
              <span className="method-choice-title">{t.forgotMethodWhatsapp}</span>
              <span className="method-choice-desc">{t.forgotMethodWhatsappDesc}</span>
            </button>
            <button type="button" className="method-choice-card" onClick={() => chooseMethod('email')}>
              <Mail size={28} className="method-choice-icon" />
              <span className="method-choice-title">{t.forgotMethodEmail}</span>
              <span className="method-choice-desc">{t.forgotMethodEmailDesc}</span>
            </button>
          </div>
        )}

        {/* ── Step 2: enter identifier ── */}
        {step === 'form' && (
          <form className="registration-form" onSubmit={handleIdentifierSubmit} noValidate>
            {error && <div className="server-error" role="alert">{error}</div>}
            <div className="form-group">
              <span className="input-icon-left" aria-hidden="true">
                {method === 'whatsapp' ? <Phone size={18} /> : <IdCard size={18} />}
              </span>
              <input
                id="forgot-identifier-input"
                type="text"
                name="identifier"
                placeholder={method === 'whatsapp' ? t.placeholderPhone : t.placeholderEmail}
                className="form-input"
                value={identifier}
                onChange={(e) => { setIdentifier(e.target.value); if (error) setError(null); }}
                required
              />
            </div>
            <button id="forgot-submit-btn" type="submit" className="submit-btn" disabled={loading}>
              <span>{loading ? t.sendingReset : t.btnSendReset}</span>
              {!loading && <ArrowRight size={16} style={{ transform: isRtl ? 'scaleX(-1)' : 'none' }} />}
            </button>
            <div className="card-footer" style={{ marginTop: 16 }}>
              <button type="button" className="footer-link" onClick={() => setStep('method')}>{t.back}</button>
            </div>
          </form>
        )}

        {/* ── Step 3a: OTP entry ── */}
        {step === 'otp' && (
          <form className="registration-form" onSubmit={handleOtpSubmit} noValidate>
            {devOtp && (
              <div className="dev-mode-note" role="note" style={{ marginBottom: 16 }}>
                <p>{t.devOtpNote}</p>
                <p style={{ fontWeight: 700, fontSize: 16 }}>{t.yourCode}: {devOtp}</p>
              </div>
            )}
            {otpError && <div className="server-error" role="alert">{otpError}</div>}
            <div className="form-group">
              <input
                id="forgot-otp-input"
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                placeholder={t.placeholderOtp}
                className={`form-input ${otpError ? 'has-error' : ''}`}
                value={otp}
                onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '')); if (otpError) setOtpError(null); }}
                autoComplete="one-time-code"
                style={{ textAlign: 'center', fontSize: 22, letterSpacing: 8, fontWeight: 700 }}
              />
            </div>
            <button id="forgot-otp-btn" type="submit" className="submit-btn" disabled={loading}>
              <span>{loading ? t.verifyingOtp : t.btnVerifyOtp}</span>
              {!loading && <ArrowRight size={16} style={{ transform: isRtl ? 'scaleX(-1)' : 'none' }} />}
            </button>
            <div className="card-footer" style={{ marginTop: 16 }}>
              <button type="button" className="footer-link" onClick={() => { setStep('form'); setOtp(''); setOtpError(null); }}>
                {t.back}
              </button>
            </div>
          </form>
        )}

        {/* ── Step 3b: email sent ── */}
        {step === 'sent' && (
          <>
            {message && <div className="server-success" role="status">{message}</div>}
            {devResetUrl && (
              <div className="dev-mode-note" role="note">
                <p>{t.devEmailNote}</p>
                <button type="button" id="dev-reset-link-btn" className="footer-link" onClick={() => navigate(`/reset-password/${devToken}`)}>
                  {devResetUrl}
                </button>
              </div>
            )}
          </>
        )}

        {step !== 'otp' && step !== 'form' && (
          <div className="card-footer" style={{ marginTop: 20 }}>
            <button type="button" id="back-to-login-link" className="footer-link" onClick={() => navigate('/login')}>
              {t.backToLogin}
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default ForgotPassword;
