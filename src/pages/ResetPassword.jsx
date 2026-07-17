import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import AuthHeader from '../components/AuthHeader';

const STRONG_PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,128}$/;

const ResetPassword = () => {
  const navigate = useNavigate();
  const { token } = useParams();
  const { t, isRtl } = useLanguage();
  const { showToast } = useToast();

  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.password) {
      newErrors.password = t.errorRequired;
    } else if (!STRONG_PASSWORD_RE.test(formData.password)) {
      newErrors.password = t.errorStrongPassword;
    }
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t.errorRequired;
    } else if (formData.password !== formData.confirmPassword) {
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
      await axiosClient.post(`/auth/reset-password/${token}`, { password: formData.password });
      showToast(t.resetSuccess, 'success');
      navigate('/login');
    } catch (err) {
      setServerError(err.response?.data?.message || t.errorRequired);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <AuthHeader backTo="/login" />

      <main className="registration-card" role="main">
        <div className="card-header">
          <h1 id="screen-title" className="card-title">{t.resetTitle}</h1>
          <p id="screen-subtitle" className="card-subtitle">{t.resetSubtitle}</p>
        </div>

        <form className="registration-form" onSubmit={handleSubmit} noValidate>
          {serverError && <div className="server-error" role="alert">{serverError}</div>}

          <div className="form-group">
            <span className="input-icon-left" aria-hidden="true"><Lock size={18} /></span>
            <input
              id="reset-password-input" type={showPassword ? 'text' : 'password'} name="password" placeholder={t.placeholderNewPassword}
              className={`form-input ${errors.password ? 'has-error' : ''}`}
              value={formData.password} onChange={handleChange} required
            />
            <button id="reset-password-toggle" type="button" className="input-icon-right" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            {errors.password && <p className="error-message" role="alert">{errors.password}</p>}
          </div>

          <div className="form-group">
            <span className="input-icon-left" aria-hidden="true"><Lock size={18} /></span>
            <input
              id="reset-confirm-password-input" type={showPassword ? 'text' : 'password'} name="confirmPassword" placeholder={t.placeholderConfirmNewPassword}
              className={`form-input ${errors.confirmPassword ? 'has-error' : ''}`}
              value={formData.confirmPassword} onChange={handleChange} required
            />
            {errors.confirmPassword && <p className="error-message" role="alert">{errors.confirmPassword}</p>}
          </div>

          <button id="reset-submit-btn" type="submit" className="submit-btn" disabled={loading}>
            <span>{loading ? t.resettingPassword : t.btnResetPassword}</span>
            {!loading && <ArrowRight size={16} style={{ transform: isRtl ? 'scaleX(-1)' : 'none' }} />}
          </button>
        </form>
      </main>
    </div>
  );
};

export default ResetPassword;
