import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowRight } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { useLanguage } from '../context/LanguageContext';
import AuthHeader from '../components/AuthHeader';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { t, isRtl } = useLanguage();

  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [devResetUrl, setDevResetUrl] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError(t.errorEmail);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      setDevResetUrl(null);
      const res = await axiosClient.post('/auth/forgot-password', { email });
      setMessage(res.data.message);
      if (res.data.devResetUrl) setDevResetUrl(res.data.devResetUrl);
    } catch (err) {
      setError(err.response?.data?.message || t.errorRequired);
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
          <p id="screen-subtitle" className="card-subtitle">{t.forgotSubtitle}</p>
        </div>

        <form className="registration-form" onSubmit={handleSubmit} noValidate>
          {error && <div className="server-error" role="alert">{error}</div>}
          {message && <div className="server-success" role="status">{message}</div>}

          {devResetUrl && (
            <div className="dev-mode-note" role="note">
              <p>{t.devEmailNote}</p>
              <button type="button" id="dev-reset-link-btn" className="footer-link" onClick={() => navigate(`/reset-password/${devToken}`)}>
                {devResetUrl}
              </button>
            </div>
          )}

          <div className="form-group">
            <span className="input-icon-left" aria-hidden="true"><Mail size={18} /></span>
            <input
              id="forgot-email-input" type="email" name="email" placeholder={t.placeholderEmail}
              className="form-input"
              value={email} onChange={(e) => setEmail(e.target.value)} required
            />
          </div>

          <button id="forgot-submit-btn" type="submit" className="submit-btn" disabled={loading}>
            <span>{loading ? t.sendingReset : t.btnSendReset}</span>
            {!loading && <ArrowRight size={16} style={{ transform: isRtl ? 'scaleX(-1)' : 'none' }} />}
          </button>
        </form>

        <div className="card-footer">
          <button type="button" id="back-to-login-link" className="footer-link" onClick={() => navigate('/login')}>
            {t.backToLogin}
          </button>
        </div>
      </main>
    </div>
  );
};

export default ForgotPassword;
