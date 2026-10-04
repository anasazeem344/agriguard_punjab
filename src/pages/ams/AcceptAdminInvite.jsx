import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ShieldCheck, Lock, Eye, EyeOff, ArrowRight, Leaf } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { useLanguage } from '../../context/LanguageContext';
import './ams.css';

const AcceptAdminInvite = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { token } = useParams();

  const [phase, setPhase] = useState('loading'); // loading | form | failed
  const [invite, setInvite] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState(null);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (!token) {
      setPhase('failed');
      return;
    }
    if (hasStarted.current) return;
    hasStarted.current = true;

    const start = async () => {
      try {
        const res = await axiosClient.get(`/ams/invites/accept/${token}`);
        setInvite(res.data.invite);
        setPhase('form');
      } catch {
        setPhase('failed');
      }
    };
    start();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!password) newErrors.password = t.errorRequired;
    else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,128}$/.test(password)) newErrors.password = t.errorStrongPassword;
    if (!confirmPassword) newErrors.confirmPassword = t.errorRequired;
    else if (password !== confirmPassword) newErrors.confirmPassword = t.errorMatch;
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    try {
      setLoading(true);
      setServerError(null);
      const res = await axiosClient.post(`/ams/invites/accept/${token}`, { password });
      const { identifier, enrollToken } = res.data;
      navigate('/ams/enroll', { state: { identifier, enrollToken, role: 'admin' } });
    } catch (err) {
      setServerError(err.response?.data?.message || t.errorGeneric);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ams-root">
      <div className="ams-auth-page">
        <aside className="ams-auth-aside">
          <div className="ams-glow ams-glow-leaf" />
          <div className="ams-glow ams-glow-peach" />
          <div className="ams-texture" />
          <div className="ams-aside-brand"><Leaf size={24} /> {t.amsBrand}</div>
          <div className="ams-aside-content">
            <p className="ams-console-label">{t.amsConsoleLabel}</p>
            <h2 className="ams-aside-heading">{t.amsPanelH1}<br />{t.amsPanelH2}<br />{t.amsPanelH3}</h2>
            <p className="ams-aside-body">{t.amsPanelBody}</p>
          </div>
          <div />
        </aside>

        <main className="ams-auth-main">
          <header className="ams-auth-header" />

          <div className="ams-auth-form-wrap">
            {phase === 'loading' && (
              <div className="ams-card" style={{ textAlign: 'center' }}>
                <p className="ams-card-subtitle">{t.amsVerifying}</p>
              </div>
            )}

            {phase === 'failed' && (
              <div className="ams-card" style={{ textAlign: 'center' }}>
                <p className="ams-card-subtitle">{t.amsAcceptInviteInvalid}</p>
                <button type="button" className="ams-footer-link" onClick={() => navigate('/login')}>{t.backToLogin}</button>
              </div>
            )}

            {phase === 'form' && invite && (
              <form className="ams-card" onSubmit={handleSubmit} noValidate>
                <div className="ams-icon-badge"><ShieldCheck size={26} /></div>
                <h1 className="ams-card-title">{t.amsAcceptInviteTitle}</h1>
                <p className="ams-card-subtitle">{t.amsAcceptInviteGreeting.replace('{name}', invite.fullName)}</p>

                <div className="ams-form-fields">
                  <label className="ams-field-wrap">
                    <span className="ams-field-label">{t.amsAcceptInvitePasswordLabel}</span>
                    <div className="ams-field">
                      <span className="ams-field-icon"><Lock size={18} /></span>
                      <input
                        type={showPassword ? 'text' : 'password'} className="ams-input"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors((p) => ({ ...p, password: null })); }}
                        autoComplete="new-password"
                      />
                      <button type="button" className="ams-field-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {errors.password && <p className="error-message" role="alert">{errors.password}</p>}
                  </label>

                  <label className="ams-field-wrap">
                    <span className="ams-field-label">{t.amsAcceptInviteConfirmPasswordLabel}</span>
                    <div className="ams-field">
                      <span className="ams-field-icon"><Lock size={18} /></span>
                      <input
                        type={showPassword ? 'text' : 'password'} className="ams-input"
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); if (errors.confirmPassword) setErrors((p) => ({ ...p, confirmPassword: null })); }}
                        autoComplete="new-password"
                      />
                    </div>
                    {errors.confirmPassword && <p className="error-message" role="alert">{errors.confirmPassword}</p>}
                  </label>
                </div>

                {serverError && <div className="ams-error-banner" role="alert">{serverError}</div>}

                <button type="submit" className="ams-submit-btn" disabled={loading}>
                  {loading ? t.amsVerifying : (<>{t.amsAcceptInviteSubmitBtn} <ArrowRight size={16} /></>)}
                </button>
              </form>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AcceptAdminInvite;
