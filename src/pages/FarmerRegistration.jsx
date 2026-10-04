import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Phone, Mail, MapPin, ChevronDown, Mountain, KeyRound, Lock, Eye, EyeOff, ArrowRight, MessageCircle } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { useLanguage } from '../context/LanguageContext';
import AuthHeader from '../components/AuthHeader';
import UrduKeyboard from '../components/UrduKeyboard';
import { isValidPhoneFormat, isValidEmailFormat, isValidNameFormat } from '../utils/validators';
import { provinces, provinceLabels, districtsByProvince } from '../data/pakistanLocations';

const FarmerRegistration = () => {
  const navigate = useNavigate();
  const { t, isRtl } = useLanguage();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [farmerData, setFarmerData] = useState({
    fullName: '', phone: '', email: '', province: '', district: '', farmArea: '', adminCode: '', password: '', confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [verificationChannel, setVerificationChannel] = useState('whatsapp');
  const [nameFocused, setNameFocused] = useState(false);
  const nameInputRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFarmerData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handleProvinceChange = (e) => {
    const { value } = e.target;
    // Switching province invalidates whatever district was previously picked.
    setFarmerData((prev) => ({ ...prev, province: value, district: '' }));
    setErrors((prev) => ({ ...prev, province: null, district: null }));
  };

  const validate = () => {
    const newErrors = {};
    if (!farmerData.fullName.trim()) newErrors.fullName = t.errorRequired;
    else if (!isValidNameFormat(farmerData.fullName)) newErrors.fullName = t.errorNameFormat;

    if (!farmerData.phone.trim()) {
      newErrors.phone = t.errorRequired;
    } else if (!isValidPhoneFormat(farmerData.phone)) {
      newErrors.phone = t.errorPhone;
    }

    if (!farmerData.email.trim()) {
      newErrors.email = t.errorRequired;
    } else if (!isValidEmailFormat(farmerData.email)) {
      newErrors.email = t.errorEmail;
    } else if (farmerData.email.length > 100) {
      newErrors.email = t.errorEmailLength;
    }

    if (!farmerData.province.trim()) newErrors.province = t.errorRequired;
    if (!farmerData.district.trim()) newErrors.district = t.errorRequired;

    if (!farmerData.farmArea.trim()) {
      newErrors.farmArea = t.errorRequired;
    } else if (Number(farmerData.farmArea) < 0.1 || Number(farmerData.farmArea) > 100000) {
      newErrors.farmArea = t.errorFarmAreaRange;
    }

    if (!farmerData.adminCode.trim()) newErrors.adminCode = t.errorRequired;

    if (!farmerData.password) {
      newErrors.password = t.errorRequired;
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,128}$/.test(farmerData.password)) {
      newErrors.password = t.errorStrongPassword;
    }
    
    if (!farmerData.confirmPassword) {
      newErrors.confirmPassword = t.errorRequired;
    } else if (farmerData.password !== farmerData.confirmPassword) {
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
      const res = await axiosClient.post('/auth/register/farmer', {
        fullName: farmerData.fullName,
        phone: farmerData.phone,
        email: farmerData.email,
        province: farmerData.province,
        district: farmerData.district,
        farmArea: farmerData.farmArea,
        adminCode: farmerData.adminCode,
        password: farmerData.password,
        verificationChannel
      });
      navigate('/verify-phone-pending', {
        state: {
          phone: res.data.phone,
          channel: res.data.channel || 'whatsapp',
          pendingToken: res.data.pendingToken,
          devOtp: res.data.devOtp
        }
      });
    } catch (err) {
      setServerError(err.response?.data?.message || t.errorGeneric);
    } finally {
      setLoading(false);
    }
  };

  const districtOptions = districtsByProvince[farmerData.province] || [];

  return (
    <div className="app-container">
      <AuthHeader backTo="/" />

      <main className="registration-card" role="main" style={{ borderTop: '6px solid var(--primary-green)' }}>
        <div className="card-header">
          <h1 id="screen-title" className="card-title">{t.farmerTitle}</h1>
          <p id="screen-subtitle" className="card-subtitle">{t.farmerSubtitle}</p>
        </div>

        <form className="registration-form" onSubmit={handleSubmit} noValidate>
          {serverError && <div className="server-error" role="alert">{serverError}</div>}

          <div className="form-group">
            <span className="input-icon-left" aria-hidden="true"><User size={18} /></span>
            <input
              id="farmer-fullname-input" type="text" name="fullName" placeholder={t.placeholderName}
              className={`form-input ${errors.fullName ? 'has-error' : ''}`}
              value={farmerData.fullName} onChange={handleChange} required minLength="2" maxLength="50"
              ref={nameInputRef}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
              aria-required="true" aria-invalid={errors.fullName ? 'true' : 'false'}
            />
            {errors.fullName && <p className="error-message" role="alert">{errors.fullName}</p>}
            <UrduKeyboard
              value={farmerData.fullName}
              onChange={(v) => { setFarmerData((prev) => ({ ...prev, fullName: v })); if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: null })); }}
              show={isRtl && nameFocused}
            />
          </div>

          <div className="form-group">
            <span className="input-icon-left" aria-hidden="true"><Phone size={18} /></span>
            <input
              id="farmer-phone-input" type="tel" name="phone" placeholder={t.placeholderPhone}
              className={`form-input ${errors.phone ? 'has-error' : ''}`}
              value={farmerData.phone} onChange={handleChange} required maxLength="20"
              aria-required="true" aria-invalid={errors.phone ? 'true' : 'false'}
            />
            {errors.phone && <p className="error-message" role="alert">{errors.phone}</p>}
          </div>

          <div className="form-group">
            <span className="input-icon-left" aria-hidden="true"><Mail size={18} /></span>
            <input
              id="farmer-email-input" type="email" name="email" placeholder={t.placeholderEmail}
              className={`form-input ${errors.email ? 'has-error' : ''}`}
              value={farmerData.email} onChange={handleChange} required maxLength="100"
              aria-required="true" aria-invalid={errors.email ? 'true' : 'false'}
            />
            {errors.email && <p className="error-message" role="alert">{errors.email}</p>}
          </div>

          <div className="form-group">
            <span className="input-icon-left" aria-hidden="true"><MapPin size={18} /></span>
            <select
              id="farmer-province-select" name="province"
              className={`form-input ${errors.province ? 'has-error' : ''}`}
              value={farmerData.province} onChange={handleProvinceChange}
              style={{ appearance: 'none', WebkitAppearance: 'none' }}
              required aria-required="true" aria-invalid={errors.province ? 'true' : 'false'}
            >
              <option value="" disabled>{t.placeholderProvince}</option>
              {provinces.map((p) => (
                <option key={p} value={p}>{provinceLabels[p]}</option>
              ))}
            </select>
            <span className="input-icon-right" aria-hidden="true" style={{ pointerEvents: 'none' }}>
              <ChevronDown size={18} />
            </span>
            {errors.province && <p className="error-message" role="alert">{errors.province}</p>}
          </div>

          <div className="form-group">
            <span className="input-icon-left" aria-hidden="true"><MapPin size={18} /></span>
            <select
              id="farmer-district-select" name="district"
              className={`form-input ${errors.district ? 'has-error' : ''}`}
              value={farmerData.district} onChange={handleChange}
              style={{ appearance: 'none', WebkitAppearance: 'none' }}
              disabled={!farmerData.province}
              required aria-required="true" aria-invalid={errors.district ? 'true' : 'false'}
            >
              <option value="" disabled>{t.placeholderDistrict}</option>
              {districtOptions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <span className="input-icon-right" aria-hidden="true" style={{ pointerEvents: 'none' }}>
              <ChevronDown size={18} />
            </span>
            {errors.district && <p className="error-message" role="alert">{errors.district}</p>}
          </div>

          <div className="form-group">
            <span className="input-icon-left" aria-hidden="true"><Mountain size={18} /></span>
            <input
              id="farmer-area-input" type="number" name="farmArea" placeholder={t.placeholderArea}
              className={`form-input ${errors.farmArea ? 'has-error' : ''}`}
              value={farmerData.farmArea} onChange={handleChange} required min="0.1" max="100000" step="any"
              aria-required="true" aria-invalid={errors.farmArea ? 'true' : 'false'}
            />
            {errors.farmArea && <p className="error-message" role="alert">{errors.farmArea}</p>}
          </div>

          <div className="form-group">
            <span className="input-icon-left" aria-hidden="true"><KeyRound size={18} /></span>
            <input
              id="farmer-admincode-input" type="text" name="adminCode" placeholder={t.placeholderAdminCode}
              className={`form-input ${errors.adminCode ? 'has-error' : ''}`}
              value={farmerData.adminCode} onChange={handleChange} required
              aria-required="true" aria-invalid={errors.adminCode ? 'true' : 'false'}
            />
            {errors.adminCode && <p className="error-message" role="alert">{errors.adminCode}</p>}
            {!errors.adminCode && <p className="field-hint">{t.adminCodeHelp}</p>}
          </div>

          <div className="form-group">
            <span className="input-icon-left" aria-hidden="true"><Lock size={18} /></span>
            <input
              id="farmer-password-input" type={showPassword ? 'text' : 'password'} name="password" placeholder={t.placeholderPassword}
              className={`form-input ${errors.password ? 'has-error' : ''}`}
              value={farmerData.password} onChange={handleChange} required minLength="8" maxLength="128"
              aria-required="true" aria-invalid={errors.password ? 'true' : 'false'}
            />
            <button id="farmer-password-toggle" type="button" className="input-icon-right" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            {errors.password && <p className="error-message" role="alert">{errors.password}</p>}
          </div>

          <div className="form-group">
            <span className="input-icon-left" aria-hidden="true"><Lock size={18} /></span>
            <input
              id="farmer-confirm-input" type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" placeholder={t.placeholderConfirm}
              className={`form-input ${errors.confirmPassword ? 'has-error' : ''}`}
              value={farmerData.confirmPassword} onChange={handleChange} required minLength="8" maxLength="128"
              aria-required="true" aria-invalid={errors.confirmPassword ? 'true' : 'false'}
            />
            <button id="farmer-confirm-toggle" type="button" className="input-icon-right" onClick={() => setShowConfirmPassword(!showConfirmPassword)} aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            {errors.confirmPassword && <p className="error-message" role="alert">{errors.confirmPassword}</p>}
          </div>

          {/* Verification channel selector */}
          <div className="channel-selector-group">
            <p className="channel-selector-label">{t.verifyVia}</p>
            <div className="channel-selector">
              <button
                type="button"
                className={`channel-option ${verificationChannel === 'whatsapp' ? 'active' : ''}`}
                onClick={() => setVerificationChannel('whatsapp')}
              >
                <MessageCircle size={15} />
                {t.channelWhatsapp}
              </button>
              <button
                type="button"
                className={`channel-option ${verificationChannel === 'email' ? 'active' : ''}`}
                onClick={() => setVerificationChannel('email')}
              >
                <Mail size={15} />
                {t.channelEmail}
              </button>
            </div>
          </div>

          <button id="farmer-submit-btn" type="submit" className="submit-btn" disabled={loading}>
            <span>{loading ? t.registering : t.btnRegisterFarmer}</span>
            {!loading && <ArrowRight size={16} style={{ transform: isRtl ? 'scaleX(-1)' : 'none' }} />}
          </button>
        </form>

        <div className="divider">{t.or}</div>

        <div className="card-footer">
          <span>{t.footerText}</span>
          <Link id="farmer-login-link" to="/login" className="footer-link">
            {t.loginLink}
          </Link>
        </div>
      </main>
    </div>
  );
};

export default FarmerRegistration;
