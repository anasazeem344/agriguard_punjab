import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { IdCard, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import AuthHeader from '../components/AuthHeader';

const Login = () => {
  const navigate = useNavigate();
  const { t, lang, isRtl } = useLanguage();
  const { login } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ identifier: '', password: '' });
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [unverified, setUnverified] = useState(null); // { channel: 'email' | 'phone', value: string }
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.identifier.trim()) newErrors.identifier = t.errorRequired;
    if (!formData.password) newErrors.password = t.errorRequired;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      setLoading(true);
      setServerError(null);
      setUnverified(null);
      setResendMessage(null);
      const res = await axiosClient.post('/auth/login', formData);
      const { token, user } = res.data;
      login(token, user, rememberMe);
      navigate(user.role === 'admin' ? '/admin' : '/farmer');
    } catch (err) {
      setServerError(err.response?.data?.message || t.errorInvalidCredentials);
      if (err.response?.data?.requiresVerification) {
        const channel = err.response.data.verificationChannel;
        const value = channel === 'phone' ? err.response.data.phone : (err.response.data.email || formData.identifier);
        setUnverified({ channel, value });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!unverified) return;
    try {
      setResending(true);
      setResendMessage(null);
      if (unverified.channel === 'phone') {
        const res = await axiosClient.post('/auth/resend-phone-otp', { phone: unverified.value });
        navigate('/verify-phone-pending', {
          state: {
            phone: unverified.value,
            channel: res.data.channel || 'whatsapp',
            pendingToken: res.data.pendingToken,
            devOtp: res.data.devOtp
          }
        });
        return;
      }
      const res = await axiosClient.post('/auth/resend-verification', { identifier: unverified.value });
      setResendMessage(res.data.message || t.resendVerificationSuccess);
    } catch {
      setResendMessage(t.errorGeneric);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="app-container">
      <AuthHeader backTo="/" />

      <main className="registration-card" role="main">
        <div className="card-header">
          <h1 id="screen-title" className="card-title">{t.loginTitle}</h1>
          <p id="screen-subtitle" className="card-subtitle">{t.loginSubtitle}</p>
        </div>

        <form className="registration-form" onSubmit={handleSubmit} noValidate>
          {serverError && <div className="server-error" role="alert">{serverError}</div>}
          {resendMessage && <div className="server-success" role="status">{resendMessage}</div>}

          {unverified && (
            <button
              type="button"
              id="login-resend-verification-btn"
              className="footer-link"
              style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              onClick={handleResendVerification}
              disabled={resending}
            >
              {resending ? t.resendingVerification : (unverified.channel === 'phone' ? t.btnResendOtp : t.btnResendVerification)}
            </button>
          )}

          <div className="form-group">
            <span className="input-icon-left" aria-hidden="true"><IdCard size={18} /></span>
            <input
              id="login-identifier-input" type="text" name="identifier" placeholder={t.placeholderIdentifier}
              className={`form-input ${errors.identifier ? 'has-error' : ''}`}
              value={formData.identifier} onChange={handleChange} required
              aria-required="true" aria-invalid={errors.identifier ? 'true' : 'false'}
            />
            {errors.identifier && <p className="error-message" role="alert">{errors.identifier}</p>}
          </div>

          <div className="form-group">
            <span className="input-icon-left" aria-hidden="true"><Lock size={18} /></span>
            <input
              id="login-password-input" type={showPassword ? 'text' : 'password'} name="password" placeholder={t.placeholderPassword}
              className={`form-input ${errors.password ? 'has-error' : ''}`}
              value={formData.password} onChange={handleChange} required
              aria-required="true" aria-invalid={errors.password ? 'true' : 'false'}
            />
            <button id="login-password-toggle" type="button" className="input-icon-right" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            {errors.password && <p className="error-message" role="alert">{errors.password}</p>}
          </div>

          <div className="form-options">
            <label className="checkbox-label">
              <input
                id="remember-me-checkbox" type="checkbox" checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>{t.rememberMe}</span>
            </label>
            <Link id="forgot-password-link" to="/forgot-password" className="footer-link">
              {t.forgotPassword}
            </Link>
          </div>

          <button id="login-submit-btn" type="submit" className="submit-btn" disabled={loading}>
            <span>{loading ? t.loggingIn : t.btnLogin}</span>
            {!loading && <ArrowRight size={16} style={{ transform: isRtl ? 'scaleX(-1)' : 'none' }} />}
          </button>
        </form>

        <div className="divider">{t.or}</div>

        <div className="card-footer">
          <span>{t.noAccount}</span>
          <Link id="login-register-link" to="/register/farmer" className="footer-link">
            {t.registerAsFarmer}
          </Link>
        </div>
      </main>
    </div>
  );
};

export default Login;
