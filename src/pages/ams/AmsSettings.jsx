import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ShieldCheck, Eye, EyeOff, Copy, Check, X, ArrowRight } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import './ams.css';

const STRONG_PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,128}$/;

const AmsSettings = () => {
  const { t } = useLanguage();
  const { logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [enrolledAt, setEnrolledAt] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState(null);

  const [modalStep, setModalStep] = useState('none'); // 'none' | 'confirm' | 'qr' | 'backup'
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmCurrentCode, setConfirmCurrentCode] = useState('');
  const [confirmError, setConfirmError] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [reenrollToken, setReenrollToken] = useState(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState(null);
  const [manualSecret, setManualSecret] = useState(null);
  const [newCode, setNewCode] = useState('');
  const [newCodeError, setNewCodeError] = useState(null);
  const [newCodeLoading, setNewCodeLoading] = useState(false);
  const [backupCodes, setBackupCodes] = useState([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axiosClient.get('/users/me');
        setEnrolledAt(res.data.user.totpEnrolledAt || null);
      } catch {
        setEnrolledAt(null);
      } finally {
        setLoadingProfile(false);
      }
    };
    load();
  }, []);

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
    if (passwordErrors[name]) setPasswordErrors((prev) => ({ ...prev, [name]: null }));
  };

  const validatePasswordForm = () => {
    const errs = {};
    if (!passwordForm.currentPassword) errs.currentPassword = t.errorRequired;
    if (!passwordForm.newPassword) errs.newPassword = t.errorRequired;
    else if (!STRONG_PASSWORD_RE.test(passwordForm.newPassword)) errs.newPassword = t.errorStrongPassword;
    if (!passwordForm.confirmNewPassword) errs.confirmNewPassword = t.errorRequired;
    else if (passwordForm.newPassword !== passwordForm.confirmNewPassword) errs.confirmNewPassword = t.errorMatch;
    setPasswordErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!validatePasswordForm()) return;
    try {
      setPasswordSaving(true);
      setPasswordError(null);
      await axiosClient.put('/users/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      // Changing the password invalidates the current session server-side,
      // so log out proactively rather than letting the next request 401.
      logout();
      showToast(t.passwordChangeSuccess, 'success');
      navigate('/ams/login');
    } catch (err) {
      setPasswordError(err.response?.data?.message || t.errorGeneric);
    } finally {
      setPasswordSaving(false);
    }
  };

  const closeModal = () => {
    setModalStep('none');
    setConfirmPassword('');
    setConfirmCurrentCode('');
    setConfirmError(null);
    setReenrollToken(null);
    setQrCodeDataUrl(null);
    setManualSecret(null);
    setNewCode('');
    setNewCodeError(null);
    setBackupCodes([]);
    setCopied(false);
  };

  const handleConfirmSubmit = async (e) => {
    e.preventDefault();
    if (!confirmPassword || !confirmCurrentCode) {
      setConfirmError(t.errorRequired);
      return;
    }
    try {
      setConfirmLoading(true);
      setConfirmError(null);
      const res = await axiosClient.post('/ams/reenroll/start', {
        password: confirmPassword,
        currentCode: confirmCurrentCode.trim()
      });
      setQrCodeDataUrl(res.data.qrCodeDataUrl);
      setManualSecret(res.data.secret);
      setReenrollToken(res.data.reenrollToken);
      setModalStep('qr');
    } catch (err) {
      setConfirmError(err.response?.data?.message || t.errorGeneric);
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleNewCodeSubmit = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(newCode.trim())) {
      setNewCodeError(t.errorOtpFormat);
      return;
    }
    try {
      setNewCodeLoading(true);
      setNewCodeError(null);
      const res = await axiosClient.post('/ams/reenroll/confirm', {
        reenrollToken,
        code: newCode.trim()
      });
      setBackupCodes(res.data.backupCodes);
      setModalStep('backup');
    } catch (err) {
      setNewCodeError(err.response?.data?.message || t.errorGeneric);
    } finally {
      setNewCodeLoading(false);
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

  const finishReenroll = async () => {
    closeModal();
    showToast(t.amsSetupNewAuthenticatorBtn, 'success');
    try {
      const res = await axiosClient.get('/users/me');
      setEnrolledAt(res.data.user.totpEnrolledAt || null);
    } catch {
      // non-fatal — the card just won't refresh its date until next visit
    }
  };

  return (
    <>
      <div className="ams-page-header">
        <div>
          <h1 className="ams-page-title">{t.amsSettingsTitle}</h1>
          <p className="ams-page-subtitle">{t.amsSettingsSubtitle}</p>
        </div>
      </div>

      <div className="ams-settings-grid">
        <section className="ams-panel-card">
          <div className="ams-settings-card-header">
            <span className="ams-settings-card-icon"><Lock size={18} /></span>
            <h2 className="ams-settings-card-title">{t.securitySection}</h2>
          </div>

          <form onSubmit={handlePasswordSubmit} noValidate style={{ marginTop: 20 }}>
            {passwordError && <div className="ams-error-banner" style={{ marginTop: 0, marginBottom: 16 }}>{passwordError}</div>}

            <label className="ams-field-wrap" style={{ marginBottom: 16, display: 'block' }}>
              <span className="ams-field-label">{t.placeholderCurrentPassword}</span>
              <div className="ams-field">
                <input
                  type={showPassword ? 'text' : 'password'} name="currentPassword" className="ams-input"
                  value={passwordForm.currentPassword} onChange={handlePasswordChange} autoComplete="current-password"
                />
              </div>
              {passwordErrors.currentPassword && <p className="error-message" role="alert">{passwordErrors.currentPassword}</p>}
            </label>

            <label className="ams-field-wrap" style={{ marginBottom: 16, display: 'block' }}>
              <span className="ams-field-label">{t.placeholderNewPassword}</span>
              <div className="ams-field">
                <input
                  type={showPassword ? 'text' : 'password'} name="newPassword" className="ams-input"
                  value={passwordForm.newPassword} onChange={handlePasswordChange} autoComplete="new-password"
                />
                <button type="button" className="ams-field-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {passwordErrors.newPassword && <p className="error-message" role="alert">{passwordErrors.newPassword}</p>}
            </label>

            <label className="ams-field-wrap" style={{ display: 'block' }}>
              <span className="ams-field-label">{t.placeholderConfirmNewPassword}</span>
              <div className="ams-field">
                <input
                  type={showPassword ? 'text' : 'password'} name="confirmNewPassword" className="ams-input"
                  value={passwordForm.confirmNewPassword} onChange={handlePasswordChange} autoComplete="new-password"
                />
              </div>
              {passwordErrors.confirmNewPassword && <p className="error-message" role="alert">{passwordErrors.confirmNewPassword}</p>}
            </label>

            <button type="submit" className="ams-submit-btn" disabled={passwordSaving}>
              {passwordSaving ? t.saving : t.btnChangePassword}
            </button>
          </form>
        </section>

        <section className="ams-panel-card">
          <div className="ams-settings-card-header">
            <span className="ams-settings-card-icon"><ShieldCheck size={18} /></span>
            <h2 className="ams-settings-card-title">{t.amsAuthenticatorTitle}</h2>
          </div>
          <p className="ams-settings-card-sub">{t.amsAuthenticatorSub}</p>

          {!loadingProfile && (
            <div className="ams-settings-statusline">
              <div className="ams-settings-statusline-row">
                <span className="ams-settings-statusline-label">{t.amsAuthenticatorStatus}</span>
                <span className="ams-status-badge active">{t.amsAuthenticatorActive}</span>
              </div>
              {enrolledAt && (
                <div className="ams-settings-statusline-row">
                  <span className="ams-settings-statusline-label">{t.amsAuthenticatorEnrolledOn}</span>
                  <span className="ams-settings-statusline-value">{new Date(enrolledAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          )}

          <button type="button" className="ams-ghost-btn" style={{ marginTop: 20 }} onClick={() => setModalStep('confirm')}>
            {t.amsSetupNewAuthenticatorBtn}
          </button>
        </section>
      </div>

      {modalStep !== 'none' && (
        <>
          <button type="button" className="ams-modal-backdrop" aria-label={t.cancel} onClick={modalStep === 'confirm' ? closeModal : undefined} />
          <div className="ams-modal-center">
            <div className="ams-modal ams-card" style={{ maxWidth: 440 }}>
              {modalStep === 'confirm' && (
                <form onSubmit={handleConfirmSubmit} noValidate>
                  <div className="ams-slideover-header" style={{ marginBottom: 16 }}>
                    <div>
                      <h2 className="ams-slideover-title" style={{ fontSize: 20 }}>{t.amsReenrollStep1Title}</h2>
                      <p className="ams-slideover-subtitle">{t.amsReenrollStep1Subtitle}</p>
                    </div>
                    <button type="button" className="ams-slideover-close" aria-label={t.cancel} onClick={closeModal}><X size={18} /></button>
                  </div>

                  {confirmError && <div className="ams-error-banner" style={{ marginTop: 0, marginBottom: 16 }}>{confirmError}</div>}

                  <label className="ams-field-wrap" style={{ marginBottom: 16, display: 'block' }}>
                    <span className="ams-field-label">{t.placeholderCurrentPassword}</span>
                    <div className="ams-field">
                      <input type="password" className="ams-input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="current-password" />
                    </div>
                  </label>

                  <label className="ams-field-wrap" style={{ display: 'block' }}>
                    <span className="ams-field-label">{t.amsReenrollCurrentCodeLabel}</span>
                    <div className="ams-field ams-field-code">
                      <span className="ams-field-icon"><ShieldCheck size={18} /></span>
                      <input
                        dir="ltr" type="text" className="ams-input ams-input-code"
                        value={confirmCurrentCode} onChange={(e) => setConfirmCurrentCode(e.target.value.replace(/[^\dA-Za-z]/g, ''))}
                        autoComplete="one-time-code"
                      />
                    </div>
                  </label>

                  <button type="submit" className="ams-submit-btn" disabled={confirmLoading}>
                    {confirmLoading ? t.amsVerifying : (<>{t.amsReenrollContinueBtn} <ArrowRight size={16} /></>)}
                  </button>
                </form>
              )}

              {modalStep === 'qr' && (
                <form onSubmit={handleNewCodeSubmit} noValidate>
                  <div className="ams-icon-badge"><ShieldCheck size={26} /></div>
                  <h2 className="ams-card-title" style={{ fontSize: 22 }}>{t.amsEnrollTitle}</h2>
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
                          type="text" inputMode="numeric" dir="ltr" maxLength={6} className="ams-input ams-input-code"
                          value={newCode}
                          onChange={(e) => { setNewCode(e.target.value.replace(/\D/g, '')); if (newCodeError) setNewCodeError(null); }}
                          placeholder="••••••" autoComplete="one-time-code"
                        />
                      </div>
                    </label>
                  </div>

                  {newCodeError && <div className="ams-error-banner">{newCodeError}</div>}

                  <button type="submit" className="ams-submit-btn" disabled={newCodeLoading}>
                    {newCodeLoading ? t.amsVerifying : (<>{t.amsEnrollConfirmBtn} <ArrowRight size={16} /></>)}
                  </button>
                </form>
              )}

              {modalStep === 'backup' && (
                <div>
                  <div className="ams-icon-badge"><ShieldCheck size={26} /></div>
                  <h2 className="ams-card-title" style={{ fontSize: 22 }}>{t.amsBackupCodesTitle}</h2>
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

                  <button type="button" className="ams-submit-btn" onClick={finishReenroll}>
                    {t.amsBackupCodesContinue}
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default AmsSettings;
