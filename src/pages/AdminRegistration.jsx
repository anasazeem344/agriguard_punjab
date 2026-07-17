import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { isValidNameFormat } from '../utils/validators';
import { User, Mail, IdCard, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { useLanguage } from '../context/LanguageContext';
import AuthHeader from '../components/AuthHeader';
import UrduKeyboard from '../components/UrduKeyboard';

const AdminRegistration = () => {
  const navigate = useNavigate();
  const { t, isRtl } = useLanguage();


  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [adminData, setAdminData] = useState({
    fullName: '', email: '', accessCode: '', password: '', confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [nameFocused, setNameFocused] = useState(false);
  const nameInputRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setAdminData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const validate = () => {
    const newErrors = {};
    if (!adminData.fullName.trim()) newErrors.fullName = t.errorRequired;
    else if (!isValidNameFormat(adminData.fullName)) newErrors.fullName = t.errorNameFormat;

    if (!adminData.email.trim()) {
      newErrors.email = t.errorRequired;
    } else if (!/\S+@\S+\.\S+/.test(adminData.email)) {
      newErrors.email = t.errorEmail;
    } else if (adminData.email.length > 100) {
      newErrors.email = t.errorEmailLength;
    }

    if (!adminData.accessCode.trim()) {
      newErrors.accessCode = t.errorRequired;
    } else if (adminData.accessCode.length > 50) {
      newErrors.accessCode = t.errorAccessCodeLength;
    }

    if (!adminData.password) {
      newErrors.password = t.errorRequired;
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,128}$/.test(adminData.password)) {
      newErrors.password = t.errorStrongPassword;
    }
    
    if (!adminData.confirmPassword) {
      newErrors.confirmPassword = t.errorRequired;
    } else if (adminData.password !== adminData.confirmPassword) {
      newErrors.confirmPassword = t.errorMatch;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      setLoading(true);
      setServerError(null);
      const res = await axiosClient.post('/auth/register/admin', {
        fullName: adminData.fullName,
        email: adminData.email,
        accessCode: adminData.accessCode,
        password: adminData.password
      });
      navigate('/verify-email-pending', {
        state: { email: adminData.email, devVerificationUrl: res.data.devVerificationUrl }
      });
    } catch (err) {
      setServerError(err.response?.data?.message || t.errorGeneric);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <AuthHeader backTo="/" />

      <main className="registration-card" role="main">
        <div className="card-header">
          <h1 id="screen-title" className="card-title">{t.adminTitle}</h1>
          <p id="screen-subtitle" className="card-subtitle">{t.adminSubtitle}</p>
        </div>

        <form className="registration-form" onSubmit={handleSubmit} noValidate>
          {serverError && <div className="server-error" role="alert">{serverError}</div>}

          <div className="form-group">
            <span className="input-icon-left" aria-hidden="true"><User size={18} /></span>
            <input
              id="admin-fullname-input" type="text" name="fullName" placeholder={t.placeholderName}
              className={`form-input ${errors.fullName ? 'has-error' : ''}`}
              value={adminData.fullName} onChange={handleChange} required minLength="2" maxLength="50"
              ref={nameInputRef}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
              aria-required="true" aria-invalid={errors.fullName ? 'true' : 'false'}
            />
            {errors.fullName && <p className="error-message" role="alert">{errors.fullName}</p>}
            <UrduKeyboard
              value={adminData.fullName}
              onChange={(v) => { setAdminData((prev) => ({ ...prev, fullName: v })); if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: null })); }}
              show={isRtl && nameFocused}
            />
          </div>

          <div className="form-group">
            <span className="input-icon-left" aria-hidden="true"><Mail size={18} /></span>
            <input
              id="admin-email-input" type="email" name="email" placeholder={t.placeholderEmail}
              className={`form-input ${errors.email ? 'has-error' : ''}`}
              value={adminData.email} onChange={handleChange} required maxLength="100"
              aria-required="true" aria-invalid={errors.email ? 'true' : 'false'}
            />
            {errors.email && <p className="error-message" role="alert">{errors.email}</p>}
          </div>

          <div className="form-group">
            <span className="input-icon-left" aria-hidden="true"><IdCard size={18} /></span>
            <input
              id="admin-code-input" type="text" name="accessCode" placeholder={t.placeholderCode}
              className={`form-input access-code-field ${errors.accessCode ? 'has-error' : ''}`}
              value={adminData.accessCode} onChange={handleChange} required maxLength="50"
              aria-required="true" aria-invalid={errors.accessCode ? 'true' : 'false'}
            />
            {errors.accessCode && <p className="error-message" role="alert">{errors.accessCode}</p>}
          </div>

          <div className="form-group">
            <span className="input-icon-left" aria-hidden="true"><Lock size={18} /></span>
            <input
              id="admin-password-input" type={showPassword ? 'text' : 'password'} name="password" placeholder={t.placeholderPassword}
              className={`form-input ${errors.password ? 'has-error' : ''}`}
              value={adminData.password} onChange={handleChange} required minLength="8" maxLength="128"
              aria-required="true" aria-invalid={errors.password ? 'true' : 'false'}
            />
            <button id="password-toggle-btn" type="button" className="input-icon-right" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            {errors.password && <p className="error-message" role="alert">{errors.password}</p>}
          </div>

          <div className="form-group">
            <span className="input-icon-left" aria-hidden="true"><Lock size={18} /></span>
            <input
              id="admin-confirm-password-input" type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" placeholder={t.placeholderConfirm}
              className={`form-input ${errors.confirmPassword ? 'has-error' : ''}`}
              value={adminData.confirmPassword} onChange={handleChange} required minLength="8" maxLength="128"
              aria-required="true" aria-invalid={errors.confirmPassword ? 'true' : 'false'}
            />
            <button id="confirm-password-toggle-btn" type="button" className="input-icon-right" onClick={() => setShowConfirmPassword(!showConfirmPassword)} aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            {errors.confirmPassword && <p className="error-message" role="alert">{errors.confirmPassword}</p>}
          </div>

          <button id="admin-submit-btn" type="submit" className="submit-btn" disabled={loading}>
            <span>{loading ? t.registering : t.btnRegisterAdmin}</span>
            {!loading && <ArrowRight size={16} style={{ transform: isRtl ? 'scaleX(-1)' : 'none' }} />}
          </button>
        </form>

        <div className="divider">{t.or}</div>

        <div className="card-footer">
          <span>{t.footerText}</span>
          <Link id="admin-login-link" to="/login" className="footer-link">
            {t.loginLink}
          </Link>
        </div>
      </main>
    </div>
  );
};

export default AdminRegistration;
