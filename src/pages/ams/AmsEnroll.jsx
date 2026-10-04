import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck, KeyRound, Copy, Check, ArrowRight } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import './ams.css';

const AmsEnroll = () => {
  const { t, lang, setLang } = useLanguage();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const initial = location.state || {};
  const [identifier] = useState(initial.identifier || null);
  const [enrollToken, setEnrollToken] = useState(initial.enrollToken || null);
  // Who this enrollment belongs to — set by the caller (AmsLogin passes
  // 'superadmin', AcceptAdminInvite passes 'admin') since the server hasn't
  // confirmed anything yet at this point; used only to send a failed/expired
  // enrollment session back to the right login page.
  const [role] = useState(initial.role || 'superadmin');

  const [phase, setPhase] = useState('loading'); // loading | qr | backupCodes | failed
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState(null);
  const [manualSecret, setManualSecret] = useState(null);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [backupCodes, setBackupCodes] = useState([]);
  const [enrolledRole, setEnrolledRole] = useState(null);
  const [copied, setCopied] = useState(false);
  const hasStarted = useRef(false);

  const loginPath = role === 'superadmin' ? '/ams/login' : '/login';

  useEffect(() => {
    if (!identifier || !enrollToken) {
      navigate(loginPath, { replace: true });
      return;
    }
    if (hasStarted.current) return;
    hasStarted.current = true;

    const start = async () => {
      try {
        const res = await axiosClient.post('/ams/enroll/start', { identifier, enrollToken });
        setQrCodeDataUrl(res.data.qrCodeDataUrl);
        setManualSecret(res.data.secret);
        if (res.data.enrollToken) setEnrollToken(res.data.enrollToken);
        setPhase('qr');
      } catch {
        setPhase('failed');
      }
    };
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConfirm = async (e) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      setCodeError(t.errorOtpFormat);
      return;
    }
    try {
      setLoading(true);
      setCodeError(null);
      const res = await axiosClient.post('/ams/enroll/confirm', { identifier, enrollToken, code: trimmed });
      const { token, user, backupCodes: codes } = res.data;
      login(token, user, true);
      setBackupCodes(codes);
      setEnrolledRole(user.role);
      setPhase('backupCodes');
    } catch (err) {
      setCodeError(err.response?.data?.message || t.amsEnrollError);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyBackupCodes = async () => {
    try {
      await navigator.clipboard.writeText(backupCodes.join('\n'));
    } catch {
      // clipboard unavailable — user can still select/copy manually
    }
    setCopied(true);
  };

  return (
    <div className="ams-root">
      <div className="ams-auth-page">
        <aside className="ams-auth-aside">
          <div className="ams-glow ams-glow-leaf" />
          <div className="ams-glow ams-glow-peach" />
          <div className="ams-texture" />
          <div className="ams-aside-brand"><ShieldCheck size={24} /> {t.amsBrand}</div>
          <div className="ams-aside-content">
            <p className="ams-console-label">{t.amsConsoleLabel}</p>
            <h2 className="ams-aside-heading">{t.amsPanelH1}<br />{t.amsPanelH2}<br />{t.amsPanelH3}</h2>
            <p className="ams-aside-body">{t.amsPanelBody}</p>
          </div>
          <div />
        </aside>

        <main className="ams-auth-main">
          <header className="ams-auth-header" style={{ justifyContent: 'flex-end' }}>
            <div className="ams-lang-toggle" role="group" aria-label="Language selection">
              <button type="button" className={`ams-lang-btn ${lang === 'English' ? 'active' : ''}`} onClick={() => setLang('English')}>English</button>
              <button type="button" className={`ams-lang-btn ${lang === 'Urdu' ? 'active' : ''}`} onClick={() => setLang('Urdu')}>Urdu</button>
            </div>
          </header>

          <div className="ams-auth-form-wrap">
            {phase === 'loading' && (
              <div className="ams-card" style={{ textAlign: 'center' }}>
                <p className="ams-card-subtitle">{t.amsVerifying}</p>
              </div>
            )}

            {phase === 'failed' && (
              <div className="ams-card" style={{ textAlign: 'center' }}>
                <p className="ams-card-subtitle">{t.amsLoginError}</p>
                <button type="button" className="ams-footer-link" onClick={() => navigate(loginPath)}>{t.backToLogin}</button>
              </div>
            )}

            {phase === 'qr' && (
              <form className="ams-card" onSubmit={handleConfirm} noValidate>
                <div className="ams-icon-badge"><ShieldCheck size={26} /></div>
                <h1 className="ams-card-title">{t.amsEnrollTitle}</h1>
                <p className="ams-card-subtitle">{t.amsEnrollSubtitle}</p>

                {qrCodeDataUrl && (
                  <div className="ams-qr-wrap" style={{ marginTop: 24 }}>
                    <img src={qrCodeDataUrl} alt={t.amsEnrollTitle} />
                  </div>
                )}

                {manualSecret && (
                  <>
                    <p className="ams-manual-caption">{t.amsEnrollManualEntryLabel}</p>
                    <p className="ams-manual-key" dir="ltr">{manualSecret}</p>
                  </>
                )}

                <div className="ams-form-fields" style={{ marginTop: 24 }}>
                  <label className="ams-field-wrap">
                    <span className="ams-field-label">{t.amsEnrollCodeLabel}</span>
                    <div className="ams-field ams-field-code">
                      <span className="ams-field-icon"><ShieldCheck size={18} /></span>
                      <input
                        id="ams-enroll-code-input" type="text" inputMode="numeric" dir="ltr" maxLength={6}
                        className="ams-input ams-input-code"
                        value={code}
                        onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); if (codeError) setCodeError(null); }}
                        placeholder="••••••" autoComplete="one-time-code"
                      />
                    </div>
                  </label>
                </div>

                {codeError && <div className="ams-error-banner" role="alert">{codeError}</div>}

                <button id="ams-enroll-confirm-btn" type="submit" className="ams-submit-btn" disabled={loading}>
                  {loading ? t.amsVerifying : (<>{t.amsEnrollConfirmBtn} <ArrowRight size={16} /></>)}
                </button>
              </form>
            )}

            {phase === 'backupCodes' && (
              <div className="ams-card">
                <div className="ams-icon-badge"><KeyRound size={26} /></div>
                <h1 className="ams-card-title">{t.amsBackupCodesTitle}</h1>
                <p className="ams-card-subtitle">{t.amsBackupCodesWarning}</p>

                <div className="ams-backup-grid" style={{ marginTop: 24 }}>
                  {backupCodes.map((c) => (
                    <span className="ams-backup-code-item" key={c}>{c}</span>
                  ))}
                </div>

                <button type="button" className="ams-ghost-btn" style={{ marginTop: 16 }} onClick={handleCopyBackupCodes}>
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                  {copied ? t.copied : t.amsBackupCodesCopy}
                </button>

                <button id="ams-enroll-continue-btn" type="button" className="ams-submit-btn" onClick={() => navigate(enrolledRole === 'superadmin' ? '/ams' : '/admin')}>
                  {t.amsBackupCodesContinue}
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AmsEnroll;
