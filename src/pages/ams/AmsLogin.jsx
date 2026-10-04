import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, ShieldCheck, Eye, EyeOff, ArrowLeft, ArrowRight, Leaf } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import './ams.css';

const AmsLogin = () => {
  const navigate = useNavigate();
  const { t, lang, setLang } = useLanguage();
  const { login } = useAuth();

  const [step, setStep] = useState('credentials'); // 'credentials' | 'code'
  const [showPassword, setShowPassword] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState(null);

  const stats = [
    { label: t.amsStatSensors, value: '1,284' },
    { label: t.amsStatAdmins, value: '37' },
    { label: t.amsStatDistricts, value: '36' }
  ];

  const submitLogin = async (body) => {
    setLoading(true);
    setServerError(null);
    try {
      const res = await axiosClient.post('/ams/login', body);
      const { phase, token, user, enrollToken } = res.data;

      if (phase === 'enroll') {
        navigate('/ams/enroll', { state: { identifier: body.identifier, enrollToken } });
        return;
      }
      if (phase === 'totp') {
        setStep('code');
        return;
      }
      login(token, user, true);
      navigate('/ams');
    } catch (err) {
      setServerError(err.response?.data?.message || t.amsLoginError);
    } finally {
      setLoading(false);
    }
  };

  const handleCredentialsSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!identifier.trim()) newErrors.identifier = t.errorRequired;
    if (!password) newErrors.password = t.errorRequired;
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    submitLogin({ identifier, password });
  };

  const handleCodeSubmit = (e) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      setErrors({ code: t.errorRequired });
      return;
    }
    setErrors({});
    submitLogin({ identifier, password, code: trimmed });
  };

  return (
    <div className="ams-root">
      <div className="ams-auth-page">
        <aside className="ams-auth-aside">
          <div className="ams-glow ams-glow-leaf" />
          <div className="ams-glow ams-glow-peach" />
          <div className="ams-texture" />

          <div className="ams-aside-brand">
            <Leaf size={24} /> {t.amsBrand}
          </div>

          <div className="ams-aside-content">
            <p className="ams-console-label">{t.amsConsoleLabel}</p>
            <h2 className="ams-aside-heading">
              {t.amsPanelH1}<br />{t.amsPanelH2}<br />{t.amsPanelH3}
            </h2>
            <p className="ams-aside-body">{t.amsPanelBody}</p>
          </div>

          <dl className="ams-stats-footer">
            {stats.map((s) => (
              <div key={s.label}>
                <dd className="ams-stat-value">{s.value}</dd>
                <dt className="ams-stat-label">{s.label}</dt>
              </div>
            ))}
          </dl>
        </aside>

        <main className="ams-auth-main">
          <header className="ams-auth-header">
            <button type="button" className="ams-back-btn" onClick={() => navigate('/')}>
              <ArrowLeft size={18} /> {t.back}
            </button>
            <div className="ams-lang-toggle" role="group" aria-label="Language selection">
              <button type="button" className={`ams-lang-btn ${lang === 'English' ? 'active' : ''}`} onClick={() => setLang('English')}>English</button>
              <button type="button" className={`ams-lang-btn ${lang === 'Urdu' ? 'active' : ''}`} onClick={() => setLang('Urdu')}>Urdu</button>
            </div>
          </header>

          <div className="ams-auth-form-wrap">
            {step === 'credentials' && (
              <form className="ams-card" onSubmit={handleCredentialsSubmit} noValidate>
                <div className="ams-icon-badge"><ShieldCheck size={26} /></div>
                <h1 className="ams-card-title">{t.amsLoginTitle}</h1>
                <p className="ams-card-subtitle">{t.amsLoginSubtitle}</p>

                <div className="ams-form-fields">
                  <label className="ams-field-wrap">
                    <span className="ams-field-label">{t.amsIdLabel}</span>
                    <div className="ams-field">
                      <span className="ams-field-icon"><User size={18} /></span>
                      <input
                        id="ams-identifier-input" type="email" dir="ltr" className="ams-input"
                        value={identifier}
                        onChange={(e) => { setIdentifier(e.target.value); if (errors.identifier) setErrors((p) => ({ ...p, identifier: null })); }}
                        placeholder={t.amsIdPlaceholder} autoComplete="username"
                      />
                    </div>
                    {errors.identifier && <p className="error-message" role="alert">{errors.identifier}</p>}
                  </label>

                  <label className="ams-field-wrap">
                    <span className="ams-field-label">{t.amsPasswordLabel}</span>
                    <div className="ams-field">
                      <span className="ams-field-icon"><Lock size={18} /></span>
                      <input
                        id="ams-password-input" type={showPassword ? 'text' : 'password'} className="ams-input"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors((p) => ({ ...p, password: null })); }}
                        placeholder={t.amsPasswordPlaceholder} autoComplete="current-password"
                      />
                      <button type="button" className="ams-field-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {errors.password && <p className="error-message" role="alert">{errors.password}</p>}
                  </label>
                </div>

                {serverError && <div className="ams-error-banner" role="alert">{serverError}</div>}

                <button id="ams-submit-btn" type="submit" className="ams-submit-btn" disabled={loading}>
                  {loading ? t.amsVerifying : (<>{t.amsSecureLogin} <ArrowRight size={16} /></>)}
                </button>

                <div className="ams-divider"><span className="ams-divider-line" />{t.or}<span className="ams-divider-line" /></div>
                <p className="ams-footer-text">
                  {t.amsNotSuper}{' '}
                  <button type="button" className="ams-footer-link" onClick={() => navigate('/login')}>{t.amsOtherLogin}</button>
                </p>

                <p className="ams-audited"><span className="ams-audited-dot" /> {t.amsAudited}</p>
              </form>
            )}

            {step === 'code' && (
              <form className="ams-card" onSubmit={handleCodeSubmit} noValidate>
                <div className="ams-icon-badge"><ShieldCheck size={26} /></div>
                <h1 className="ams-card-title">{t.amsLoginTitle}</h1>
                <p className="ams-card-subtitle">{t.amsCodeSubtitle}</p>

                <div className="ams-form-fields">
                  <label className="ams-field-wrap">
                    <span className="ams-field-label">{t.amsTotpCodeLabel}</span>
                    <div className="ams-field ams-field-code">
                      <span className="ams-field-icon"><ShieldCheck size={18} /></span>
                      <input
                        id="ams-totp-code-input" type="text" inputMode="numeric" dir="ltr" autoFocus
                        className="ams-input ams-input-code"
                        value={code}
                        onChange={(e) => { setCode(e.target.value.replace(/[^\dA-Za-z]/g, '')); if (errors.code) setErrors((p) => ({ ...p, code: null })); }}
                        placeholder={t.amsTotpCodePlaceholder} autoComplete="one-time-code"
                      />
                    </div>
                    {errors.code && <p className="error-message" role="alert">{errors.code}</p>}
                  </label>
                  <button type="button" className="ams-back-link" onClick={() => { setStep('credentials'); setCode(''); setServerError(null); }}>
                    <ArrowLeft size={16} /> {t.back}
                  </button>
                </div>

                {serverError && <div className="ams-error-banner" role="alert">{serverError}</div>}

                <button id="ams-code-submit-btn" type="submit" className="ams-submit-btn" disabled={loading}>
                  {loading ? t.amsVerifying : (<>{t.amsSecureLogin} <ArrowRight size={16} /></>)}
                </button>

                <p className="ams-audited"><span className="ams-audited-dot" /> {t.amsAudited}</p>
              </form>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AmsLogin;
