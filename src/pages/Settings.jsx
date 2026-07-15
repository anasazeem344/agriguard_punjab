import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, MapPin, Mountain, Lock } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { isValidPhoneFormat, isValidEmailFormat } from '../utils/validators';
import { provinces, provinceLabels, districtsByProvince } from '../data/pakistanLocations';

const Settings = () => {
  const { t } = useLanguage();
  const { user, updateUser, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  const [profile, setProfile] = useState({
    fullName: '', email: '', phone: '', province: '', district: '', farmArea: '', accessCode: ''
  });
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState(null);
  const [profileError, setProfileError] = useState(null);

  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState(null);
  const [passwordError, setPasswordError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axiosClient.get('/users/me');
        setProfile((prev) => ({ ...prev, ...res.data.user }));
      } catch (err) {
        setProfileError(err.response?.data?.message || t.errorGeneric);
      } finally {
        setProfileLoading(false);
      }
    };
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleProvinceChange = (e) => {
    const { value } = e.target;
    // Switching province invalidates whatever district was previously picked.
    setProfile((prev) => ({ ...prev, province: value, district: '' }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError(null);
    setProfileMessage(null);

    if (!profile.fullName.trim()) {
      return setProfileError(t.errorRequired);
    }
    if (!isValidEmailFormat(profile.email || '')) {
      return setProfileError(t.errorEmail);
    }
    if (!isAdmin && !isValidPhoneFormat(profile.phone || '')) {
      return setProfileError(t.errorPhone);
    }

    try {
      setProfileSaving(true);
      const payload = isAdmin
        ? { fullName: profile.fullName, email: profile.email }
        : { fullName: profile.fullName, phone: profile.phone, email: profile.email, province: profile.province, district: profile.district, farmArea: profile.farmArea };
      const res = await axiosClient.put('/users/me', payload);
      updateUser({ ...user, fullName: profile.fullName, email: profile.email, phone: profile.phone });

      if (res.data.requiresVerification && res.data.verificationChannel === 'phone') {
        navigate('/verify-phone-pending', {
          state: { phone: profile.phone, deepLink: res.data.deepLink, devOtp: res.data.devOtp }
        });
        return;
      }
      if (res.data.requiresVerification && res.data.verificationChannel === 'email') {
        navigate('/verify-email-pending', {
          state: { email: profile.email, devVerificationUrl: res.data.devVerificationUrl }
        });
        return;
      }

      setProfileMessage(res.data.message || t.profileUpdateSuccess);
    } catch (err) {
      setProfileError(err.response?.data?.message || t.errorGeneric);
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
    if (passwordErrors[name]) setPasswordErrors((prev) => ({ ...prev, [name]: null }));
  };

  const validatePasswordForm = () => {
    const newErrors = {};
    if (!passwordForm.currentPassword) newErrors.currentPassword = t.errorRequired;
    if (!passwordForm.newPassword) {
      newErrors.newPassword = t.errorRequired;
    } else if (passwordForm.newPassword.length < 8) {
      newErrors.newPassword = t.errorLength;
    }
    if (!passwordForm.confirmNewPassword) {
      newErrors.confirmNewPassword = t.errorRequired;
    } else if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      newErrors.confirmNewPassword = t.errorMatch;
    }
    setPasswordErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!validatePasswordForm()) return;
    try {
      setPasswordSaving(true);
      setPasswordError(null);
      setPasswordMessage(null);
      await axiosClient.put('/users/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      // Changing the password invalidates the current session server-side,
      // so log out proactively here instead of letting the user hit a
      // confusing 401 on their next click.
      logout();
      showToast(t.passwordChangeSuccess, 'success');
      navigate('/login');
    } catch (err) {
      setPasswordError(err.response?.data?.message || t.errorGeneric);
    } finally {
      setPasswordSaving(false);
    }
  };

  if (profileLoading) {
    return <div className="dashboard-page-header"><h1>{t.settingsTitle}</h1></div>;
  }

  return (
    <>
      <div className="dashboard-page-header">
        <h1>{t.settingsTitle}</h1>
        <p>{t.settingsSubtitle}</p>
      </div>

      <section className="dashboard-card">
        <div className="dashboard-card-header">
          <h2>{t.profileSection}</h2>
        </div>

        <form className="settings-form" onSubmit={handleProfileSubmit} noValidate>
          {profileError && <div className="server-error" role="alert">{profileError}</div>}
          {profileMessage && <div className="server-success" role="status">{profileMessage}</div>}

          <div className="form-group">
            <span className="input-icon-left" aria-hidden="true"><User size={18} /></span>
            <input
              id="settings-fullname-input" type="text" name="fullName" placeholder={t.placeholderName}
              className="form-input" value={profile.fullName} onChange={handleProfileChange} required
            />
          </div>

          <div className="form-group">
            <span className="input-icon-left" aria-hidden="true"><Mail size={18} /></span>
            <input
              id="settings-email-input" type="email" name="email" placeholder={t.placeholderEmail}
              className="form-input" value={profile.email || ''} disabled readOnly title="Email cannot be changed after registration"
            />
          </div>

          {!isAdmin && (
            <>
              <div className="form-group">
                <span className="input-icon-left" aria-hidden="true"><Phone size={18} /></span>
                <input
                  id="settings-phone-input" type="tel" name="phone" placeholder={t.placeholderPhone}
                  className="form-input" value={profile.phone || ''} onChange={handleProfileChange} required
                />
              </div>
              <div className="form-group">
                <span className="input-icon-left" aria-hidden="true"><MapPin size={18} /></span>
                <select
                  id="settings-province-select" name="province" className="form-input"
                  value={profile.province || ''} onChange={handleProvinceChange}
                  style={{ appearance: 'none', WebkitAppearance: 'none' }}
                >
                  <option value="" disabled>{t.placeholderProvince}</option>
                  {provinces.map((p) => (
                    <option key={p} value={p}>{provinceLabels[p]}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <span className="input-icon-left" aria-hidden="true"><MapPin size={18} /></span>
                <select
                  id="settings-district-select" name="district" className="form-input"
                  value={profile.district || ''} onChange={handleProfileChange}
                  style={{ appearance: 'none', WebkitAppearance: 'none' }}
                  disabled={!profile.province}
                >
                  <option value="" disabled>{t.placeholderDistrict}</option>
                  {(districtsByProvince[profile.province] || []).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <span className="input-icon-left" aria-hidden="true"><Mountain size={18} /></span>
                <input
                  id="settings-farmarea-input" type="number" name="farmArea" placeholder={t.placeholderArea}
                  className="form-input" value={profile.farmArea || ''} onChange={handleProfileChange}
                />
              </div>
            </>
          )}

          {isAdmin && profile.accessCode && (
            <div className="form-group">
              <span className="input-icon-left" aria-hidden="true"><Lock size={18} /></span>
              <input
                id="settings-accesscode-input" type="text" className="form-input access-code-field"
                value={profile.accessCode} disabled readOnly
              />
            </div>
          )}

          <button id="settings-save-profile-btn" type="submit" className="submit-btn" style={{ marginTop: 4 }} disabled={profileSaving}>
            <span>{profileSaving ? t.saving : t.saveChanges}</span>
          </button>
        </form>
      </section>

      <section className="dashboard-card">
        <div className="dashboard-card-header">
          <h2>{t.securitySection}</h2>
        </div>

        <form className="settings-form" onSubmit={handlePasswordSubmit} noValidate>
          {passwordError && <div className="server-error" role="alert">{passwordError}</div>}
          {passwordMessage && <div className="server-success" role="status">{passwordMessage}</div>}

          <div className="form-group">
            <span className="input-icon-left" aria-hidden="true"><Lock size={18} /></span>
            <input
              id="settings-current-password-input" type="password" name="currentPassword" placeholder={t.placeholderCurrentPassword}
              className={`form-input ${passwordErrors.currentPassword ? 'has-error' : ''}`}
              value={passwordForm.currentPassword} onChange={handlePasswordChange}
            />
            {passwordErrors.currentPassword && <p className="error-message" role="alert">{passwordErrors.currentPassword}</p>}
          </div>

          <div className="form-group">
            <span className="input-icon-left" aria-hidden="true"><Lock size={18} /></span>
            <input
              id="settings-new-password-input" type="password" name="newPassword" placeholder={t.placeholderNewPassword}
              className={`form-input ${passwordErrors.newPassword ? 'has-error' : ''}`}
              value={passwordForm.newPassword} onChange={handlePasswordChange}
            />
            {passwordErrors.newPassword && <p className="error-message" role="alert">{passwordErrors.newPassword}</p>}
          </div>

          <div className="form-group">
            <span className="input-icon-left" aria-hidden="true"><Lock size={18} /></span>
            <input
              id="settings-confirm-new-password-input" type="password" name="confirmNewPassword" placeholder={t.placeholderConfirmNewPassword}
              className={`form-input ${passwordErrors.confirmNewPassword ? 'has-error' : ''}`}
              value={passwordForm.confirmNewPassword} onChange={handlePasswordChange}
            />
            {passwordErrors.confirmNewPassword && <p className="error-message" role="alert">{passwordErrors.confirmNewPassword}</p>}
          </div>

          <button id="settings-change-password-btn" type="submit" className="submit-btn" style={{ marginTop: 4 }} disabled={passwordSaving}>
            <span>{passwordSaving ? t.resettingPassword : t.btnChangePassword}</span>
          </button>
        </form>
      </section>
    </>
  );
};

export default Settings;
